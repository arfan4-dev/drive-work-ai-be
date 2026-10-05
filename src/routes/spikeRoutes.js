import { Router } from "express";
import { getOptions, getProviders, runSpike } from "../controllers/spikeController.js";
import { assignRunId } from "../utils/runId.js";
import { spikeUpload } from "../utils/upload.js";

export const spikeRoutes = Router();

spikeRoutes.get("/providers", getProviders);
spikeRoutes.get("/spike/options", getOptions);
spikeRoutes.post("/spike/run", assignRunId, spikeUpload, runSpike);
