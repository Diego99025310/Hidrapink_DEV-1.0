import {
  previewImport,
  confirmImport,
  createSale,
  updateSale,
  deleteSale,
  listSalesByInfluencer,
  getSalesSummary,
} from "../services/salesService.js";
import { resolveInfluencerForRequest } from "../services/plannerService.js";

const extractImportText = (body = {}) => body?.text ?? body?.data ?? body?.payload ?? "";

export const postImportPreview = async (req, res) => {
  try {
    const analysis = await previewImport(extractImportText(req.body));
    if (analysis.error) {
      return res.status(400).json({ error: analysis.error });
    }
    return res.status(200).json(analysis);
  } catch (error) {
    console.error("Erro ao analisar importacao de vendas:", error);
    return res.status(500).json({ error: "Nao foi possivel analisar as vendas para importacao." });
  }
};

export const postImportConfirm = async (req, res) => {
  try {
    const { error, result } = await confirmImport(extractImportText(req.body));
    if (error) {
      return res.status(error.status ?? 400).json(error.payload ?? { error: "Erro na importacao." });
    }
    return res.status(201).json(result);
  } catch (err) {
    console.error("Erro ao importar vendas:", err);
    return res.status(500).json({ error: "Nao foi possivel concluir a importacao." });
  }
};

export const postSale = async (req, res) => {
  try {
    const { error, sale } = await createSale(req.body);
    if (error) {
      return res.status(error.status ?? 400).json(error.payload ?? { error: "Erro ao cadastrar venda." });
    }
    return res.status(201).json(sale);
  } catch (err) {
    console.error("Erro ao cadastrar venda:", err);
    return res.status(500).json({ error: "Nao foi possivel cadastrar a venda." });
  }
};

export const putSale = async (req, res) => {
  try {
    const { error, sale } = await updateSale(req.params.id, req.body);
    if (error) {
      return res.status(error.status ?? 400).json(error.payload ?? { error: "Erro ao atualizar venda." });
    }
    return res.status(200).json(sale);
  } catch (err) {
    console.error("Erro ao atualizar venda:", err);
    return res.status(500).json({ error: "Nao foi possivel atualizar a venda." });
  }
};

export const destroySale = async (req, res) => {
  try {
    const { error, result } = await deleteSale(req.params.id);
    if (error) {
      return res.status(error.status ?? 400).json(error.payload ?? { error: "Erro ao remover venda." });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("Erro ao remover venda:", err);
    return res.status(500).json({ error: "Nao foi possivel remover a venda." });
  }
};

export const getSalesSummaryController = async (req, res) => {
  const { influencer, status, message } = await resolveInfluencerForRequest(req, req.params.influencerId);
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  try {
    const summary = await getSalesSummary(influencer);
    return res.status(200).json(summary);
  } catch (err) {
    console.error("Erro ao obter resumo de vendas:", err);
    return res.status(500).json({ error: "Nao foi possivel obter o resumo de vendas." });
  }
};

export const getSalesByInfluencerController = async (req, res) => {
  const { influencer, status, message } = await resolveInfluencerForRequest(req, req.params.influencerId);
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  try {
    const sales = await listSalesByInfluencer(influencer);
    return res.status(200).json(sales);
  } catch (err) {
    console.error("Erro ao listar vendas:", err);
    return res.status(500).json({ error: "Nao foi possivel listar as vendas." });
  }
};
