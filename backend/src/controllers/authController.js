import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  findUserByEmail,
  findUserByIdentifier,
  findUserById,
  sanitizeUser as sanitizeUserEntity,
} from "../services/userService.js";
import {
  extractUserPhoneData,
  trimString,
  validators,
} from "../utils/text.js";
import { generateRandomPassword } from "../utils/text.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || "1d";

const formatUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
  mustChangePassword: user.mustChangePassword ?? false,
});

const signToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION },
  );

export async function login(req, res) {
  const identifier = trimString(req.body?.identifier ?? req.body?.email);
  const password = req.body?.password;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Informe email ou telefone e a senha." });
  }

  const user = await findUserByIdentifier(identifier);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }

  const token = signToken(user);
  return res.status(200).json({ token, user: formatUserResponse(user) });
}

export async function me(req, res) {
  if (!req.auth?.user?.id) {
    return res.status(401).json({ error: "Usuario nao autenticado." });
  }

  const user = await findUserById(req.auth.user.id);
  if (!user) {
    return res.status(404).json({ error: "Usuario nao encontrado." });
  }

  return res.status(200).json({ user: formatUserResponse(user) });
}

export async function register(req, res) {
  const email = trimString(req.body?.email);
  const password = req.body?.password ?? generateRandomPassword(6);
  const role = req.body?.role === "master" ? "master" : "influencer";
  const rawPhone = req.body?.phone ?? req.body?.telefone ?? req.body?.phoneNumber;
  const phoneData = extractUserPhoneData(rawPhone);

  if (!email) {
    return res.status(400).json({ error: "Email e obrigatorio." });
  }

  if (!validators.email(email)) {
    return res.status(400).json({ error: "Email invalido." });
  }

  if (!validators.password(password)) {
    return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres." });
  }

  if (await findUserByEmail(email)) {
    return res.status(409).json({ error: "Email ja cadastrado." });
  }

  if (phoneData.phoneNormalized) {
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phoneNormalized: phoneData.phoneNormalized },
    });
    if (existingPhoneUser) {
      return res.status(409).json({ error: "Telefone ja cadastrado." });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let created;
  try {
    created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        mustChangePassword: role === "influencer",
        phone: phoneData.phone,
        phoneNormalized: phoneData.phoneNormalized,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "Email ou telefone já cadastrado." });
    }

    console.error("Erro ao registrar usuario:", error);
    return res.status(500).json({ error: "Nao foi possivel registrar o usuario." });
  }

  return res.status(201).json({
    user: formatUserResponse(created),
    provisionalPassword: password,
  });
}

export const sanitizeUser = sanitizeUserEntity;

