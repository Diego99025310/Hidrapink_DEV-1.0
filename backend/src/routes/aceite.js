import { Router } from "express";
import {
  TERMO_VERSAO_ATUAL,
  buildContractHash,
  buildContractHtml,
  buildDownloadHtml,
  createAcceptanceRecord,
  getAcceptanceById,
  getAcceptanceSummary,
  getInfluencerById,
  getInfluencerByUserId,
  normalizeUserAgent,
  resolveClientIp,
  validateCpfAndPhone,
} from "../services/aceiteService.js";
import { trimString } from "../utils/text.js";

const ensureInfluencerUser = async (req, res) => {
  const user = req.auth?.user || req.user;
  if (!user || user.role !== "influencer") {
    res.status(403).json({ error: "Fluxo disponivel apenas para influenciadoras." });
    return null;
  }

  const influencer = await getInfluencerByUserId(user.id);
  if (!influencer) {
    res.status(404).json({ error: "Influenciadora nao localizada." });
    return null;
  }
  return { user, influencer };
};

const normalizeBoolean = (value) => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "sim", "yes"].includes(normalized);
};

const buildSummaryResponse = (summary) => {
  if (!summary) {
    return {
      waived: false,
      accepted: false,
      status: "pendente",
      acceptanceId: null,
      version: TERMO_VERSAO_ATUAL,
      createdAt: null,
      hash: null,
      downloadUrl: null,
      ipAddress: null,
      userAgent: null,
    };
  }

  const downloadUrl = summary.acceptanceId
    ? `/api/aceite/${summary.acceptanceId}/download`
    : null;

  return {
    waived: summary.waived,
    accepted: summary.waived || summary.status === "aceito",
    status: summary.status,
    acceptanceId: summary.acceptanceId,
    version: summary.version || TERMO_VERSAO_ATUAL,
    createdAt: summary.createdAt ?? null,
    hash: summary.hash ?? null,
    downloadUrl,
    ipAddress: summary.ipAddress ?? null,
    userAgent: summary.userAgent ?? null,
  };
};

export default function buildAceiteRouter({ authenticate }) {
  const router = Router();

  router.get("/aceite/status", authenticate, async (req, res, next) => {
    try {
      const context = await ensureInfluencerUser(req, res);
      if (!context) return;

      const summary = await getAcceptanceSummary(context.influencer.id);
      return res.json(buildSummaryResponse(summary));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/aceite/resumo", authenticate, async (req, res, next) => {
    try {
      const context = await ensureInfluencerUser(req, res);
      if (!context) return;

      const summary = await getAcceptanceSummary(context.influencer.id);
      return res.json(buildSummaryResponse(summary));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/aceite/influenciadora/:id/resumo", authenticate, async (req, res, next) => {
    try {
      const user = req.auth?.user || req.user;
      if (!user || user.role !== "master") {
        return res.status(403).json({ error: "Acesso restrito ao usuario master." });
      }

      const influencerId = Number(req.params.id);
      if (!Number.isInteger(influencerId) || influencerId <= 0) {
        return res.status(400).json({ error: "Identificador invalido." });
      }

      const summary = await getAcceptanceSummary(influencerId);
      if (!summary) {
        return res.status(404).json({ error: "Influenciadora nao encontrada." });
      }

      return res.json(buildSummaryResponse(summary));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/aceite/termo", authenticate, async (req, res, next) => {
    try {
      const context = await ensureInfluencerUser(req, res);
      if (!context) return;

      const { influencer } = context;

      if (normalizeBoolean(influencer.contractSignatureWaived)) {
        return res.status(428).json({
          error: "Aceite dispensado pelo administrador.",
          waived: true,
          redirect: "/dashboard",
        });
      }

      const html = buildContractHtml(influencer);
      const hash = buildContractHash(html);

      return res.json({
        version: TERMO_VERSAO_ATUAL,
        html,
        hash,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/aceite/confirmar", authenticate, async (req, res, next) => {
    try {
      const context = await ensureInfluencerUser(req, res);
      if (!context) return;

      const { influencer } = context;
      if (normalizeBoolean(influencer.contractSignatureWaived)) {
        return res.status(400).json({
          error: "Aceite nao exigido para esta influenciadora.",
        });
      }

      const cpf = trimString(req.body?.cpf);
      const telefone = trimString(req.body?.telefone);

      if (!cpf || !telefone) {
        return res.status(400).json({ error: "CPF e telefone sao obrigatorios." });
      }

      if (!validateCpfAndPhone(influencer, cpf, telefone)) {
        return res.status(401).json({ error: "CPF ou telefone nao conferem com o cadastro." });
      }

      const documentHtml = buildContractHtml(influencer);
      const hashTermo = buildContractHash(documentHtml);
      const ipAddress = resolveClientIp(req);
      const userAgent = normalizeUserAgent(req.headers?.["user-agent"]);

      const acceptance = await createAcceptanceRecord({
        influencerId: influencer.id,
        status: "aceito",
        hashTermo,
        documentHtml,
        ipAddress,
        userAgent,
      });

      const summary = await getAcceptanceSummary(influencer.id);

      return res.json({
        message: "Aceite confirmado com sucesso.",
        redirect: "/dashboard",
        acceptanceId: acceptance.id,
        acceptance: buildSummaryResponse(summary),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/aceite/rejeitar", authenticate, async (req, res, next) => {
    try {
      const context = await ensureInfluencerUser(req, res);
      if (!context) return;

      const { influencer } = context;
      const documentHtml = buildContractHtml(influencer);
      const hashTermo = buildContractHash(documentHtml);
      const ipAddress = resolveClientIp(req);
      const userAgent = normalizeUserAgent(req.headers?.["user-agent"]);

      const acceptance = await createAcceptanceRecord({
        influencerId: influencer.id,
        status: "recusado",
        hashTermo,
        documentHtml,
        ipAddress,
        userAgent,
      });

      const summary = await getAcceptanceSummary(influencer.id);

      return res.json({
        message:
          "Recusa registrada. O acesso ao painel sera bloqueado ate que o termo vigente seja aceito.",
        acceptanceId: acceptance.id,
        acceptance: buildSummaryResponse(summary),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/aceite/:id/download", authenticate, async (req, res, next) => {
    try {
      const user = req.auth?.user || req.user;
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      const acceptanceId = Number(req.params.id);
      if (!Number.isInteger(acceptanceId)) {
        return res.status(400).json({ error: "Identificador invalido." });
      }

      const acceptance = await getAcceptanceById(acceptanceId);
      if (!acceptance) {
        return res.status(404).json({ error: "Registro de aceite nao encontrado." });
      }

      if (user.role !== "master") {
        const influencerContext = await getInfluencerByUserId(user.id);
        if (!influencerContext || influencerContext.id !== acceptance.influencerId) {
          return res.status(403).json({ error: "Acesso nao autorizado ao comprovante." });
        }
      }

      const influencer = await getInfluencerById(acceptance.influencerId);
      const html = buildDownloadHtml({ acceptance, influencer });
      if (!html) {
        return res.status(500).json({ error: "Nao foi possivel gerar o comprovante." });
      }

      const filenameBase = influencer?.instagram
        ? influencer.instagram.replace(/[^a-zA-Z0-9_-]/g, "")
        : `aceite-${acceptance.id}`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameBase || "aceite"}.html"`,
      );

      return res.send(html);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
