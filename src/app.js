import cors from "cors";
import express from "express";
import multer from "multer";
import { config } from "./config.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { spikeRoutes } from "./routes/spikeRoutes.js";
import { HttpError } from "./utils/httpError.js";
import { removeRunUploads } from "./utils/upload.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json());

  // Inputs and generated results are served so the frontend can render Before/After.
  app.use("/uploads", express.static(config.uploadsDir));
  app.use("/outputs", express.static(config.outputsDir));

  app.get("/", (req, res) => {
    res.json({ service: "drivework-ai-spike-backend", health: "/api/health" });
  });

  app.use("/api", healthRoutes);
  app.use("/api", spikeRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use(async (error, req, res, next) => {
    // A request rejected before processing leaves no useful uploads behind.
    if (req.runId && !req.runStarted) {
      await removeRunUploads(req.runId).catch(() => {});
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `"${error.field}" exceeds the ${config.maxUploadMb} MB upload limit.`
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? `Unexpected file field "${error.field}".`
            : error.message;
      res.status(400).json({ error: message });
      return;
    }

    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, details: error.details });
      return;
    }

    // Full stack + request context so Vercel Runtime Logs show the real exception.
    console.error(`[500] ${req.method} ${req.originalUrl}${req.runId ? ` (run ${req.runId})` : ""}`, error);
    res.status(500).json({ error: "Internal server error.", details: error?.message });
  });

  return app;
}

// Vercel's Express integration uses this file as the entrypoint (first match of src/app.js) and
// requires the app instance as the default export. Local development uses src/server.js.
const app = createApp();

export default app;
