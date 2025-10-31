import {
  buildLegacyDescriptionFromSections,
  createScript,
  deleteScript,
  getScriptById,
  listScripts,
  parseScriptSections,
  updateScript,
} from "../services/scriptService.js";
import { trimString } from "../utils/text.js";

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 180;

export const index = async (req, res) => {
  try {
    const scripts = await listScripts();
    return res.status(200).json(scripts);
  } catch (error) {
    console.error("Erro ao listar roteiros:", error);
    return res.status(500).json({ error: "Nao foi possivel carregar os roteiros." });
  }
};

export const show = async (req, res) => {
  const scriptId = Number(req.params.id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return res.status(400).json({ error: "Identificador de roteiro invalido." });
  }

  try {
    const script = await getScriptById(scriptId);
    if (!script) {
      return res.status(404).json({ error: "Roteiro nao encontrado." });
    }
    return res.status(200).json(script);
  } catch (error) {
    console.error("Erro ao buscar roteiro:", error);
    return res.status(500).json({ error: "Nao foi possivel carregar o roteiro solicitado." });
  }
};

const parseRequestBody = (body) => {
  const rawTitle = trimString(body?.titulo ?? body?.title);
  if (!rawTitle || rawTitle.length < MIN_TITLE_LENGTH) {
    return { error: "Informe um titulo com pelo menos 3 caracteres." };
  }

  const { value: sections, error } = parseScriptSections(body);
  if (error) {
    return { error };
  }

  const titulo = rawTitle.slice(0, MAX_TITLE_LENGTH);
  const legacyDescription = buildLegacyDescriptionFromSections(sections);
  return { titulo, sections, legacyDescription };
};

export const create = async (req, res) => {
  const parsed = parseRequestBody(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const script = await createScript({
      title: parsed.titulo,
      sections: parsed.sections,
      legacyDescription: parsed.legacyDescription,
      createdById: req.auth?.user?.id || null,
    });
    return res.status(201).json(script);
  } catch (error) {
    console.error("Erro ao cadastrar roteiro:", error);
    return res.status(500).json({ error: "Nao foi possivel cadastrar o roteiro." });
  }
};

export const update = async (req, res) => {
  const scriptId = Number(req.params.id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return res.status(400).json({ error: "Identificador de roteiro invalido." });
  }

  const parsed = parseRequestBody(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const existing = await getScriptById(scriptId);
    if (!existing) {
      return res.status(404).json({ error: "Roteiro nao encontrado." });
    }

    const updated = await updateScript(scriptId, {
      title: parsed.titulo,
      sections: parsed.sections,
      legacyDescription: parsed.legacyDescription,
    });

    if (!updated) {
      return res.status(404).json({ error: "Roteiro nao encontrado." });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Erro ao atualizar roteiro:", error);
    return res.status(500).json({ error: "Nao foi possivel atualizar o roteiro." });
  }
};

export const destroy = async (req, res) => {
  const scriptId = Number(req.params.id);
  if (!Number.isInteger(scriptId) || scriptId <= 0) {
    return res.status(400).json({ error: "Identificador de roteiro invalido." });
  }

  try {
    const existing = await getScriptById(scriptId);
    if (!existing) {
      return res.status(404).json({ error: "Roteiro nao encontrado." });
    }

    const removed = await deleteScript(scriptId);
    if (!removed) {
      return res.status(404).json({ error: "Roteiro nao encontrado." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir roteiro:", error);
    return res.status(500).json({ error: "Nao foi possivel excluir o roteiro." });
  }
};
