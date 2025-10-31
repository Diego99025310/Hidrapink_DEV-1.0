import { roundPoints } from "./points.js";

export const ACTIVATION_BANDS = [
  { min: 1, max: 4, factor: 1.0, label: "1 a 4 ativacoes validadas (100%)" },
  { min: 5, max: 9, factor: 1.25, label: "5 a 9 ativacoes validadas (125%)" },
  { min: 10, max: 14, factor: 1.5, label: "10 a 14 ativacoes validadas (150%)" },
  { min: 15, max: 19, factor: 1.75, label: "15 a 19 ativacoes validadas (175%)" },
  { min: 20, max: Number.POSITIVE_INFINITY, factor: 2.0, label: "20 ou mais ativacoes validadas (200%)" },
];

export const getMultiplier = (activations) => {
  const count = Number(activations);
  if (!Number.isFinite(count) || count <= 0) {
    return {
      factor: 0,
      label: "Sem ativacoes validadas no ciclo",
      band: null,
      activations: 0,
    };
  }

  const band = ACTIVATION_BANDS.find((entry) => count >= entry.min && count <= entry.max);
  if (band) {
    return {
      factor: band.factor,
      label: band.label,
      band,
      activations: count,
    };
  }

  const lastBand = ACTIVATION_BANDS[ACTIVATION_BANDS.length - 1];
  if (!lastBand) {
    return {
      factor: 0,
      label: "Sem configuracao de multiplicador",
      band: null,
      activations: count,
    };
  }

  return {
    factor: lastBand.factor,
    label: lastBand.label,
    band: lastBand,
    activations: count,
  };
};

export const calculateCommissionMultiplier = (activations) => {
  const multiplierData = getMultiplier(activations);
  return {
    multiplier: multiplierData.factor,
    factor: multiplierData.factor,
    band: multiplierData.band,
    label: multiplierData.label,
    activations: multiplierData.activations,
    validatedDays: multiplierData.activations,
  };
};

export const summarizePoints = (basePoints, activations) => {
  const base = Number(basePoints) > 0 ? roundPoints(basePoints) : 0;
  const multiplierData = calculateCommissionMultiplier(activations);
  const total = roundPoints(base * multiplierData.factor);
  return {
    basePoints: base,
    multiplier: multiplierData.multiplier,
    factor: multiplierData.factor,
    label: multiplierData.label,
    activations: multiplierData.activations,
    validatedDays: multiplierData.validatedDays,
    totalPoints: total,
  };
};

export default {
  ACTIVATION_BANDS,
  getMultiplier,
  calculateCommissionMultiplier,
  summarizePoints,
};
