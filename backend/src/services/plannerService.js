import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { trimString } from "../utils/text.js";
import { summarizePoints } from "../utils/multiplier.js";
import { pointsToBrl, POINT_VALUE_BRL } from "../utils/points.js";
import {
  normalizeScriptRow,
  serializeScriptForExtendedResponse,
} from "./scriptService.js";
import { findInfluencerById, findInfluencerByUserId } from "./influencerService.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value) => typeof value === "string" && DATE_REGEX.test(value.trim());

const toDateOnlyString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const toDateTimeString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Prisma.Decimal) return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapCycleToLegacyRow = (cycle) => {
  if (!cycle) return null;
  return {
    id: cycle.id,
    cycle_year: cycle.cycleYear ?? cycle.cycle_year ?? null,
    cycle_month: cycle.cycleMonth ?? cycle.cycle_month ?? null,
    status: cycle.status ?? "open",
    started_at: toDateTimeString(cycle.startedAt ?? cycle.started_at),
    closed_at: toDateTimeString(cycle.closedAt ?? cycle.closed_at),
    created_at: toDateTimeString(cycle.createdAt ?? cycle.created_at),
    updated_at: toDateTimeString(cycle.updatedAt ?? cycle.updated_at),
  };
};

const mapInfluencerToLegacyRow = (influencer) => {
  if (!influencer) return null;
  return {
    id: influencer.id,
    nome: influencer.name ?? influencer.nome ?? "",
    instagram: influencer.instagram ?? null,
    cpf: influencer.cpf ?? null,
    email: influencer.email ?? null,
    contato: influencer.contact ?? null,
    cupom: influencer.coupon ?? null,
    vendas_quantidade: influencer.salesQuantity ?? 0,
    vendas_valor: toNumber(influencer.salesValue ?? influencer.vendas_valor),
    commission_rate: influencer.commissionRate != null ? Number(influencer.commissionRate) : 0,
    contract_signature_code_hash: influencer.contractSignatureCodeHash ?? null,
    contract_signature_code_generated_at: toDateTimeString(
      influencer.contractSignatureCodeGeneratedAt ?? null,
    ),
    contract_signature_waived: influencer.contractSignatureWaived ? 1 : 0,
    user_id: influencer.userId ?? influencer.user_id ?? null,
    created_at: toDateTimeString(influencer.createdAt ?? influencer.created_at),
  };
};

const mapPlanRow = (plan) => {
  if (!plan) return null;
  const script = plan.contentScript ?? null;
  return {
    id: plan.id,
    cycle_id: plan.cycleId ?? plan.cycle_id,
    influencer_id: plan.influencerId ?? plan.influencer_id,
    scheduled_date: toDateOnlyString(plan.scheduledDate ?? plan.scheduled_date),
    content_script_id: plan.contentScriptId ?? plan.content_script_id ?? null,
    notes: plan.notes ?? null,
    status: plan.status ?? null,
    created_at: toDateTimeString(plan.createdAt ?? plan.created_at),
    updated_at: toDateTimeString(plan.updatedAt ?? plan.updated_at),
    script_title: script?.title ?? plan.script_title ?? null,
    script_duration: script?.duration ?? plan.script_duration ?? null,
    script_context: script?.context ?? plan.script_context ?? null,
    script_task: script?.task ?? plan.script_task ?? null,
    script_important_points: script?.keyPoints ?? plan.script_important_points ?? null,
    script_closing: script?.closing ?? plan.script_closing ?? null,
    script_additional_notes: script?.notes ?? plan.script_additional_notes ?? null,
    script_created_at: toDateTimeString(script?.createdAt ?? plan.script_created_at),
    script_updated_at: toDateTimeString(script?.updatedAt ?? plan.script_updated_at),
  };
};

const mapPlanForCycleRow = (plan) => {
  if (!plan) return null;
  return {
    id: plan.id,
    cycle_id: plan.cycleId,
    influencer_id: plan.influencerId,
    scheduled_date: toDateOnlyString(plan.scheduledDate),
    status: plan.status,
    content_script_id: plan.contentScriptId ?? null,
    influencer_name: plan.influencer?.name ?? null,
    instagram: plan.influencer?.instagram ?? null,
    script_title: plan.contentScript?.title ?? null,
  };
};

const mapPendingValidationRow = (plan) => {
  if (!plan) return null;
  return {
    id: plan.id,
    cycle_id: plan.cycleId,
    influencer_id: plan.influencerId,
    scheduled_date: toDateOnlyString(plan.scheduledDate),
    status: plan.status,
    influencer_name: plan.influencer?.name ?? null,
    instagram: plan.influencer?.instagram ?? null,
    script_title: plan.contentScript?.title ?? null,
  };
};

