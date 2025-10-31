import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { extractUserPhoneData, normalizeDigits, trimString, validators } from "../utils/text.js";

const sanitizeIdentifier = (identifier) => trimString(identifier)?.toLowerCase();

export const findUserById = async (id) => {
  if (!id) return null;
  return prisma.user.findUnique({ where: { id: Number(id) } });
};

export const findUserByEmail = async (email) => {
  const normalized = sanitizeIdentifier(email);
  if (!normalized) return null;
  return prisma.user.findUnique({ where: { email: normalized } });
};

export const findUserByPhoneNormalized = async (phoneNormalized) => {
  if (!phoneNormalized) return null;
  return prisma.user.findUnique({ where: { phoneNormalized } });
};

export const findUserByIdentifier = async (identifier) => {
  const trimmed = trimString(identifier);
  if (!trimmed) return null;

  if (validators.email(trimmed)) {
    return findUserByEmail(trimmed);
  }

  const digits = normalizeDigits(trimmed);
  if (!digits) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      OR: [{ phoneNormalized: digits }, { phone: trimmed }],
    },
  });
};

export const createUser = async ({ email, password, role = "influencer", phone }) => {
  const trimmedEmail = trimString(email)?.toLowerCase();
  if (!trimmedEmail || !validators.email(trimmedEmail)) {
    throw new Error("Email invalido.");
  }

  if (!validators.password(password)) {
    throw new Error("Senha deve ter ao menos 6 caracteres.");
  }

  if (await findUserByEmail(trimmedEmail)) {
    const error = new Error("Email ja cadastrado.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const phoneData = extractUserPhoneData(phone);

  if (phoneData.phoneNormalized) {
    const existingPhone = await findUserByPhoneNormalized(phoneData.phoneNormalized);
    if (existingPhone) {
      const error = new Error("Telefone ja cadastrado.");
      error.status = 409;
      throw error;
    }
  }

  return prisma.user.create({
    data: {
      email: trimmedEmail,
      passwordHash,
      role,
      mustChangePassword: role === "influencer",
      phone: phoneData.phone,
      phoneNormalized: phoneData.phoneNormalized,
    },
  });
};

export const updateUserPassword = async (id, password) => {
  if (!validators.password(password)) {
    throw new Error("Senha deve ter ao menos 6 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
};

export const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
};
