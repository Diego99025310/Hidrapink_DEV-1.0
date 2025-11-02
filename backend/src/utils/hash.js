import crypto from "node:crypto";
import fs from "node:fs";

const readFileContent = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("utf8");
};

export const hashContent = (content) => {
  if (typeof content !== "string" || !content.length) {
    throw new Error("Conteudo do termo invalido para hash.");
  }
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
};

export const gerarHashTermo = (filePath) => {
  if (!filePath) {
    throw new Error("Caminho do termo nao informado.");
  }
  const content = readFileContent(filePath);
  return hashContent(content);
};

export default {
  gerarHashTermo,
  hashContent,
};