const mapMonthlyCommissionRow = (commission) => {
  if (!commission) return null;
  return {
    id: commission.id,
    cycle_id: commission.cycleId,
    validated_days: commission.validatedDays,
    multiplier: Number(commission.multiplier ?? 0),
    base_commission: toNumber(commission.baseCommission),
    total_commission: toNumber(commission.totalCommission),
    base_points: commission.basePoints ?? 0,
    total_points: commission.totalPoints ?? 0,
    deliveries_planned: commission.deliveriesPlanned ?? 0,
    deliveries_completed: commission.deliveriesCompleted ?? 0,
    validation_summary: commission.validationSummary ?? null,
    closed_at: toDateTimeString(commission.closedAt),
    created_at: toDateTimeString(commission.createdAt),
  };
};

const mapInfluencerSummaryRow = (influencer) => ({
  id: influencer.id,
  nome: influencer.name ?? "",
  instagram: influencer.instagram ?? null,
  planned: influencer.planned ?? 0,
  validated: influencer.validated ?? 0,
});

const getCurrentCycleParts = (referenceDate = new Date()) => {
  const date = referenceDate instanceof Date ? referenceDate : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return { year, month };
};

const formatCycleMonthStart = (year, month) => {
  const normalizedMonth = String(month).padStart(2, "0");
  return `${year}-${normalizedMonth}-01T00:00:00.000Z`;
};

