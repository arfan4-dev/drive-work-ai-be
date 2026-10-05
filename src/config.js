import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Local only: on Vercel there is no .env file (it is git-ignored) and dotenv silently does nothing;
// variables come from the Vercel project settings instead.
dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });

// Vercel sets VERCEL=1. Its deployment directory is read-only; only /tmp is writable (and ephemeral).
const isVercel = Boolean(process.env.VERCEL);
const dataRoot = process.env.DATA_DIR || (isVercel ? path.join(os.tmpdir(), "drivework-spike") : projectRoot);

function parseList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  isVercel,
  port: Number(process.env.PORT) || 5000,
  corsOrigins: parseList(process.env.CORS_ORIGIN || "http://localhost:5173"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 20,
  defaultProvider: (process.env.AI_PROVIDER || "mock").trim().toLowerCase(),
  uploadsDir: path.join(dataRoot, "uploads"),
  outputsDir: path.join(dataRoot, "outputs"),
  mock: {
    delayMs: Number(process.env.MOCK_DELAY_MS ?? 400) || 0,
    failViews: parseList(process.env.MOCK_FAIL_VIEWS)
  }
};
