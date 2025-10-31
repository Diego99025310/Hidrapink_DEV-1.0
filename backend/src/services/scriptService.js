import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { trimString } from "../utils/text.js";

const HTML_CONTENT_PATTERN =
  /<\s*(?:p|ul|ol|li|br|strong|em|b|i|u|a|blockquote|code|pre|h[1-6])\b[^>]*>/i;

const SCRIPT_SECTION_LIMITS = {
  duracao: 120,
  contexto: 6000,
  tarefa: 6000,
  pontos_importantes: 6000,
  finalizacao: 4000,
  notas_adicionais: 6000,
};

const SCRIPT_FIELD_DEFINITIONS = [
  {
    key: "duracao",
    label: "Duracao",
    aliases: ["duracao", "duration"],
    minLength: 1,
    maxLength: SCRIPT_SECTION_LIMITS.duracao,
    optional: false,
  },
  {
    key: "contexto",
    label: "Contexto",
    aliases: ["contexto", "context"],
    minLength: 10,
    maxLength: SCRIPT_SECTION_LIMITS.contexto,
    optional: false,
  },
  {
    key: "tarefa",
    label: "Tarefa",
    aliases: ["tarefa", "task"],
    minLength: 10,
    maxLength: SCRIPT_SECTION_LIMITS.tarefa,
    optional: false,
  },
  {
    key: "pontos_importantes",
    label: "Pontos importantes",
    aliases: ["pontos_importantes", "importantPoints", "important_points"],
    minLength: 10,
    maxLength: SCRIPT_SECTION_LIMITS.pontos_importantes,
    optional: false,
  },
  {
    key: "finalizacao",
    label: "Finalizacao",
    aliases: ["finalizacao", "finalization", "closing"],
    minLength: 5,
    maxLength: SCRIPT_SECTION_LIMITS.finalizacao,
    optional: false,
  },
  {
    key: "notas_adicionais",
    label: "Notas adicionais",
    aliases: ["notas_adicionais", "additionalNotes", "notes"],
    minLength: 0,
    maxLength: SCRIPT_SECTION_LIMITS.notas_adicionais,
    optional: true,
  },
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const convertPlainTextBlockToHtml = (block = "") => {
  if (!block) return "";
  const normalizedBlock = block.replace(/\r\n/g, "\n");
  const lines = normalizedBlock.split("\n");
  const trimmedLines = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  if (!trimmedLines.length) {
    return "";
  }

  const bulletPattern = /^\s*(?:[-*\u2022])\s+/;
  const numberedPattern = /^\s*\d{1,3}[.)-]\s+/;

  if (trimmedLines.every((line) => numberedPattern.test(line))) {
    const items = trimmedLines.map((line) => {
      const content = line.replace(numberedPattern, "").trim();
      return `<li>${escapeHtml(content)}</li>`;
    });
    return `<ol>${items.join("")}</ol>`;
  }

  if (trimmedLines.every((line) => bulletPattern.test(line))) {
    const items = trimmedLines.map((line) => {
      const content = line.replace(bulletPattern, "").trim();
      return `<li>${escapeHtml(content)}</li>`;
    });
    return `<ul>${items.join("")}</ul>`;
  }

  const paragraphLines = lines.map((line) => escapeHtml(line.trimEnd()));
  return `<p>${paragraphLines.join("<br />")}</p>`;
};

const convertPlainTextToHtml = (value = "") => {
  const trimmed = trimString(value) || "";
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  if (!blocks.length) {
    return `<p>${escapeHtml(normalized)}</p>`;
  }

  return blocks
    .map((block) => convertPlainTextBlockToHtml(block))
    .filter((html) => html && html.trim().length > 0)
    .join("");
};

const normalizeRichTextContent = (value = "") => {
  const trimmed = trimString(value) || "";
  if (!trimmed) {
    return "";
  }
  if (HTML_CONTENT_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return convertPlainTextToHtml(trimmed);
};

const normalizeScriptSection = (value = "", { maxLength = 6000 } = {}) => {
  const trimmed = trimString(value) || "";
  if (!trimmed) {
    return "";
  }
  const truncated = trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
  return normalizeRichTextContent(truncated);
};

const stripHtmlToPlainText = (value = "") => {
  if (!value) return "";
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const buildScriptPreview = (sections = [], maxLength = 200) => {
  const source = Array.isArray(sections) ? sections : [sections];
  const plainText = source
    .filter((section) => section)
    .map((section) => stripHtmlToPlainText(section))
    .filter((section) => section && section.trim().length > 0)
    .join(" ")
    .trim();

  if (!plainText) return "";
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return `${plainText.slice(0, maxLength - 1).trim()}.`;
};

export const buildLegacyDescriptionFromSections = ({
  duracao = "",
  contexto = "",
  tarefa = "",
  pontos_importantes = "",
  finalizacao = "",
  notas_adicionais = "",
} = {}) => {
  const sections = [
    { label: "Duracao", value: duracao },
    { label: "Contexto", value: contexto },
    { label: "Tarefa", value: tarefa },
    { label: "Pontos importantes", value: pontos_importantes },
    { label: "Finalizacao", value: finalizacao },
    { label: "Notas adicionais", value: notas_adicionais },
  ];

  const parts = sections
    .map(({ label, value }) => {
      const normalized = stripHtmlToPlainText(value || "");
      if (!normalized) return "";
      return `${label}: ${normalized}`;
    })
    .filter(Boolean);

  return parts.join("\n\n");
};

const pickScriptFieldValue = (body, aliases = []) => {
  if (!body) return "";
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(body, alias)) {
      const value = body[alias];
      return typeof value === "string" ? value.trim() : trimString(value);
    }
  }
  const fallbackAlias = aliases[0];
  if (fallbackAlias && body[fallbackAlias] != null) {
    const value = body[fallbackAlias];
    return typeof value === "string" ? value.trim() : trimString(value);
  }
  return "";
};