const computeCycleEndDate = (cycle) => {
  if (!cycle) return null;
  const year = Number(cycle.cycleYear ?? cycle.cycle_year);
  const month = Number(cycle.cycleMonth ?? cycle.cycle_month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  const nextMonthDate = new Date(Date.UTC(year, month, 0));
  const day = String(nextMonthDate.getUTCDate()).padStart(2, "0");
  const normalizedMonth = String(month).padStart(2, "0");
  return `${year}-${normalizedMonth}-${day}`;
};

export const ensureMonthlyCycle = async () => {
  const { year, month } = getCurrentCycleParts();

  return prisma.$transaction(async (tx) => {
    let cycle = await tx.monthlyCycle.findFirst({
      where: { cycleYear: year, cycleMonth: month },
    });

    const openCycles = await tx.monthlyCycle.findMany({
      where: { status: "open" },
    });

    for (const open of openCycles) {
      if (open.cycleYear === year && open.cycleMonth === month) {
        cycle = open;
        continue;
      }

      await tx.monthlyCycle.update({
        where: { id: open.id },
        data: {
          status: "closed",
          closedAt: open.closedAt ?? new Date(),
          updatedAt: new Date(),
        },
      });
    }

    if (!cycle) {
      cycle = await tx.monthlyCycle.create({
        data: {
          cycleYear: year,
          cycleMonth: month,
          status: "open",
          startedAt: new Date(formatCycleMonthStart(year, month)),
        },
      });
    } else if (cycle.status !== "open") {
      cycle = await tx.monthlyCycle.update({
        where: { id: cycle.id },
        data: { status: "open", closedAt: null, updatedAt: new Date() },
      });
    }

    return cycle;
  });
};

export const getCycleByIdOrCurrent = async (cycleId) => {
  if (cycleId != null) {
    const id = Number(cycleId);
    if (Number.isInteger(id) && id > 0) {
      const cycle = await prisma.monthlyCycle.findUnique({ where: { id } });
      if (cycle) {
        return cycle;
      }
    }
  }
  return ensureMonthlyCycle();
};

const touchCycle = async (cycleId, tx = prisma) => {
  await tx.monthlyCycle.update({
    where: { id: cycleId },
    data: { updatedAt: new Date() },
  });
};

const listPlansByInfluencerRows = async (cycleId, influencerId, tx = prisma) => {
  const plans = await tx.influencerPlan.findMany({
    where: { cycleId, influencerId },
    include: { contentScript: true },
    orderBy: [{ scheduledDate: "asc" }, { id: "asc" }],
  });
  return plans.map((plan) => mapPlanRow(plan));
};

const listPlansForCycleRows = async (cycleId) => {
  const plans = await prisma.influencerPlan.findMany({
    where: { cycleId },
    include: {
      influencer: { select: { name: true, instagram: true } },
      contentScript: { select: { title: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { influencer: { name: "asc" } }],
  });
  return plans.map((plan) => mapPlanForCycleRow(plan));
};

const listPendingPlanValidationsRows = async (cycleId) => {
  const plans = await prisma.influencerPlan.findMany({
    where: { cycleId, status: "scheduled" },
    include: {
      influencer: { select: { name: true, instagram: true } },
      contentScript: { select: { title: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { influencer: { name: "asc" } }],
  });
  return plans.map((plan) => mapPendingValidationRow(plan));
};

const mapPlanWithInfluencerRow = (plan) => {
  if (!plan) return null;
  return {
    id: plan.id,
    cycle_id: plan.cycleId,
    influencer_id: plan.influencerId,
    scheduled_date: toDateOnlyString(plan.scheduledDate),
    status: plan.status,
    content_script_id: plan.contentScriptId ?? null,
    notes: plan.notes ?? null,
    created_at: toDateTimeString(plan.createdAt),
    updated_at: toDateTimeString(plan.updatedAt),
    influencer_name: plan.influencer?.name ?? null,
    instagram: plan.influencer?.instagram ?? null,
    script_title: plan.contentScript?.title ?? null,
  };
};

const findPlanWithInfluencer = async (planId) => {
  const plan = await prisma.influencerPlan.findUnique({
    where: { id: planId },
    include: {
      influencer: { select: { name: true, instagram: true } },
      contentScript: { select: { title: true } },
    },
  });
  return mapPlanWithInfluencerRow(plan);
};

const listMonthlyCommissionsByInfluencerRows = async (influencerId) => {
  const commissions = await prisma.monthlyCommission.findMany({
    where: { influencerId },
    orderBy: [{ cycleId: "desc" }, { id: "desc" }],
  });
  return commissions.map((commission) => mapMonthlyCommissionRow(commission));
};

const serializePlanForExtendedResponse = (plan) => {
  if (!plan) return null;
  const scriptPayload =
    plan.content_script_id != null
      ? serializeScriptForExtendedResponse({
          id: plan.content_script_id,
          title: plan.script_title,
          duration: plan.script_duration,
          context: plan.script_context,
          task: plan.script_task,
          keyPoints: plan.script_important_points,
          closing: plan.script_closing,
          notes: plan.script_additional_notes,
          createdAt: plan.script_created_at,
          updatedAt: plan.script_updated_at,
        })
      : null;

  return {
    id: plan.id,
    cycleId: plan.cycle_id,
    influencerId: plan.influencer_id,
    date: plan.scheduled_date,
    status: plan.status,
    notes: plan.notes,
    scriptId: plan.content_script_id,
    scriptTitle: plan.script_title,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    canEdit: plan.status === "scheduled" || plan.status === "posted",
    script: scriptPayload,
  };
};

const buildCycleSummary = (cycle) => {
  if (!cycle) return null;
  const year = Number(cycle.cycleYear ?? cycle.cycle_year ?? new Date().getFullYear());
  const month = Number(cycle.cycleMonth ?? cycle.cycle_month ?? new Date().getMonth() + 1);
  const monthLabel = String(month).padStart(2, "0");
  const startDateSource = cycle.startDate ?? cycle.started_at ?? cycle.startedAt ?? formatCycleMonthStart(year, month);
  const startDate =
    typeof startDateSource === "string"
      ? startDateSource.slice(0, 10)
      : toDateOnlyString(startDateSource) ?? formatCycleMonthStart(year, month).slice(0, 10);
  const endDate = computeCycleEndDate({ ...cycle, cycleYear: year, cycleMonth: month }) || startDate;

  return {
    id: cycle.id ?? null,
    year,
    month,
    status: cycle.status ?? "open",
    label: `${monthLabel}/${year}`,
    startDate,
    endDate,
  };
};

const collectInfluencerPlanData = async (cycle, influencer, { scriptLimit = 15 } = {}) => {
  const scripts = await prisma.contentScript.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: scriptLimit,
  });
  const plans = await listPlansByInfluencerRows(cycle.id, influencer.id);
  const normalizedScripts = scripts.map((script) => normalizeScriptRow(script)).filter(Boolean);

  return {
    cycle: mapCycleToLegacyRow(cycle),
    influencer: mapInfluencerToLegacyRow(influencer),
    scripts: normalizedScripts,
    plans,
  };
};

export const buildExtendedPlanResponse = async (cycle, influencer, options = {}) => {
  const data = await collectInfluencerPlanData(cycle, influencer, options);
  const extendedPlans = data.plans.map((plan) => serializePlanForExtendedResponse(plan)).filter(Boolean);
  const extendedScripts = data.scripts
    .map((script) => serializeScriptForExtendedResponse(script))
    .filter(Boolean);

  return {
    cycle: buildCycleSummary(cycle),
    influencer: {
      id: influencer.id,
      name: influencer.name ?? influencer.nome ?? "",
    },
    scripts: extendedScripts,
    plans: extendedPlans,
  };
};

const resolveInfluencerForRequestInternal = async (req, influencerId) => {
  const role = req.auth?.user?.role;
  if (role === "master") {
    if (influencerId == null) {
      return { status: 400, message: "Informe o ID da influenciadora." };
    }
    const influencer = await findInfluencerById(influencerId);
    if (!influencer) {
      return { status: 404, message: "Influenciadora nao encontrada." };
    }
    return { influencer: mapInfluencerToLegacyRow(influencer) };
  }

  if (role === "influencer") {
    const influencer = await findInfluencerByUserId(req.auth?.user?.id);
    if (!influencer) {
      return { status: 404, message: "Cadastro da influenciadora nao encontrado." };
    }
    return { influencer: mapInfluencerToLegacyRow(influencer) };
  }

  return { status: 403, message: "Acesso negado." };
};

const parseBooleanFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ["1", "true", "yes", "y", "on", "add", "append", "novo", "nova", "create"].includes(normalized);
  }
  return false;
};

const fetchExistingPlansMap = async (cycleId, influencerId, tx) => {
  const plans = await tx.influencerPlan.findMany({
    where: { cycleId, influencerId },
  });

  const map = new Map();
  const byScript = new Map();

  plans.forEach((plan) => {
    map.set(plan.id, plan);
    const scriptKey = plan.contentScriptId ?? null;
    if (!byScript.has(scriptKey)) {
      byScript.set(scriptKey, []);
    }
    byScript.get(scriptKey).push(plan);
  });

  byScript.forEach((list, key) => {
    list.sort((a, b) => {
      const aTime = a.updatedAt?.getTime?.() ?? 0;
      const bTime = b.updatedAt?.getTime?.() ?? 0;
      if (aTime === bTime) {
        return b.id - a.id;
      }
      return bTime - aTime;
    });
  });

  return { map, byScript };
};

const removePlansByScript = (byScript, scriptId, removedIds = []) => {
  if (!byScript.has(scriptId)) {
    return;
  }
  const remaining = byScript.get(scriptId).filter((plan) => !removedIds.includes(plan.id));
  if (remaining.length) {
    byScript.set(scriptId, remaining);
  } else {
    byScript.delete(scriptId);
  }
};

const normalizePlanEntriesPayload = async (body, cycle, influencerId) => {
  if (!cycle) {
    return { error: "Ciclo mensal nao encontrado." };
  }

  const candidateArrays = [
    body?.entries,
    body?.schedules,
    body?.agendamentos,
    body?.days,
    body?.dates,
  ];

  const removalSources = [
    body?.removedScripts,
    body?.removedScriptIds,
    body?.removed_ids,
    body?.removed,
    body?.removals,
  ];
  const removedScriptsSet = new Set();
  removalSources.forEach((source) => {
    if (Array.isArray(source)) {
      source.forEach((value) => {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
          removedScriptsSet.add(parsed);
        }
      });
    } else if (source != null && source !== "") {
      const parsed = Number(source);
      if (Number.isInteger(parsed) && parsed > 0) {
        removedScriptsSet.add(parsed);
      }
    }
  });

  const removedPlanSources = [
    body?.removedPlans,
    body?.removedPlanIds,
    body?.removedOccurrences,
    body?.removed_occurrences,
  ];
  const removedPlanIdsSet = new Set();
  removedPlanSources.forEach((source) => {
    if (Array.isArray(source)) {
      source.forEach((value) => {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) {
          removedPlanIdsSet.add(parsed);
        }
      });
    } else if (source != null && source !== "") {
      const parsed = Number(source);
      if (Number.isInteger(parsed) && parsed > 0) {
        removedPlanIdsSet.add(parsed);
      }
    }
  });

  const candidates = candidateArrays.find((value) => Array.isArray(value)) || [];

  if (!candidates.length && removedScriptsSet.size === 0 && removedPlanIdsSet.size === 0) {
    return { error: "Informe ao menos um dia para agendar." };
  }

  const cycleYear = Number(cycle.cycleYear ?? cycle.cycle_year);
  const cycleMonth = String(cycle.cycleMonth ?? cycle.cycle_month).padStart(2, "0");
  const expectedPrefix = `${cycleYear}-${cycleMonth}-`;

  const result = [];
  const seenPairs = new Set();
  const seenPlanIds = new Set();

  const existingPlansData = await fetchExistingPlansMap(cycle.id, influencerId, prisma);
  const scriptCache = new Map();

  const getScriptById = async (id) => {
    if (scriptCache.has(id)) {
      return scriptCache.get(id);
    }
    const script = await prisma.contentScript.findUnique({ where: { id } });
    scriptCache.set(id, script ?? null);
    return script;
  };

  for (const rawEntry of candidates) {
    let dateValue = null;
    let scriptId = null;
    let notes = null;
    let planId = null;
    let append = false;

    if (typeof rawEntry === "string") {
      dateValue = rawEntry;
    } else if (rawEntry && typeof rawEntry === "object") {
      dateValue =
        rawEntry.date ?? rawEntry.day ?? rawEntry.scheduled_date ?? rawEntry.scheduledDate ?? rawEntry.data;
      scriptId =
        rawEntry.scriptId ??
        rawEntry.contentScriptId ??
        rawEntry.content_script_id ??
        rawEntry.roteiro_id ??
        rawEntry.roteiroId ??
        rawEntry.script?.id ??
        rawEntry.roteiro?.id ??
        null;
      notes = trimString(rawEntry.notes ?? rawEntry.observacao ?? rawEntry.obs ?? rawEntry.annotation ?? "") || null;
      planId = rawEntry.id ?? rawEntry.planId ?? rawEntry.plan_id ?? null;
      append =
        parseBooleanFlag(rawEntry.append ?? rawEntry.add ?? rawEntry.create ?? rawEntry.novo) ||
        parseBooleanFlag(rawEntry.action ?? rawEntry.acao);
    }

    if (typeof dateValue !== "string" || !isValidDate(dateValue)) {
      continue;
    }

    const normalizedDate = dateValue.trim();
    if (!normalizedDate.startsWith(expectedPrefix)) {
      continue;
    }

    let numericPlanId = null;
    if (planId != null && planId !== "") {
      const parsedPlan = Number(planId);
      if (Number.isInteger(parsedPlan) && parsedPlan > 0) {
        numericPlanId = parsedPlan;
        if (seenPlanIds.has(numericPlanId)) {
          continue;
        }
        seenPlanIds.add(numericPlanId);
      }
    }

    let contentScriptId = null;
    if (scriptId != null && scriptId !== "") {
      const parsed = Number(scriptId);
      if (Number.isInteger(parsed) && parsed > 0) {
        const script = await getScriptById(parsed);
        if (script) {
          contentScriptId = parsed;
        }
      }
    }

    if (!contentScriptId && numericPlanId) {
      const existing = existingPlansData.map.get(numericPlanId);
      if (existing?.contentScriptId) {
        contentScriptId = existing.contentScriptId;
      }
    }

    const pairKey = `${contentScriptId ?? "null"}|${normalizedDate}`;
    if (!numericPlanId && seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    result.push({
      id: numericPlanId,
      scheduled_date: normalizedDate,
      content_script_id: contentScriptId,
      notes,
      append: Boolean(append),
    });
  }

  if (!result.length && removedScriptsSet.size === 0 && removedPlanIdsSet.size === 0) {
    return { error: "Nao foi possivel identificar dias validos para o agendamento." };
  }

  result.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return {
    entries: result,
    removedScriptIds: Array.from(removedScriptsSet),
    removedPlanIds: Array.from(removedPlanIdsSet),
    existingPlansData,
  };
};

