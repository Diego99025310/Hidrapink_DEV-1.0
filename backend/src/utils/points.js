export const DEFAULT_POINT_VALUE = 0.1;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
};

export const roundCurrency = (value) => Math.round(Number(value) * 100) / 100;

export const roundPoints = (value) => {
  const num = Math.round(Number(value));
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const resolvePointValue = () => {
  const envValue = process.env.POINT_VALUE_BRL ?? process.env.PONTO_VALOR_BRL;
  if (envValue != null && envValue !== "") {
    const parsed = toNumber(envValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return roundCurrency(parsed);
    }
  }
  return DEFAULT_POINT_VALUE;
};

export const POINT_VALUE_BRL = resolvePointValue();

export const pointsToBrl = (points) => {
  const parsed = toNumber(points);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return roundCurrency(parsed * POINT_VALUE_BRL);
};

export const brlToPoints = (value) => {
  const parsed = toNumber(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return roundPoints(parsed / POINT_VALUE_BRL);
};

export default {
  DEFAULT_POINT_VALUE,
  POINT_VALUE_BRL,
  roundCurrency,
  roundPoints,
  pointsToBrl,
  brlToPoints,
};