export const parseScriptSections = (body) => {
  const result = {};

  for (const field of SCRIPT_FIELD_DEFINITIONS) {
    const rawValue = pickScriptFieldValue(body, field.aliases);
    if (!rawValue) {
      if (field.optional) {
        result[field.key] = "";
        continue;
      }
      return {
        error: `Informe ${field.label.toLowerCase()} com pelo menos ${field.minLength} caracteres.`,
      };
    }
    if (rawValue.length < field.minLength) {
      return { error: `${field.label} deve conter pelo menos ${field.minLength} caracteres.` };
    }
    const limited = rawValue.length > field.maxLength ? rawValue.slice(0, field.maxLength) : rawValue;
    result[field.key] = normalizeScriptSection(limited, { maxLength: field.maxLength });
  }

  return { value: result };
};

export const normalizeScriptRow = (script) => {
  if (!script) return null;

  const normalized = {
    id: script.id,
    titulo: trimString(script.title) || "",
    duracao: normalizeRichTextContent(script.duration ?? ""),
    contexto: normalizeRichTextContent(script.context ?? ""),
    tarefa: normalizeRichTextContent(script.task ?? ""),
    pontos_importantes: normalizeRichTextContent(script.keyPoints ?? ""),
    finalizacao: normalizeRichTextContent(script.closing ?? ""),
    notas_adicionais: normalizeRichTextContent(script.notes ?? ""),
    created_at: script.createdAt ?? null,
    updated_at: script.updatedAt ?? null,
  };

  return {
    ...normalized,
    preview: buildScriptPreview([
      normalized.contexto,
      normalized.tarefa,
      normalized.pontos_importantes,
      normalized.finalizacao,
    ]),
  };
};

export const serializeScriptForExtendedResponse = (script) => {
  const normalized = normalizeScriptRow(script);
  if (!normalized) return null;
  return {
    id: normalized.id,
    title: normalized.titulo,
    duration: normalized.duracao,
    context: normalized.contexto,
    task: normalized.tarefa,
    importantPoints: normalized.pontos_importantes,
    closing: normalized.finalizacao,
    additionalNotes: normalized.notas_adicionais,
    preview: normalized.preview,
    createdAt: normalized.created_at,
    updatedAt: normalized.updated_at,
  };
};

const toDatabasePayload = (title, sections, legacyDescription, createdById) => ({
  title,
  duration: sections.duracao,
  context: sections.contexto,
  task: sections.tarefa,
  keyPoints: sections.pontos_importantes,
  closing: sections.finalizacao,
  notes: sections.notas_adicionais,
  description: legacyDescription || "",
  createdById: createdById ?? null,
});

export const listScripts = async () => {
  const scripts = await prisma.contentScript.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return scripts.map((row) => normalizeScriptRow(row)).filter(Boolean);
};

export const getScriptById = async (id) => {
  const scriptId = Number(id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return null;
  }
  const script = await prisma.contentScript.findUnique({
    where: { id: scriptId },
  });
  return normalizeScriptRow(script);
};

export const createScript = async ({ title, sections, legacyDescription, createdById }) => {
  const script = await prisma.contentScript.create({
    data: toDatabasePayload(title, sections, legacyDescription, createdById),
  });
  return normalizeScriptRow(script);
};

export const updateScript = async (id, { title, sections, legacyDescription }) => {
  const scriptId = Number(id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return null;
  }

  try {
    const script = await prisma.contentScript.update({
      where: { id: scriptId },
      data: {
        ...toDatabasePayload(title, sections, legacyDescription, undefined),
        updatedAt: new Date(),
      },
    });
    return normalizeScriptRow(script);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
};

export const deleteScript = async (id) => {
  const scriptId = Number(id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return false;
  }

  try {
    await prisma.contentScript.delete({ where: { id: scriptId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return false;
    }
    throw error;
  }
};

export { SCRIPT_SECTION_LIMITS };