const applyPlanMutations = async ({
  cycle,
  influencer,
  entries,
  removedScriptIds,
  removedPlanIds,
  existingPlansData,
}) => {
  let touched = false;
  const cycleId = cycle.id;
  const influencerId = influencer.id;

  await prisma.$transaction(async (tx) => {
    const planMap = existingPlansData?.map ?? (await fetchExistingPlansMap(cycleId, influencerId, tx)).map;
    const plansByScript =
      existingPlansData?.byScript ?? (await fetchExistingPlansMap(cycleId, influencerId, tx)).byScript;

    if (removedPlanIds.length) {
      for (const planId of removedPlanIds) {
        const numeric = Number(planId);
        if (!Number.isInteger(numeric) || numeric <= 0) {
          continue;
        }
        const existing = planMap.get(numeric);
        if (existing && existing.cycleId === cycleId && existing.influencerId === influencerId) {
          await tx.influencerPlan.delete({ where: { id: existing.id } });
          planMap.delete(numeric);
          removePlansByScript(plansByScript, existing.contentScriptId ?? null, [numeric]);
          touched = true;
        }
      }
    }

    if (removedScriptIds.length) {
      for (const scriptId of removedScriptIds) {
        const numeric = Number(scriptId);
        if (!Number.isInteger(numeric) || numeric <= 0) {
          continue;
        }
        const deleted = await tx.influencerPlan.deleteMany({
          where: { cycleId, influencerId, contentScriptId: numeric },
        });
        if (deleted.count > 0) {
          touched = true;
        }
        plansByScript.delete(numeric);
        planMap.forEach((plan, planId) => {
          if (plan.contentScriptId === numeric) {
            planMap.delete(planId);
          }
        });
      }
    }

    const removedPlanSet = new Set(removedPlanIds.map((value) => Number(value)));
    const processedPlanIds = new Set();

    for (const entry of entries) {
      if (!entry || !entry.scheduled_date) {
        continue;
      }

      const planId = Number(entry.id);
      const notes = entry.notes ?? null;
      const append = Boolean(entry.append);
      const scheduledDate = new Date(`${entry.scheduled_date}T00:00:00.000Z`);

      if (Number.isInteger(planId) && planId > 0) {
        if (removedPlanSet.has(planId) || processedPlanIds.has(planId)) {
          continue;
        }
        const existing = planMap.get(planId);
        if (!existing || existing.cycleId !== cycleId || existing.influencerId !== influencerId) {
          continue;
        }

        const nextScriptId =
          entry.content_script_id != null ? entry.content_script_id : existing.contentScriptId ?? null;

        const shouldResetStatus =
          existing.status && existing.status !== "scheduled"
            ? true
            : toDateOnlyString(existing.scheduledDate) !== entry.scheduled_date;

        await tx.influencerPlan.update({
          where: { id: existing.id },
          data: {
            scheduledDate,
            contentScriptId: nextScriptId,
            notes,
            status: shouldResetStatus ? "scheduled" : existing.status,
            updatedAt: new Date(),
          },
        });

        planMap.set(existing.id, {
          ...existing,
          scheduledDate,
          contentScriptId: nextScriptId,
          notes,
          status: shouldResetStatus ? "scheduled" : existing.status,
          updatedAt: new Date(),
        });

        removePlansByScript(plansByScript, existing.contentScriptId ?? null, [existing.id]);
        if (!plansByScript.has(nextScriptId ?? null)) {
          plansByScript.set(nextScriptId ?? null, []);
        }
        plansByScript.get(nextScriptId ?? null).unshift(planMap.get(existing.id));

        processedPlanIds.add(existing.id);
        touched = true;
        continue;
      }

      const scriptId = entry.content_script_id ?? null;

      if (scriptId == null) {
        const existingByDate = Array.from(planMap.values()).find(
          (plan) =>
            plan.cycleId === cycleId &&
            plan.influencerId === influencerId &&
            toDateOnlyString(plan.scheduledDate) === entry.scheduled_date &&
            !processedPlanIds.has(plan.id) &&
            !removedPlanSet.has(plan.id),
        );

        if (existingByDate) {
          const shouldResetStatus =
            existingByDate.status && existingByDate.status !== "scheduled"
              ? true
              : toDateOnlyString(existingByDate.scheduledDate) !== entry.scheduled_date;

          await tx.influencerPlan.update({
            where: { id: existingByDate.id },
            data: {
              scheduledDate,
              contentScriptId: null,
              notes,
              status: shouldResetStatus ? "scheduled" : existingByDate.status,
              updatedAt: new Date(),
            },
          });

          planMap.set(existingByDate.id, {
            ...existingByDate,
            scheduledDate,
            contentScriptId: null,
            notes,
            status: shouldResetStatus ? "scheduled" : existingByDate.status,
            updatedAt: new Date(),
          });

          removePlansByScript(plansByScript, existingByDate.contentScriptId ?? null, [existingByDate.id]);
          if (!plansByScript.has(null)) {
            plansByScript.set(null, []);
          }
          plansByScript.get(null).unshift(planMap.get(existingByDate.id));

          processedPlanIds.add(existingByDate.id);
          touched = true;
          continue;
        }

        const created = await tx.influencerPlan.create({
          data: {
            cycleId,
            influencerId,
            scheduledDate,
            contentScriptId: null,
            notes,
            status: "scheduled",
          },
        });

        planMap.set(created.id, created);
        if (!plansByScript.has(null)) {
          plansByScript.set(null, []);
        }
        plansByScript.get(null).unshift(created);
        touched = true;
        continue;
      }

      if (!append) {
        const candidates = plansByScript.get(scriptId) || [];
        const existing = candidates.find(
          (plan) => !processedPlanIds.has(plan.id) && !removedPlanSet.has(plan.id),
        );
        if (existing) {
          const shouldResetStatus =
            existing.status && existing.status !== "scheduled"
              ? true
              : toDateOnlyString(existing.scheduledDate) !== entry.scheduled_date;

          await tx.influencerPlan.update({
            where: { id: existing.id },
            data: {
              scheduledDate,
              contentScriptId: scriptId,
              notes,
              status: shouldResetStatus ? "scheduled" : existing.status,
              updatedAt: new Date(),
            },
          });

          planMap.set(existing.id, {
            ...existing,
            scheduledDate,
            contentScriptId: scriptId,
            notes,
            status: shouldResetStatus ? "scheduled" : existing.status,
            updatedAt: new Date(),
          });

          removePlansByScript(plansByScript, scriptId, [existing.id]);
          if (!plansByScript.has(scriptId)) {
            plansByScript.set(scriptId, []);
          }
          plansByScript.get(scriptId).unshift(planMap.get(existing.id));

          processedPlanIds.add(existing.id);
          touched = true;
          continue;
        }
      }

      const created = await tx.influencerPlan.create({
        data: {
          cycleId,
          influencerId,
          scheduledDate,
          contentScriptId: scriptId,
          notes,
          status: "scheduled",
        },
      });

      planMap.set(created.id, created);
      if (!plansByScript.has(scriptId)) {
        plansByScript.set(scriptId, []);
      }
      plansByScript.get(scriptId).unshift(created);
      touched = true;
    }

    if (touched) {
      await touchCycle(cycleId, tx);
    }
  });

  return touched;
};

