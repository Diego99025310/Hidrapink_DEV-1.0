import {
  TERMO_VERSAO_ATUAL,
  findLatestAcceptance,
  getInfluencerByUserId,
} from "../services/aceiteService.js";

const shouldRespondWithJson = (req) => {
  const accept = (req.headers?.accept || "").toLowerCase();
  const contentType = (req.headers?.["content-type"] || "").toLowerCase();
  if (req.xhr) return true;
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) return true;
  if (contentType.includes("application/json")) return true;
  if (!accept) return true;
  if (!accept.includes("text/html")) return true;
  return accept.includes("application/json");
};

const normalizeWaiver = (value) => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const stringValue = String(value).trim().toLowerCase();
  return ["1", "true", "sim", "yes"].includes(stringValue);
};

const verificarAceite = async (req, res, next) => {
  const user = req.auth?.user || req.user;
  if (!user || user.role !== "influencer") {
    return next();
  }

  try {
    const influencer = await getInfluencerByUserId(user.id);

    if (!influencer) {
      return next();
    }

    if (normalizeWaiver(influencer.contractSignatureWaived)) {
      return next();
    }

    const acceptance = await findLatestAcceptance(influencer.id, ["aceito"]);

    if (!acceptance || acceptance.version !== TERMO_VERSAO_ATUAL) {
      if (shouldRespondWithJson(req)) {
        return res
          .status(428)
          .json({ error: "Aceite do termo de parceria pendente.", redirect: "/aceite-termos" });
      }
      return res.redirect("/aceite-termos");
    }
  } catch (error) {
    return next(error);
  }

  return next();
};

export default verificarAceite;
