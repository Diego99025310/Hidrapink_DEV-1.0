import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";
import { hashContent } from "../utils/hash.js";
import { normalizeDigits, trimString } from "../utils/text.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, "..", "..", "public", "termos", "parceria-v1.html");

export const TERMO_VERSAO_ATUAL = "1.0";

let templateCache = null;

const isTruthy = (value) => {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "sim", "yes", "y"].includes(normalized);
};

const loadTemplate = () => {
  if (templateCache) {
    return templateCache;
  }
  templateCache = fs.readFileSync(TEMPLATE_PATH, "utf8");
  return templateCache;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateLong = (date) => {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch (error) {
    return date.toLocaleString("pt-BR");
  }
};

const formatCommission = (commissionRate) => {
  if (commissionRate == null) {
    return null;
  }
  const numeric = Number(commissionRate);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const percent = (numeric * 100).toFixed(2);
  return `${percent.endsWith("00") ? percent.slice(0, -3) : percent}%`;
};

const buildInfluencerDataSection = (influencer) => {
  const items = [];

  const pushItem = (label, value) => {
    if (!value) return;
    items.push(`<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`);
  };

  pushItem("Nome", influencer.name);
  pushItem("Instagram", influencer.instagram);
  pushItem("CPF", influencer.cpf);
  pushItem("E-mail", influencer.email);
  pushItem("Telefone", influencer.contact);
  pushItem("Cupom", influencer.coupon);

  const commission = formatCommission(influencer.commissionRate);
  pushItem("Comissao", commission);

  const enderecoPartes = [
    influencer.logradouro,
    influencer.numero,
    influencer.complemento,
    influencer.bairro,
    influencer.cidade,
    influencer.estado,
    influencer.cep,
  ]
    .map((part) => (part ? part.trim() : ""))
    .filter(Boolean);
  if (enderecoPartes.length) {
    pushItem("Endereco", enderecoPartes.join(", "));
  } else {
    pushItem("CEP", influencer.cep);
    pushItem("Logradouro", influencer.logradouro);
    pushItem("Numero", influencer.numero);
    pushItem("Complemento", influencer.complemento);
    pushItem("Bairro", influencer.bairro);
    pushItem("Cidade", influencer.cidade);
    pushItem("Estado", influencer.estado);
  }

  if (influencer.createdAt) {
    pushItem("Cadastro na plataforma", formatDateLong(new Date(influencer.createdAt)));
  }

  if (!items.length) {
    return "";
  }

  return `
  <section style="margin-top:20px;padding:18px;border:1px solid #f1b4d8;background:#fff4fb;border-radius:12px;">
    <h3 style="margin-top:0;color:#e5007d;">Dados cadastrados da influenciadora</h3>
    <ul style="margin:12px 0 0 18px;font-size:14px;line-height:1.5;">
      ${items.join("\n      ")}
    </ul>
  </section>
  `;
};

export const buildContractHtml = (influencer) => {
  const template = loadTemplate();
  const now = new Date();
  const formattedDate = formatDateLong(now);
  const detailsSection = buildInfluencerDataSection(influencer);

  let html = template.replace("<!--INFLUENCER_DATA-->", detailsSection);
  html = html.replace('<span id="dataAtualizacao"></span>', escapeHtml(formattedDate));
  html = html.replace('<span id="dataAssinatura"></span>', escapeHtml(formattedDate));

  // remove script blocks to preserve deterministic HTML
  html = html.replace(/<script[\s\S]*?<\/script>\s*<\/body>/gi, "</body>");

  return html.trim();
};

export const buildContractHash = (html) => hashContent(html);

export const createAcceptanceRecord = async ({
  influencerId,
  status,
  hashTermo,
  documentHtml,
  ipAddress,
  userAgent,
  canal = "assinatura_simples",
}) =>
  prisma.$transaction(async (tx) => {
    const acceptance = await tx.aceiteTermo.create({
      data: {
        influencerId,
        status,
        version: TERMO_VERSAO_ATUAL,
        hashTermo,
        documentHtml,
        ipAddress,
        userAgent,
        canal,
      },
    });

    await tx.influencer.update({
      where: { id: influencerId },
      data: { lastAcceptanceId: acceptance.id },
    });

    return acceptance;
  });

export const findLatestAcceptance = async (influencerId, statuses = []) =>
  prisma.aceiteTermo.findFirst({
    where: {
      influencerId,
      ...(Array.isArray(statuses) && statuses.length
        ? { status: { in: statuses } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

export const getAcceptanceById = async (id) =>
  prisma.aceiteTermo.findUnique({
    where: { id },
  });

export const getInfluencerByUserId = async (userId) =>
  prisma.influencer.findFirst({
    where: { userId },
    select: {
      id: true,
      name: true,
      instagram: true,
      cpf: true,
      email: true,
      contact: true,
      coupon: true,
      commissionRate: true,
      cep: true,
      numero: true,
      complemento: true,
      logradouro: true,
      bairro: true,
      cidade: true,
      estado: true,
      contractSignatureWaived: true,
      createdAt: true,
    },
  });

export const getInfluencerById = async (id) =>
  prisma.influencer.findUnique({
    where: { id },
  });

export const getAcceptanceSummary = async (influencerId) => {
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: {
      id: true,
      contractSignatureWaived: true,
      lastAcceptanceId: true,
    },
  });

  if (!influencer) {
    return null;
  }

  if (isTruthy(influencer.contractSignatureWaived)) {
    return {
      waived: true,
      status: "dispensado",
      acceptanceId: null,
      version: TERMO_VERSAO_ATUAL,
      createdAt: null,
      hash: null,
      ipAddress: null,
      userAgent: null,
    };
  }

  let acceptance = null;
  if (influencer.lastAcceptanceId) {
    acceptance = await prisma.aceiteTermo.findUnique({
      where: { id: influencer.lastAcceptanceId },
    });
  }

  if (!acceptance) {
    acceptance = await prisma.aceiteTermo.findFirst({
      where: { influencerId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!acceptance) {
    return {
      waived: false,
      status: "pendente",
      acceptanceId: null,
      version: TERMO_VERSAO_ATUAL,
      createdAt: null,
      hash: null,
      ipAddress: null,
      userAgent: null,
    };
  }

  return {
    waived: false,
    status: acceptance.status || "pendente",
    acceptanceId: acceptance.id,
    version: acceptance.version || TERMO_VERSAO_ATUAL,
    createdAt: acceptance.createdAt,
    hash: acceptance.hashTermo,
    ipAddress: acceptance.ipAddress,
    userAgent: acceptance.userAgent,
  };
};

export const buildDownloadHtml = ({ acceptance, influencer }) => {
  if (!acceptance?.documentHtml) {
    return null;
  }

  const baseHtml = acceptance.documentHtml;
  const metadata = `
  <section style="margin-top:32px;padding:24px;border-top:3px solid #e5007d;background:linear-gradient(135deg,rgba(255,236,246,0.85),rgba(255,255,255,0.98));font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#333;">
    <h2 style="margin-top:0;text-transform:uppercase;letter-spacing:0.08em;font-size:1.1rem;color:#e5007d;">Registro de Assinatura Eletronica</h2>
    <p><strong>Status:</strong> ${escapeHtml(acceptance.status)}</p>
    <p><strong>Hash SHA-256:</strong> ${escapeHtml(acceptance.hashTermo)}</p>
    <p><strong>Versao do termo:</strong> ${escapeHtml(acceptance.version)}</p>
    <p><strong>Assinado em:</strong> ${formatDateLong(new Date(acceptance.createdAt))}</p>
    ${acceptance.ipAddress ? `<p><strong>IP:</strong> ${escapeHtml(acceptance.ipAddress)}</p>` : ""}
    ${acceptance.userAgent ? `<p><strong>User Agent:</strong> ${escapeHtml(acceptance.userAgent)}</p>` : ""}
    <p><strong>Influenciadora:</strong> ${escapeHtml(influencer?.name ?? "")}</p>
    ${influencer?.cpf ? `<p><strong>CPF:</strong> ${escapeHtml(influencer.cpf)}</p>` : ""}
    ${influencer?.contact ? `<p><strong>Telefone:</strong> ${escapeHtml(influencer.contact)}</p>` : ""}
  </section>
  `;

  if (baseHtml.includes("</body>")) {
    return baseHtml.replace("</body>", `${metadata}\n</body>`);
  }
  return `${baseHtml}\n${metadata}`;
};

export const validateCpfAndPhone = (influencer, cpf, telefone) => {
  const influencerCpfDigits = normalizeDigits(influencer?.cpf);
  const influencerPhoneDigits = normalizeDigits(influencer?.contact);
  const providedCpf = normalizeDigits(cpf);
  const providedPhone = normalizeDigits(telefone);

  if (!influencerCpfDigits || !influencerPhoneDigits) {
    return false;
  }

  return influencerCpfDigits === providedCpf && influencerPhoneDigits === providedPhone;
};

export const normalizeUserAgent = (value) => {
  const trimmed = trimString(value);
  if (!trimmed) return null;
  if (trimmed.length > 512) {
    return `${trimmed.slice(0, 512)}...`;
  }
  return trimmed;
};

export const resolveClientIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (Array.isArray(forwarded) && forwarded.length) {
    return forwarded[0];
  }
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip;
};