const getSalesSummary = async (influencerId) => {
  const summary = await prisma.sale.aggregate({
    where: { influencerId, status: "approved" },
    _sum: { points: true },
  });
  return { total_points: summary._sum.points ?? 0 };
};

export const resolveInfluencerForRequest = resolveInfluencerForRequestInternal;

export const getInfluencerPlanData = async (cycle, influencer, options = {}) =>
  collectInfluencerPlanData(cycle, influencer, options);

export const createOrUpdatePlans = async ({ cycle, influencer, body }) => {
  const parsed = await normalizePlanEntriesPayload(body || {}, cycle, influencer.id);
  if (parsed.error) {
    return { error: parsed.error };
  }

  await applyPlanMutations({
    cycle,
    influencer,
    entries: parsed.entries,
    removedScriptIds: parsed.removedScriptIds,
    removedPlanIds: parsed.removedPlanIds,
    existingPlansData: parsed.existingPlansData,
  });

  const plans = await listPlansByInfluencerRows(cycle.id, influencer.id);
  return { cycle: mapCycleToLegacyRow(cycle), plans };
};

export const createOrUpdatePlansExtended = async ({ cycle, influencer, body }) => {
  const parsed = await normalizePlanEntriesPayload(body || {}, cycle, influencer.id);
  if (parsed.error) {
    return parsed;
  }

  await applyPlanMutations({
    cycle,
    influencer,
    entries: parsed.entries,
    removedScriptIds: parsed.removedScriptIds,
    removedPlanIds: parsed.removedPlanIds,
    existingPlansData: parsed.existingPlansData,
  });

  return buildExtendedPlanResponse(cycle, influencer, { scriptLimit: 50 });
};

