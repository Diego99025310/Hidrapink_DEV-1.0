import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { findUserByEmail } from "./userService.js";
import {
  extractUserPhoneData,
  generateRandomPassword,
  normalizeDigits,
  trimString,
  validators,
} from "../utils/text.js";

const truthyBooleanValues = new Set([
  "1",
  "true",
  "on",
  "yes",
  "sim",
  "y",
  "s",
  "dispensa",
  "dispensado",
  "dispensada",
]);
const falsyBooleanValues = new Set(["0", "false", "off", "no", "nao", "nao", "n"]);

const normalizeBooleanInput = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    const asciiNormalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (truthyBooleanValues.has(asciiNormalized) || truthyBooleanValues.has(normalized)) {
      return true;
    }
    if (falsyBooleanValues.has(asciiNormalized) || falsyBooleanValues.has(normalized)) {
      return false;
    }
  }
  return undefined;
};

const pickBooleanValue = (source, keys) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return undefined;
};

const validateCpf = (value) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return { formatted: null };
  }
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return { error: "CPF invalido." };
  }
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(digits[i]) * (len + 1 - i);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  if (calc(9) !== Number(digits[9]) || calc(10) !== Number(digits[10])) {
    return { error: "CPF invalido." };
  }
  const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return { formatted, digits };
};

const validatePhone = (value) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return { formatted: null, digits: null };
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return { error: "Contato deve conter DDD + numero (10 ou 11 digitos)." };
  }
  const ddd = digits.slice(0, 2);
  const middleLen = digits.length === 11 ? 5 : 4;
  const middle = digits.slice(2, 2 + middleLen);
  const suffix = digits.slice(2 + middleLen);
  const formatted = `(${ddd}) ${middle}${suffix ? `-${suffix}` : ""}`;
  return { formatted, digits };
};

const validateCep = (value) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return { formatted: null };
  }
  if (digits.length !== 8) {
    return { error: "CEP invalido." };
  }
  const formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return { formatted, digits };
};

const parseCommissionRate = (value) => {
  if (value == null || value === "") {
    return { value: new Prisma.Decimal("0") };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return { error: "Comissao deve estar entre 0 e 100." };
  }
  return { value: new Prisma.Decimal(parsed.toFixed(2)) };
};

const parseSalesQuantity = (value) => {
  if (value == null || value === "") {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("VendasQuantidade precisa ser um numero inteiro maior ou igual a zero.");
  }
  return parsed;
};

const parseSalesValue = (value) => {
  if (value == null || value === "") {
    return new Prisma.Decimal("0");
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("VendasValor precisa ser um numero maior ou igual a zero.");
  }
  return new Prisma.Decimal(parsed.toFixed(2));
};

