import {
  buildExtendedPlanResponse,
  createOrUpdatePlans,
  createOrUpdatePlansExtended,
  ensureMonthlyCycle,
  getCycleByIdOrCurrent,
  getInfluencerDashboardData,
  getInfluencerPlanData,
  getMasterDashboardData,
  listMonthlyCommissionsByInfluencer,
  listPendingPlanValidations,
  mapCycle,
  resolveInfluencerForRequest,
  updateSinglePlan,
  approvePlanValidation,
  rejectPlanValidation,
  findPlanDetailsWithInfluencer,
} from "../services/plannerService.js";
import { trimString } from "../utils/text.js";

export const getInfluencerPlan = async (req, res) => {
  const cycle = await getCycleByIdOrCurrent(req.query?.cycleId ?? req.query?.cycle_id);
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.query?.influencerId ?? req.query?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const data = await getInfluencerPlanData(cycle, influencer, { scriptLimit: 15 });
  return res.status(200).json(data);
};

export const postInfluencerPlan = async (req, res) => {
  const baseCycle = await ensureMonthlyCycle();
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.body?.influencerId ?? req.body?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const cycle = req.body?.cycleId ? await getCycleByIdOrCurrent(req.body.cycleId) : baseCycle;
  const result = await createOrUpdatePlans({ cycle, influencer, body: req.body });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
};

export const getInfluencerPlanExtended = async (req, res) => {
  const cycle = await getCycleByIdOrCurrent(req.query?.cycleId ?? req.query?.cycle_id);
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.query?.influencerId ?? req.query?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const payload = await buildExtendedPlanResponse(cycle, influencer, { scriptLimit: 50 });
  return res.status(200).json(payload);
};

export const postInfluencerPlanExtended = async (req, res) => {
  const baseCycle = await ensureMonthlyCycle();
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.body?.influencerId ?? req.body?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const cycle = req.body?.cycleId ? await getCycleByIdOrCurrent(req.body.cycleId) : baseCycle;
  const result = await createOrUpdatePlansExtended({ cycle, influencer, body: req.body });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
};

export const putInfluencerPlan = async (req, res) => {
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) {
    return res.status(400).json({ error: "ID invalido." });
  }

  const planDetails = await findPlanDetailsWithInfluencer(planId);
  if (!planDetails) {
    return res.status(404).json({ error: "Agendamento nao encontrado." });
  }

  const { influencer, status, message } = await resolveInfluencerForRequest(req, planDetails.influencer_id);
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const cycle = await getCycleByIdOrCurrent(planDetails.cycle_id);
  const notes = trimString(
    req.body?.notes ?? req.body?.observacao ?? req.body?.obs ?? req.body?.annotation ?? "",
  )
    || null;
  const result = await updateSinglePlan({
    planId,
    cycle,
    influencer,
    nextDate: req.body?.date ?? req.body?.scheduled_date ?? req.body?.scheduledDate,
    nextScriptId: req.body?.scriptId ?? req.body?.contentScriptId,
    notes,
  });

  if (result.error) {
    return res.status(result.error.status ?? 400).json({ error: result.error.message });
  }

  return res.status(200).json(result.plan);
};

export const getInfluencerDashboard = async (req, res) => {
  const cycle = await getCycleByIdOrCurrent(req.query?.cycleId ?? req.query?.cycle_id);
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.query?.influencerId ?? req.query?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const data = await getInfluencerDashboardData(cycle, influencer);
  return res.status(200).json(data);
};

export const getInfluencerHistory = async (req, res) => {
  const { influencer, status, message } = await resolveInfluencerForRequest(
    req,
    req.query?.influencerId ?? req.query?.influencer_id,
  );
  if (!influencer) {
    return res.status(status).json({ error: message });
  }

  const history = await listMonthlyCommissionsByInfluencer(influencer.id);
  return res
    .status(200)
    .json({ influencer: { id: influencer.id, nome: influencer.nome }, history });
};

export const getMasterValidations = async (req, res) => {
  const cycle = await getCycleByIdOrCurrent(req.query?.cycleId ?? req.query?.cycle_id);
  const pending = await listPendingPlanValidations(cycle.id);
  return res.status(200).json({ cycle: mapCycle(cycle), pending });
};

export const postMasterValidationApprove = async (req, res) => {
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) {
    return res.status(400).json({ error: "ID invalido." });
  }

  const result = await approvePlanValidation(planId);
  if (result.error) {
    return res.status(result.error.status ?? 400).json({ error: result.error.message });
  }

  return res.status(200).json(result.plan);
};

export const postMasterValidationReject = async (req, res) => {
  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) {
    return res.status(400).json({ error: "ID invalido." });
  }

  const result = await rejectPlanValidation(planId);
  if (result.error) {
    return res.status(result.error.status ?? 400).json({ error: result.error.message });
  }

  return res.status(200).json(result.plan);
};

export const getMasterDashboard = async (req, res) => {
  const cycle = await getCycleByIdOrCurrent(req.query?.cycleId ?? req.query?.cycle_id);
  const data = await getMasterDashboardData(cycle);
  return res.status(200).json(data);
};
