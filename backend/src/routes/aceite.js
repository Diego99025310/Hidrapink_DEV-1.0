import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";
import { gerarHashTermo } from "../utils/hash.js";
import { VERSAO_TERMO_ATUAL } from "../middlewares/verificarAceite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TERMO_PATH = path.resolve(__dirname, "..", "..", "public", "termos", "parceria-v1.html");

const MAX_USER_AGENT_LENGTH = 512;

const obterUsuarioAutenticado = (req) => req.auth?.user || req.user || null;
const limparCodigo = (codigo) => String(codigo || "").replace(/\D/g, "").slice(0, 6);

const obterIp = (req) => {
  const header = req.headers["x-forwarded-for"];
  if (Array.isArray(header)) {
    return header[0] || req.ip;
  }
  if (typeof header === "string" && header.trim()) {
    return header.split(",")[0].trim();
  }
  return req.ip;
};

const trimUserAgent = (value) => {
  if (!value) return "";
  const normalized = String(value).trim();
  if (normalized.length <= MAX_USER_AGENT_LENGTH) {
    return normalized;
  }
  return normalized.slice(0, MAX_USER_AGENT_LENGTH) + "...";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const maskCpf = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) {
    return value || "";
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const slugify = (value) => {
  const normalized = String(value || "contrato")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return normalized || "contrato";
};

const sanitizeFilename = (value) => {
  const fallback = "contrato-hidrapink.html";
  if (!value) return fallback;
  const cleaned = String(value)
    .replace(/[\r\n\t]/g, " ")
    .replace(/[^A-Za-z0-9._ -]/g, "")
    .trim();
  return cleaned || fallback;
};

const describeCanal = (canal) => {
  switch (canal) {
    case "codigo_assinatura":
      return "Codigo de assinatura informado pela influenciadora";
    case "token_email":
      return "Token enviado por e-mail";
    default:
      return canal ? canal.replace(/_/g, " ") : "Nao informado";
  }
};

const formatDateRepresentations = (value) => {
  if (!value) {
    return { raw: "", iso: "", br: "", utc: "" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const raw = String(value);
    return { raw, iso: raw, br: raw, utc: raw };
  }
  const iso = date.toISOString();
  let br = iso;
  try {
    br = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch (error) {
    br = date.toLocaleString("pt-BR", { hour12: false });
  }
  const utc = iso.replace("T", " ").replace("Z", " UTC");
  return { raw: String(value), iso, br, utc };
};

const SIGNATURE_STYLES = `
.hidrapink-assinatura {
  margin-top: 48px;
  padding: 28px 24px 36px;
  border-top: 3px solid #e5007d;
  background: linear-gradient(135deg, rgba(255, 236, 246, 0.85), rgba(255, 255, 255, 0.98));
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #333;
}
.hidrapink-assinatura h2 {
  margin-top: 0;
  color: #e5007d;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 1.1rem;
}
.hidrapink-assinatura p {
  margin: 0 0 16px 0;
  line-height: 1.6;
}
.hidrapink-assinatura dl {
  margin: 24px 0;
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.hidrapink-assinatura dt {
  font-weight: 700;
  font-size: 0.86rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #e5007d;
}
.hidrapink-assinatura dd {
  margin: 6px 0 0 0;
  font-size: 1.02rem;
  color: #333;
  word-break: break-word;
}
.hidrapink-assinatura code {
  font-family: 'Fira Code', 'SFMono-Regular', 'Roboto Mono', monospace;
  font-size: 0.92rem;
  background: rgba(229, 0, 125, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
  display: inline-block;
  word-break: break-all;
}
.hidrapink-assinatura .assinatura-ua {
  margin-top: 18px;
  background: rgba(229, 0, 125, 0.06);
  border-radius: 12px;
  padding: 16px;
}
.hidrapink-assinatura .assinatura-ua span {
  display: block;
  font-weight: 600;
  color: #e5007d;
  margin-bottom: 6px;
  text-transform: uppercase;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}
.hidrapink-assinatura .assinatura-ua pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Fira Code', 'SFMono-Regular', 'Roboto Mono', monospace;
  font-size: 0.9rem;
  color: #333;
}
.hidrapink-assinatura footer {
  margin-top: 24px;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.5;
}
`;

const loadContractTemplate = () => {
  try {
    return fs.readFileSync(TERMO_PATH, "utf8");
  } catch (cause) {
    const error = new Error("Nao foi possivel carregar o arquivo do termo de parceria.");
    error.cause = cause;
    throw error;
  }
};

const injectSignatureIntoTemplate = (template, signatureSection) => {
  let withStyles = template;
  if (template.includes("</head>")) {
    withStyles = template.replace("</head>", `<style>${SIGNATURE_STYLES}</style></head>`);
  } else {
    withStyles = `<style>${SIGNATURE_STYLES}</style>${template}`;
  }
  if (withStyles.includes("</body>")) {
    return withStyles.replace("</body>", `${signatureSection}</body>`);
  }
  return `${withStyles}${signatureSection}`;
};

const mapSignedContractRow = (row) => {
  if (!row) return null;
  return {
    acceptance: {
      id: row.aceite_id,
      userId: row.aceite_user_id,
      versao: row.aceite_versao,
      hash: row.aceite_hash,
      data: row.aceite_data,
      ip: row.aceite_ip,
      userAgent: row.aceite_user_agent,
      canal: row.aceite_canal,
      status: row.aceite_status,
    },
    influencer: {
      id: row.influencer_id,
      nome: row.influencer_nome,
      cpf: row.influencer_cpf,
      email: row.influencer_email,
      contato: row.influencer_contato,
      cupom: row.influencer_cupom,
      cidade: row.influencer_cidade,
      estado: row.influencer_estado,
      instagram: row.influencer_instagram,
      loginEmail: row.login_email,
      signatureCodeGeneratedAt: row.codigo_gerado_em,
    },
  };
};

const buildSignatureSection = (contract) => {
  const { acceptance, influencer } = contract;
  const acceptanceDates = formatDateRepresentations(acceptance.data);
  const signatureCodeDates = formatDateRepresentations(influencer.signatureCodeGeneratedAt);
  const nome = influencer.nome || "Influenciadora cadastrada";
  const cidadeUf = [influencer.cidade, influencer.estado].filter(Boolean).join(" / ");
  const canalDescricao = describeCanal(acceptance.canal);
  const userAgent = trimUserAgent(acceptance.userAgent);
  const codigoGeradoEm = signatureCodeDates.br
    ? `${signatureCodeDates.br} (${signatureCodeDates.utc})`
    : "Nao informado";

  return `
    <section class="hidrapink-assinatura">
      <h2>Registro de assinatura eletronica</h2>
      <p>
        Documento assinado eletronicamente por <strong>${escapeHtml(nome)}</strong>
        em <strong>${escapeHtml(acceptanceDates.br)}</strong> (horario de Brasilia).
      </p>
      <p>
        Registro numero <strong>${escapeHtml(String(acceptance.id || "-"))}</strong> - Versao do termo <strong>${escapeHtml(
    acceptance.versao
  )}</strong>.
      </p>
      <dl>
        <div>
          <dt>Nome completo</dt>
          <dd>${escapeHtml(influencer.nome || "-")}</dd>
        </div>
        <div>
          <dt>CPF</dt>
          <dd>${escapeHtml(maskCpf(influencer.cpf) || "-")}</dd>
        </div>
        <div>
          <dt>Email de acesso</dt>
          <dd>${escapeHtml(influencer.loginEmail || "-")}</dd>
        </div>
        <div>
          <dt>Email de contato</dt>
          <dd>${escapeHtml(influencer.email || "-")}</dd>
        </div>
        <div>
          <dt>Conta Instagram</dt>
          <dd>${escapeHtml(influencer.instagram || "-")}</dd>
        </div>
        <div>
          <dt>Cidade / UF</dt>
          <dd>${escapeHtml(cidadeUf || "-")}</dd>
        </div>
        <div>
          <dt>Canal de autenticacao</dt>
          <dd>${escapeHtml(canalDescricao)}</dd>
        </div>
        <div>
          <dt>Codigo de assinatura gerado em</dt>
          <dd>${escapeHtml(codigoGeradoEm)}</dd>
        </div>
        <div>
          <dt>Hash do termo</dt>
          <dd><code>${escapeHtml(acceptance.hash || "-")}</code></dd>
        </div>
      </dl>
      <div class="assinatura-ua">
        <span>User-Agent registrado:</span>
        <pre>${escapeHtml(userAgent || "-")}</pre>
      </div>
      <footer>
        Caso necessite validar judicialmente, apresente este documento juntamente com o hash registrado acima.
      </footer>
    </section>
  `;
};

const buildSignedContract = (row) => {
  const mapped = mapSignedContractRow(row);
  if (!mapped) return null;
  const template = loadContractTemplate();
  const signatureSection = buildSignatureSection(mapped);
  const html = injectSignatureIntoTemplate(template, signatureSection);

  const acceptanceDates = formatDateRepresentations(mapped.acceptance.data);
  const filenameDate = acceptanceDates.iso ? acceptanceDates.iso.replace(/[-:]/g, "").slice(0, 15) : "registro";
  const rawFilename = `Termo_HidraPink_${slugify(mapped.influencer.nome)}_${filenameDate}.html`;

  return {
    html,
    filename: sanitizeFilename(rawFilename),
    acceptance: mapped.acceptance,
    influencer: mapped.influencer,
    dates: {
      aceite: acceptanceDates,
      codigoGerado: formatDateRepresentations(mapped.influencer.signatureCodeGeneratedAt),
    },
  };
};

const buildContractPayload = (contract) => {
  if (!contract) return null;
  const { acceptance, influencer, dates, html, filename } = contract;
  return {
    available: true,
    versao: acceptance.versao,
    registroId: acceptance.id,
    dataAceite: acceptance.data,
    datasAceite: dates.aceite,
    hashTermo: acceptance.hash,
    ipUsuario: acceptance.ip,
    userAgent: trimUserAgent(acceptance.userAgent),
    canalAutenticacao: acceptance.canal,
    canalDescricao: describeCanal(acceptance.canal),
    status: acceptance.status,
    codigoAssinaturaGeradoEm: influencer.signatureCodeGeneratedAt,
    datasCodigoAssinatura: dates.codigoGerado,
    influencer: {
      id: influencer.id,
      nome: influencer.nome,
      cpf: influencer.cpf,
      emailContato: influencer.email,
      contato: influencer.contato,
      cupom: influencer.cupom,
      cidade: influencer.cidade,
      estado: influencer.estado,
      instagram: influencer.instagram,
      loginEmail: influencer.loginEmail,
    },
    html,
    filename,
  };
};

const sendContractDownload = (res, contract) => {
  const safeFilename = sanitizeFilename(contract.filename);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
  res.send(contract.html);
};

const normalizeWaiverValue = (value) => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "sim", "yes"].includes(normalized);
};

const isContractWaivedForUser = async (userId) => {
  if (!userId) {
    return false;
  }
  const influencer = await prisma.influencer.findFirst({
    where: { userId },
    select: { contractSignatureWaived: true },
  });
  return normalizeWaiverValue(influencer?.contractSignatureWaived);
};

const isContractWaivedForInfluencer = async (influencerId) => {
  if (!influencerId) {
    return false;
  }
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: { contractSignatureWaived: true },
  });
  return normalizeWaiverValue(influencer?.contractSignatureWaived);
};

