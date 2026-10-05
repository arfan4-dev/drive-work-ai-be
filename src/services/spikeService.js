import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { config } from "../config.js";
import { MODIFICATION_TYPES, VIEWS } from "../constants.js";
import { buildPrompt } from "../prompts/promptBuilder.js";
import { outputUrl, uploadUrl } from "../utils/upload.js";

function sumCosts(views) {
  // Only report a total when every view reported a genuine cost - never fill gaps with guesses.
  const costs = views.map((view) => view.estimatedCost);
  return costs.every((cost) => typeof cost === "number") ? costs.reduce((total, cost) => total + cost, 0) : null;
}

function sumUsage(views) {
  // Provider-reported token usage summed across views; null when no view reported usage.
  const reported = views.map((view) => view.usage).filter(Boolean);
  if (reported.length === 0) return null;
  const total = {};
  for (const usage of reported) {
    for (const [key, value] of Object.entries(usage)) {
      if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
    }
  }
  return { ...total, viewsReported: reported.length };
}

/**
 * Runs one spike: sends each of the four views through the provider (sequentially, to keep
 * per-view timing clean and avoid rate limits), writes run.json next to the outputs and
 * returns the run record for the frontend.
 */
export async function runSpikeJob({ runId, provider, modificationType, settings, viewFiles, partReference, warnings }) {
  const startedAt = new Date();
  const startedAtMs = performance.now();
  const outputDir = path.join(config.outputsDir, runId);
  await fs.mkdir(outputDir, { recursive: true });

  const referenceImagePath = partReference?.path ?? null;
  const views = [];

  for (const view of VIEWS) {
    const imagePath = viewFiles[view.key].path;
    const prompt = buildPrompt({
      modificationType,
      view: view.key,
      settings,
      hasReferenceImage: Boolean(referenceImagePath)
    });

    const result = await provider.run({
      imagePath,
      referenceImagePath,
      modificationType,
      settings,
      prompt,
      view: view.key,
      outputDir,
      outputName: view.key
    });

    views.push({
      view: view.key,
      label: view.label,
      success: result.success,
      originalUrl: uploadUrl(runId, imagePath),
      resultUrl: result.success ? outputUrl(runId, result.outputPath) : null,
      processingTimeMs: result.processingTimeMs,
      estimatedCost: result.estimatedCost,
      model: result.model,
      usage: result.usage,
      error: result.error,
      prompt
    });
  }

  const failedViews = views.filter((view) => !view.success);
  const run = {
    runId,
    timestamp: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    success: failedViews.length === 0,
    error:
      failedViews.length === 0
        ? null
        : `${failedViews.length} of ${views.length} views failed: ${failedViews.map((view) => `${view.label}: ${view.error}`).join(" | ")}`,
    provider: provider.id,
    providerName: provider.displayName,
    model: provider.model,
    modificationType,
    modificationLabel: MODIFICATION_TYPES[modificationType].label,
    settings: {
      ...settings,
      partReferenceUrl: referenceImagePath ? uploadUrl(runId, referenceImagePath) : null
    },
    totalProcessingTimeMs: Math.round(performance.now() - startedAtMs),
    estimatedCost: sumCosts(views),
    usage: sumUsage(views),
    warnings,
    views
  };

  await fs.writeFile(path.join(outputDir, "run.json"), JSON.stringify(run, null, 2));
  return run;
}
