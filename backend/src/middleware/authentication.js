import jwt from "jsonwebtoken";
import { findUserById, sanitizeUser } from "../services/userService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const extractToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") {
    return null;
  }
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return header.trim();
};

export const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Token nao informado." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.userId ?? payload.id);
    if (!user) {
      return res.status(401).json({ error: "Usuario nao encontrado." });
    }

    const safeUser = sanitizeUser(user);
    req.auth = { token, user: safeUser };
    req.user = safeUser;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalido ou expirado." });
  }
};

export const authorizeMaster = (req, res, next) => {
  if (req.auth?.user?.role !== "master") {
    return res.status(403).json({ error: "Acesso restrito ao usuario master." });
  }
  return next();
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.auth?.user || !roles.includes(req.auth.user.role)) {
    return res.status(403).json({ error: "Acesso nao autorizado para o perfil atual." });
  }
  return next();
};

export default {
  authenticate,
  authorizeMaster,
  authorizeRoles,
};
