import {
  createInfluencer,
  deleteInfluencer,
  findInfluencerById,
  listInfluencerSummary,
  listInfluencersForUser,
  updateInfluencer,
} from "../services/influencerService.js";
import { pointsToBrl } from "../utils/points.js";

const handleServiceError = (res, result) => {
  const status = result?.error?.status ?? (result?.error?.error?.includes("ja cadastrado") ? 409 : 400);
  return res.status(status).json({ error: result.error.error || result.error });
};

const ensureAccess = async (req, influencerId) => {
  const id = Number(influencerId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: { status: 400, message: "ID invalido." } };
  }

  const influencer = await findInfluencerById(id);
  if (!influencer) {
    return { error: { status: 404, message: "Influenciadora nao encontrada." } };
  }

  if (req.auth?.user?.role === "master") {
    return { influencer };
  }

  if (req.auth?.user?.role === "influencer") {
    if (influencer.userId === req.auth.user.id) {
      return { influencer };
    }
    return { error: { status: 403, message: "Acesso negado." } };
  }

  return { error: { status: 403, message: "Acesso negado." } };
};

export const create = async (req, res) => {
  const result = await createInfluencer(req.body || {});
  if (result.error) {
    return handleServiceError(res, result);
  }

  return res.status(201).json({
    ...result.influencer,
    login_email: result.loginEmail,
    senha_provisoria: result.provisionalPassword,
    codigo_assinatura: result.signatureCode,
  });
};

export const show = async (req, res) => {
  const { influencer, error } = await ensureAccess(req, req.params.id);
  if (error) {
    return res.status(error.status).json({ error: error.message });
  }
  return res.status(200).json(influencer);
};

export const update = async (req, res) => {
  const result = await updateInfluencer(req.params.id, req.body || {});
  if (result.error) {
    return handleServiceError(res, result);
  }
  return res.status(200).json(result.influencer);
};

export const destroy = async (req, res) => {
  const result = await deleteInfluencer(req.params.id);
  if (result.error) {
    return handleServiceError(res, result);
  }
  return res.status(200).json({ success: true });
};

export const index = async (req, res) => {
  const records = await listInfluencersForUser(req.auth?.user);
  return res.status(200).json(records);
};

export const summary = async (req, res) => {
  const records = await listInfluencerSummary();
  return res.status(200).json(
    records.map((row) => ({
      id: row.id,
      nome: row.name,
      instagram: row.instagram,
      cupom: row.coupon,
      commission_rate: row.commissionRate != null ? Number(row.commissionRate) : 0,
      vendas_count: Number(row.salesCount || 0),
      vendas_total_points: Number(row.salesPoints || 0),
      vendas_total: pointsToBrl(row.salesPoints || 0),
    })),
  );
};