export const updateSinglePlan = async ({ planId, cycle, influencer, nextDate, nextScriptId, notes }) => {
  const plan = await prisma.influencerPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return { error: { status: 404, message: "Agendamento nao encontrado." } };
  }

  if (plan.cycleId !== cycle.id || plan.influencerId !== influencer.id) {
    return { error: { status: 403, message: "Acesso negado." } };
  }

  let scheduledDate = plan.scheduledDate;
  if (nextDate) {
    if (!isValidDate(nextDate)) {
      return { error: { status: 400, message: "Informe uma data valida (YYYY-MM-DD)." } };
    }
    const cycleMonth = String(cycle.cycleMonth ?? cycle.cycle_month).padStart(2, "0");
    const expectedPrefix = `${cycle.cycleYear ?? cycle.cycle_year}-${cycleMonth}-`;
    if (!nextDate.trim().startsWith(expectedPrefix)) {
      return { error: { status: 400, message: "Data precisa estar no mesmo ciclo mensal." } };
    }
    const duplicate = await prisma.influencerPlan.findFirst({
      where: {
        cycleId: cycle.id,
        influencerId: influencer.id,
        scheduledDate: new Date(`${nextDate}T00:00:00.000Z`),
        NOT: { id: plan.id },
      },
    });
    if (duplicate) {
      return { error: { status: 409, message: "Ja existe um agendamento para esta data." } };
    }
    scheduledDate = new Date(`${nextDate}T00:00:00.000Z`);
  }

  let contentScriptId = plan.contentScriptId;
  if (nextScriptId !== undefined) {
    if (nextScriptId === null || nextScriptId === "") {
      contentScriptId = null;
    } else {
      const parsed = Number(nextScriptId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { error: { status: 400, message: "Identificador de roteiro invalido." } };
      }
      const scriptExists = await prisma.contentScript.findUnique({ where: { id: parsed } });
      if (!scriptExists) {
        return { error: { status: 404, message: "Roteiro nao encontrado." } };
      }
      contentScriptId = parsed;
    }
  }

  await prisma.influencerPlan.update({
    where: { id: plan.id },
    data: {
      scheduledDate,
      contentScriptId,
      notes: notes ?? plan.notes ?? null,
      status: "scheduled",
      updatedAt: new Date(),
    },
  });

  await touchCycle(cycle.id);

  const updated = await prisma.influencerPlan.findUnique({ where: { id: plan.id } });
  return { plan: mapPlanRow(updated) };
};

