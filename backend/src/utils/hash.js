import crypto from "node:crypto";
import fs from "node:fs";

const readFileContent = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("utf8");
};

export const gerarHashTermo = (filePath) => {
  if (!filePath) {
    throw new Error("Caminho do termo nao informado.");
  }
  const content = readFileContent(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
};

export default {
  gerarHashTermo,
};