export const normalizeInfluencerPayload = (body) => {
  const contractWaiverRaw = pickBooleanValue(body, [
    "contractSignatureWaived",
    "contract_signature_waived",
    "contractWaived",
    "waiveContractSignature",
    "dispensaAssinaturaContrato",
    "dispensaAssinatura",
    "dispensaContrato",
    "dispensarContrato",
  ]);
  const contractSignatureWaived = normalizeBooleanInput(contractWaiverRaw);

  const normalized = {
    nome: trimString(body.nome),
    instagram: trimString(body.instagram),
    cpf: trimString(body.cpf),
    email: trimString(body.email),
    contato: trimString(body.contato),
    cupom: trimString(body.cupom),
    vendasQuantidade: trimString(body.vendasQuantidade),
    vendasValor: trimString(body.vendasValor),
    cep: trimString(body.cep),
    numero: trimString(body.numero),
    complemento: trimString(body.complemento),
    logradouro: trimString(body.logradouro),
    bairro: trimString(body.bairro),
    cidade: trimString(body.cidade),
    estado: trimString(body.estado),
    commissionPercent: trimString(body.commissionPercent ?? body.commission_rate ?? body.commission),
    contractSignatureWaived,
  };

  const missing = [];
  if (!normalized.nome) missing.push("nome");
  if (!normalized.instagram) missing.push("instagram");
  if (missing.length) {
    return { error: { error: "Campos obrigatorios faltando.", campos: missing } };
  }

  const cpfResult = validateCpf(normalized.cpf);
  if (cpfResult.error) {
    return { error: { error: cpfResult.error } };
  }

  const contactResult = validatePhone(normalized.contato);
  if (contactResult.error) {
    return { error: { error: contactResult.error } };
  }

  const cepResult = validateCep(normalized.cep);
  if (cepResult.error) {
    return { error: { error: cepResult.error } };
  }

  let vendasQuantidade = 0;
  let vendasValor = new Prisma.Decimal("0");
  let commissionRate = new Prisma.Decimal("0");

  try {
    vendasQuantidade = parseSalesQuantity(normalized.vendasQuantidade);
    vendasValor = parseSalesValue(normalized.vendasValor);
  } catch (parseError) {
    return { error: { error: parseError.message } };
  }

  const commissionResult = parseCommissionRate(normalized.commissionPercent);
  if (commissionResult.error) {
    return { error: { error: commissionResult.error } };
  }
  commissionRate = commissionResult.value;

  const instagramHandle = normalized.instagram.startsWith("@")
    ? normalized.instagram
    : `@${normalized.instagram}`;
  const estadoValue = normalized.estado ? normalized.estado.toUpperCase() : null;

  const data = {
    name: normalized.nome,
    instagram: instagramHandle,
    cpf: cpfResult.formatted,
    email: normalized.email ? normalized.email.toLowerCase() : null,
    contact: contactResult.formatted,
    coupon: normalized.cupom ? normalized.cupom.toUpperCase() : null,
    salesQuantity: vendasQuantidade,
    salesValue: vendasValor,
    cep: cepResult.formatted,
    numero: normalized.numero || null,
    complemento: normalized.complemento || null,
    logradouro: normalized.logradouro || null,
    bairro: normalized.bairro || null,
    cidade: normalized.cidade || null,
    estado: estadoValue || null,
    commissionRate,
    contractSignatureWaived:
      contractSignatureWaived != null ? (contractSignatureWaived ? true : false) : undefined,
  };

  return { data, cpfDigits: cpfResult.digits, contactDigits: contactResult.digits };
};