const respondContractWaived = (res, scope = "master") => {
  const message =
    scope === "own"
      ? "A assinatura do contrato foi dispensada para sua conta."
      : "A assinatura do contrato foi dispensada para esta influenciadora.";
  return res.status(404).json({ error: message });
};

const getInfluencerSignature = async (userId) => {
  if (!userId) return null;
  return prisma.influencer.findFirst({
    where: { userId },
    select: {
      contractSignatureCodeHash: true,
      contractSignatureCodeGeneratedAt: true,
      contractSignatureWaived: true,
    },
  });
};

const getLatestAcceptance = async (userId) => {
  if (!userId) return null;
  return prisma.termAcceptance.findFirst({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });
};

const getSignedContractForUser = async ({ userId, influencerId }) => {
  if (!userId && !influencerId) {
    return null;
  }

  let influencer = null;
  if (influencerId) {
    influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!influencer) {
      return null;
    }
    userId = influencer.userId || influencer.user?.id || null;
  }

  if (!userId) {
    return null;
  }

  if (!influencer) {
    influencer = await prisma.influencer.findFirst({
      where: { userId },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  const acceptance = await getLatestAcceptance(userId);
  if (!acceptance || !influencer) {
    return null;
  }

  const row = {
    aceite_id: acceptance.id,
    aceite_user_id: acceptance.userId,
    aceite_versao: acceptance.termVersion,
    aceite_hash: acceptance.termHash,
    aceite_data: acceptance.acceptedAt,
    aceite_ip: acceptance.userIp,
    aceite_user_agent: acceptance.userAgent,
    aceite_canal: acceptance.authChannel,
    aceite_status: acceptance.status,
    influencer_id: influencer.id,
    influencer_nome: influencer.name,
    influencer_cpf: influencer.cpf,
    influencer_email: influencer.email,
    influencer_contato: influencer.contact,
    influencer_cupom: influencer.coupon,
    influencer_cidade: influencer.cidade,
    influencer_estado: influencer.estado,
    influencer_instagram: influencer.instagram,
    codigo_gerado_em: influencer.contractSignatureCodeGeneratedAt,
    login_email: influencer.user?.email || null,
  };

  return buildSignedContract(row);
};

const buildRouter = ({ authenticate }) => {
  const router = Router();

  router.post("/enviar-token", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "influencer") {
        return res.status(403).json({ error: "Somente influenciadoras precisam confirmar o aceite." });
      }

      const aceiteAtual = await getLatestAcceptance(user.id);
      if (aceiteAtual && aceiteAtual.termVersion === VERSAO_TERMO_ATUAL) {
        return res.status(200).json({ message: "Termo de parceria ja foi aceito." });
      }

      const assinatura = await getInfluencerSignature(user.id);
      if (!assinatura?.contractSignatureCodeHash) {
        return res.status(409).json({
          error: "Codigo de assinatura nao encontrado. Entre em contato com a equipe HidraPink.",
        });
      }

      return res.json({
        message: "Digite o codigo de assinatura informado pela equipe HidraPink para finalizar o aceite.",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/validar-token", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "influencer") {
        return res.status(403).json({ error: "Somente influenciadoras precisam confirmar o aceite." });
      }

      const codigo = limparCodigo(req.body?.codigo || req.body?.token);
      if (!codigo || codigo.length !== 6) {
        return res.status(400).json({ error: "Informe o codigo de assinatura com 6 digitos." });
      }

      const aceiteAtual = await getLatestAcceptance(user.id);
      if (aceiteAtual && aceiteAtual.termVersion === VERSAO_TERMO_ATUAL) {
        return res.status(200).json({ message: "Termo de parceria ja foi aceito." });
      }

      const assinatura = await getInfluencerSignature(user.id);
      if (!assinatura?.contractSignatureCodeHash) {
        return res.status(409).json({
          error: "Codigo de assinatura nao encontrado. Entre em contato com a equipe HidraPink.",
        });
      }

      const codigoValido = await bcrypt.compare(codigo, assinatura.contractSignatureCodeHash);
      if (!codigoValido) {
        return res.status(400).json({ error: "Codigo de assinatura invalido." });
      }

      const hashTermo = gerarHashTermo(TERMO_PATH);
      const dataAceite = new Date().toISOString();
      const ipUsuario = obterIp(req) || null;
      const userAgent = trimUserAgent(req.headers["user-agent"] || null);

      await prisma.termAcceptance.create({
        data: {
          userId: user.id,
          termVersion: VERSAO_TERMO_ATUAL,
          termHash: hashTermo,
          acceptedAt: dataAceite,
          userIp: ipUsuario,
          userAgent,
          authChannel: "codigo_assinatura",
          status: "aceito",
        },
      });

      return res.json({
        message: "Aceite registrado com sucesso.",
        redirect: "/influencer.html",
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/verificar-aceite", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "influencer") {
        return res.json({ aceito: true, versaoAtual: VERSAO_TERMO_ATUAL, role: user.role });
      }

      if (await isContractWaivedForUser(user.id)) {
        return res.json({ aceito: true, versaoAtual: VERSAO_TERMO_ATUAL, dispensado: true });
      }

      const aceite = await getLatestAcceptance(user.id);
      const aceito = Boolean(aceite && aceite.termVersion === VERSAO_TERMO_ATUAL);
      return res.json({ aceito, versaoAtual: VERSAO_TERMO_ATUAL });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/contrato-assinado", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "influencer") {
        return res.status(403).json({ error: "Recurso disponivel apenas para influenciadoras." });
      }

      if (await isContractWaivedForUser(user.id)) {
        return respondContractWaived(res, "own");
      }

      const contract = await getSignedContractForUser({ userId: user.id });
      if (!contract) {
        return res.status(404).json({ error: "Nenhum contrato assinado foi localizado." });
      }

      return res.json(buildContractPayload(contract));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/contrato-assinado/download", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "influencer") {
        return res.status(403).json({ error: "Recurso disponivel apenas para influenciadoras." });
      }

      if (await isContractWaivedForUser(user.id)) {
        return respondContractWaived(res, "own");
      }

      const contract = await getSignedContractForUser({ userId: user.id });
      if (!contract) {
        return res.status(404).json({ error: "Nenhum contrato assinado foi localizado." });
      }

      return sendContractDownload(res, contract);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/contrato-assinado/influenciadora/:id", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "master") {
        return res.status(403).json({ error: "Recurso disponivel apenas para o usuario master." });
      }

      const influencerId = Number(req.params.id);
      if (!Number.isInteger(influencerId) || influencerId <= 0) {
        return res.status(400).json({ error: "Identificador de influenciadora invalido." });
      }

      if (await isContractWaivedForInfluencer(influencerId)) {
        return respondContractWaived(res);
      }

      const contract = await getSignedContractForUser({ influencerId });
      if (!contract) {
        return res
          .status(404)
          .json({ error: "Nenhum contrato assinado foi localizado para esta influenciadora." });
      }

      return res.json(buildContractPayload(contract));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/contrato-assinado/influenciadora/:id/download", authenticate, async (req, res, next) => {
    try {
      const user = obterUsuarioAutenticado(req);
      if (!user) {
        return res.status(401).json({ error: "Usuario nao autenticado." });
      }

      if (user.role !== "master") {
        return res.status(403).json({ error: "Recurso disponivel apenas para o usuario master." });
      }

      const influencerId = Number(req.params.id);
      if (!Number.isInteger(influencerId) || influencerId <= 0) {
        return res.status(400).json({ error: "Identificador de influenciadora invalido." });
      }

      if (await isContractWaivedForInfluencer(influencerId)) {
        return respondContractWaived(res);
      }

      const contract = await getSignedContractForUser({ influencerId });
      if (!contract) {
        return res
          .status(404)
          .json({ error: "Nenhum contrato assinado foi localizado para esta influenciadora." });
      }

      return sendContractDownload(res, contract);
    } catch (error) {
      return next(error);
    }
  });

  return router;
};

export default buildRouter;
