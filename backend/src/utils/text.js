const EMAIL_REGEX =
  /^(?:[\w!#$%&'*+/=?^`{|}~-]+(?:\.[\w!#$%&'*+/=?^`{|}~-]+)*)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export const trimString = (value) => (typeof value === "string" ? value.trim() : value);

export const normalizeDigits = (value) => (value ? String(value).replace(/\D+/g, "") : "");

export const validators = {
  email: (value) => EMAIL_REGEX.test(trimString(value || "")),
  password: (value) => typeof value === "string" && value.length >= 6,
};

export const extractUserPhoneData = (value) => {
  const trimmed = trimString(value) || null;
  if (!trimmed) {
    return { phone: null, phoneNormalized: null };
  }

  const digits = normalizeDigits(trimmed);
  if (!digits) {
    return { phone: trimmed, phoneNormalized: null };
  }

  const isShort = digits.length < 8;
  return {
    phone: trimmed,
    phoneNormalized: isShort ? null : digits,
  };
};

export const generateRandomPassword = (length = 6) => {
  const charset = "0123456789";
  return Array.from({ length }, () => {
    const randomIndex = Math.floor(Math.random() * charset.length);
    return charset[randomIndex];
  }).join("");
};

export const generateDefaultInfluencerPassword = (name, phone) => {
  const rawName = trimString(name) || "";
  const asciiName = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase();
  const letters = asciiName.slice(0, 3);

  const digits = normalizeDigits(phone);
  const suffix = digits.slice(-4);

  if (letters.length < 3 || suffix.length < 4) {
    return null;
  }

  return `${letters}${suffix}`;
};

export const parseCurrencyField = (value, fieldLabel) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return { error: `${fieldLabel} deve ser um numero maior ou igual a zero.` };
  }
  return { value: Math.round(num * 100) / 100 };
};

export const parsePointsField = (value, fieldLabel) => {
  if (value == null || value === "") {
    return { error: `${fieldLabel} deve ser informado.` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} deve ser um numero inteiro maior ou igual a zero.` };
  }

  const rounded = Math.round(parsed);
  if (Math.abs(rounded - parsed) > 0.0001) {
    return { error: `${fieldLabel} deve ser um numero inteiro.` };
  }

  return { value: rounded };
};

export const lowerCaseOrNull = (value) => {
  const trimmed = trimString(value);
  return trimmed ? trimmed.toLowerCase() : null;
};

export default {
  trimString,
  normalizeDigits,
  validators,
  extractUserPhoneData,
  generateRandomPassword,
  generateDefaultInfluencerPassword,
  parseCurrencyField,
  parsePointsField,
  lowerCaseOrNull,
};