const ensureInfluencerUniqueness = async (data, { excludeId } = {}) => {
  if (data.cpf) {
    const existing = await prisma.influencer.findFirst({
      where: {
        cpf: data.cpf,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (existing) {
      return { error: "CPF ja cadastrado.", status: 409 };
    }
  }

  if (data.email) {
    const existing = await prisma.influencer.findFirst({
      where: {
        email: data.email,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (existing) {
      return { error: "Email de contato ja cadastrado.", status: 409 };
    }
  }

  if (data.contact) {
    const existing = await prisma.influencer.findFirst({
      where: {
        contact: data.contact,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (existing) {
      return { error: "Telefone ja cadastrado.", status: 409 };
    }
  }

  if (data.coupon) {
    const existing = await prisma.influencer.findFirst({
      where: {
        coupon: data.coupon,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true },
    });
    if (existing) {
      return { error: "Cupom ja cadastrado.", status: 409 };
    }
  }

  return null;
};

export const createInfluencer = async (payload, options = {}) => {
  const { data, error } = normalizeInfluencerPayload(payload);
  if (error) {
    return { error };
  }

  const loginEmail = trimString(payload?.loginEmail) || data.email;
  if (!loginEmail || !validators.email(loginEmail)) {
    return { error: { error: "Informe um email valido para acesso." } };
  }

  if (await findUserByEmail(loginEmail)) {
    return { error: { error: "Email de login ja cadastrado." } };
  }

  const uniquenessError = await ensureInfluencerUniqueness(data);
  if (uniquenessError) {
    return {
      error: {
        error: uniquenessError.error,
        status: uniquenessError.status ?? 400,
      },
    };
  }

  const providedPasswordRaw =
    payload?.loginPassword ??
    payload?.provisionalPassword ??
    payload?.senha ??
    payload?.password ??
    null;
  const providedPassword = providedPasswordRaw == null ? "" : String(providedPasswordRaw).trim();
  if (providedPassword && !validators.password(providedPassword)) {
    return { error: { error: "Senha de acesso deve ter ao menos 6 caracteres." } };
  }

  const provisionalPassword = providedPassword || generateRandomPassword(6);
  const passwordHash = await bcrypt.hash(provisionalPassword, 10);

  const phoneData = extractUserPhoneData(data.contact);
  if (phoneData.phoneNormalized) {
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phoneNormalized: phoneData.phoneNormalized },
      select: { id: true },
    });
    if (existingPhoneUser) {
      return { error: { error: "Telefone ja cadastrado." } };
    }
  }

  const waiveContract = data.contractSignatureWaived === true;
  let signatureCode = null;
  let signatureCodeHash = null;
  let generatedAt = null;

  if (!waiveContract) {
    signatureCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    signatureCodeHash = await bcrypt.hash(signatureCode, 10);
    generatedAt = new Date().toISOString();
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: loginEmail.toLowerCase(),
        passwordHash,
        role: "influencer",
        mustChangePassword: options.forcePasswordChange ?? true,
        phone: phoneData.phone,
        phoneNormalized: phoneData.phoneNormalized,
      },
    });

    const influencer = await tx.influencer.create({
      data: {
        ...data,
        contractSignatureCodeHash: signatureCodeHash,
        contractSignatureCodeGeneratedAt: generatedAt,
        contractSignatureWaived: waiveContract,
        userId: user.id,
      },
    });

    return { user, influencer };
  });

  return {
    influencer: result.influencer,
    user: result.user,
    provisionalPassword,
    signatureCode,
    loginEmail,
  };
};

export const updateInfluencer = async (id, payload) => {
  const influencerId = Number(id);
  if (!Number.isInteger(influencerId) || influencerId <= 0) {
    return { error: { error: "ID invalido." } };
  }

  const existing = await prisma.influencer.findUnique({
    where: { id: influencerId },
    include: { user: true },
  });

  if (!existing) {
    return { error: { error: "Influenciadora nao encontrada.", status: 404 } };
  }

  const { data, error } = normalizeInfluencerPayload(payload);
  if (error) {
    return { error };
  }

  const uniquenessError = await ensureInfluencerUniqueness(data, { excludeId: influencerId });
  if (uniquenessError) {
    return {
      error: { error: uniquenessError.error, status: uniquenessError.status ?? 400 },
    };
  }

  if (data.contractSignatureWaived != null) {
    data.contractSignatureWaived = !!data.contractSignatureWaived;
    if (data.contractSignatureWaived) {
      data.contractSignatureCodeHash = null;
      data.contractSignatureCodeGeneratedAt = null;
    }
  }

  const updated = await prisma.influencer.update({
    where: { id: influencerId },
    data,
  });

  return { influencer: updated };
};

export const deleteInfluencer = async (id) => {
  const influencerId = Number(id);
  if (!Number.isInteger(influencerId) || influencerId <= 0) {
    return { error: { error: "ID invalido." } };
  }

  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: { id: true, userId: true },
  });

  if (!influencer) {
    return { error: { error: "Influenciadora nao encontrada.", status: 404 } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.deleteMany({ where: { influencerId } });
    await tx.storySubmission.deleteMany({ where: { influencerId } });
    await tx.influencerPlan.deleteMany({ where: { influencerId } });
    await tx.monthlyCommission.deleteMany({ where: { influencerId } });
    await tx.influencer.delete({ where: { id: influencerId } });
    if (influencer.userId) {
      await tx.user.delete({ where: { id: influencer.userId } });
    }
  });

  return { success: true };
};

export const findInfluencerById = (id) =>
  prisma.influencer.findUnique({
    where: { id: Number(id) },
    include: { user: true },
  });

export const findInfluencerByUserId = (userId) =>
  prisma.influencer.findFirst({
    where: { userId: Number(userId) },
  });

export const listInfluencersForUser = async (authUser) => {
  if (authUser?.role === "master") {
    return prisma.influencer.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  if (authUser?.role === "influencer") {
    const own = await prisma.influencer.findFirst({
      where: { userId: authUser.id },
    });
    return own ? [own] : [];
  }

  return [];
};

export const listInfluencerSummary = async () => {
  const [influencers, salesAggregates] = await Promise.all([
    prisma.influencer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        instagram: true,
        coupon: true,
        commissionRate: true,
      },
    }),
    prisma.sale.groupBy({
      by: ["influencerId"],
      _count: { _all: true },
      _sum: { points: true },
    }),
  ]);

  const aggregationMap = new Map();
  for (const entry of salesAggregates) {
    aggregationMap.set(entry.influencerId, {
      count: entry._count?._all ?? 0,
      points: entry._sum?.points ?? 0,
    });
  }

  return influencers.map((influencer) => {
    const aggregate = aggregationMap.get(influencer.id) || { count: 0, points: 0 };
    return {
      ...influencer,
      salesCount: aggregate.count,
      salesPoints: aggregate.points,
    };
  });
};