export const listPlansForCycle = listPlansForCycleRows;
export const listPendingPlanValidations = listPendingPlanValidationsRows;
export const findPlanDetailsWithInfluencer = findPlanWithInfluencer;
export const listMonthlyCommissionsByInfluencer = listMonthlyCommissionsByInfluencerRows;
export const mapCycle = mapCycleToLegacyRow;
export const mapInfluencer = mapInfluencerToLegacyRow;
export const mapPlan = mapPlanRow;

export const getInfluencerDashboardData = async (cycle, influencer) => {
  const plans = await listPlansByInfluencerRows(cycle.id, influencer.id);
  const validatedPlans = plans.filter((plan) => plan.status === "validated");
  const validatedDays = validatedPlans.length;
  const plannedDays = plans.length;
  const pendingValidations = plans.filter((plan) => plan.status === "scheduled").length;
  const todayIso = new Date().toISOString().slice(0, 10);

  const alerts = plans
    .filter((plan) => plan.status !== "validated" && plan.scheduled_date < todayIso)
    .map((plan) => ({ id: plan.id, date: plan.scheduled_date, status: plan.status }));

  const scripts = await prisma.contentScript.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 15,
  });
  const suggestions = scripts.map((script) => ({
    id: script.id,
    titulo: script.title,
    descricao: script.description ?? "",
  }));

  const salesSummary = await getSalesSummary(influencer.id);
  const commissionSummary = summarizePoints(salesSummary.total_points || 0, validatedDays);

  const commission = {
    basePoints: commissionSummary.basePoints,
    totalPoints: commissionSummary.totalPoints,
    multiplier: commissionSummary.multiplier,
    label: commissionSummary.label,
    validatedDays: commissionSummary.validatedDays,
    baseValue: pointsToBrl(commissionSummary.basePoints),
    totalValue: pointsToBrl(commissionSummary.totalPoints),
    pointValue: POINT_VALUE_BRL,
  };

  const nextPlan = plans.find((plan) => plan.scheduled_date >= todayIso) || null;

  return {
    cycle: mapCycleToLegacyRow(cycle),
    influencer: {
      id: influencer.id,
      nome: influencer.nome,
      instagram: influencer.instagram,
      commission_rate: influencer.commission_rate,
      vendas_valor: influencer.vendas_valor,
    },
    plans,
    progress: {
      plannedDays,
      validatedDays,
      pendingValidations,
      multiplier: commission.multiplier,
      multiplierLabel: commission.label,
      estimatedCommission: commission.totalValue,
      estimatedPoints: commission.totalPoints,
    },
    commission,
    alerts,
    suggestions,
    nextPlan,
  };
};

