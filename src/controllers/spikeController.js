import { config } from "../config.js";
import { MODIFICATION_TYPES, VIEWS, WRAP_FINISHES } from "../constants.js";
import { listProviders } from "../providers/index.js";
import { runSpikeJob } from "../services/spikeService.js";
import { validateSpikeRequest } from "../utils/validateSpikeRequest.js";

export function getProviders(req, res) {
  res.json({ defaultProvider: config.defaultProvider, providers: listProviders() });
}

export function getOptions(req, res) {
  res.json({
    views: VIEWS,
    modificationTypes: Object.entries(MODIFICATION_TYPES).map(([value, type]) => ({ value, ...type })),
    wrapFinishes: WRAP_FINISHES
  });
}

export async function runSpike(req, res) {
  const input = validateSpikeRequest(req);
  // From here on the uploads belong to a run and must not be cleaned up on error.
  req.runStarted = true;
  const run = await runSpikeJob({ runId: req.runId, ...input });
  res.json(run);
}
