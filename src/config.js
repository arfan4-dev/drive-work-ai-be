import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });

function parseList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  corsOrigins: parseList(process.env.CORS_ORIGIN || "http://localhost:5173"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 20,
  defaultProvider: (process.env.AI_PROVIDER || "mock").trim().toLowerCase(),
  uploadsDir: path.join(projectRoot, "uploads"),
  outputsDir: path.join(projectRoot, "outputs"),
  mock: {
    delayMs: Number(process.env.MOCK_DELAY_MS ?? 400) || 0,
    failViews: parseList(process.env.MOCK_FAIL_VIEWS)
  }
};