export const getMasterDashboardData = async (cycle) => {
  const plans = await listPlansForCycleRows(cycle.id);
  const pending = await listPendingPlanValidationsRows(cycle.id);

  const influencers = await prisma.influencer.findMany({
    orderBy: { name: "asc" },
  });

  const influencersSummary = [];

  for (const influencer of influencers) {
    const planned = await prisma.influencerPlan.count({
      where: { cycleId: cycle.id, influencerId: influencer.id },
    });
    const validated = await prisma.influencerPlan.count({
      where: { cycleId: cycle.id, influencerId: influencer.id, status: "validated" },
    });

    influencersSummary.push(
      mapInfluencerSummaryRow({
        id: influencer.id,
        name: influencer.name,
        instagram: influencer.instagram,
        planned,
        validated,
      }),
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const alerts = plans.filter((plan) => plan.status !== "validated" && plan.scheduled_date < todayIso);

  const stats = {
    totalInfluencers: influencersSummary.length,
    plannedPosts: plans.length,
    validatedPosts: influencersSummary.reduce((total, item) => total + item.validated, 0),
    pendingValidations: pending.length,
    alerts: alerts.length,
  };

  return {
    cycle: mapCycleToLegacyRow(cycle),
    plans,
    pendingValidations: pending,
    influencers: influencersSummary,
    stats,
  };
};

export const approvePlanValidation = async (planId) => {
  const plan = await prisma.influencerPlan.findUnique({
    where: { id: planId },
    select: { id: true, cycleId: true, influencerId: true, status: true },
  });
  if (!plan) {
    return { error: { status: 404, message: "Agendamento nao encontrado." } };
  }
  if (plan.status === "validated") {
    return { error: { status: 409, message: "Este dia ja foi validado." } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.influencerPlan.update({
      where: { id: plan.id },
      data: { status: "validated", updatedAt: new Date() },
    });
    await touchCycle(plan.cycleId, tx);
  });

  const updated = await findPlanWithInfluencer(plan.id);
  return { plan: updated };
};

export const rejectPlanValidation = async (planId) => {
  const plan = await prisma.influencerPlan.findUnique({
    where: { id: planId },
    select: { id: true, cycleId: true, influencerId: true, status: true },
  });
  if (!plan) {
    return { error: { status: 404, message: "Agendamento nao encontrado." } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.influencerPlan.update({
      where: { id: plan.id },
      data: { status: "scheduled", updatedAt: new Date() },
    });
    await touchCycle(plan.cycleId, tx);
  });

  const updated = await findPlanWithInfluencer(plan.id);
  return { plan: updated };
};
