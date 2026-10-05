// Backend-only smoke test. Start the backend first (npm run dev), then: npm run smoke
// Uses tiny generated PNGs, so no sample photos or AI credentials are needed.

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:5000";

// 1x1 PNG
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const VIEW_FIELDS = ["front", "rear", "frontLeft", "rearRight"];

let failures = 0;

function check(name, condition, info = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`);
  if (!condition) failures += 1;
}

function buildForm({ views = VIEW_FIELDS, partReference = false, fields = {} } = {}) {
  const form = new FormData();
  for (const view of views) {
    form.append(view, new Blob([PNG_BYTES], { type: "image/png" }), `${view}.png`);
  }
  if (partReference) {
    form.append("partReference", new Blob([PNG_BYTES], { type: "image/png" }), "part.png");
  }
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return form;
}

async function postRun(form) {
  const response = await fetch(`${BASE_URL}/api/spike/run`, { method: "POST", body: form });
  return { status: response.status, body: await response.json() };
}

const health = await fetch(`${BASE_URL}/api/health`).then((response) => response.json());
check("GET /api/health", health.status === "ok", JSON.stringify(health));

const providers = await fetch(`${BASE_URL}/api/providers`).then((response) => response.json());
check("GET /api/providers lists mock", providers.providers.some((provider) => provider.id === "mock" && provider.implemented));

const bumper = await postRun(
  buildForm({ partReference: true, fields: { provider: "mock", modificationType: "front_bumper", additionalInstructions: "Carbon fiber lip." } })
);
check("Front Bumper run succeeds", bumper.status === 200 && bumper.body.success, `status ${bumper.status}`);
check("Front Bumper run returns 4 views", bumper.body.views?.length === 4);
check("Part reference URL returned", Boolean(bumper.body.settings?.partReferenceUrl));
check("Processing time measured", typeof bumper.body.totalProcessingTimeMs === "number");
check("Cost is null for mock (not fabricated)", bumper.body.estimatedCost === null);

const resultImage = await fetch(`${BASE_URL}${bumper.body.views[0].resultUrl}`);
check("Output image is served", resultImage.ok && resultImage.headers.get("content-type") === "image/png");
const originalImage = await fetch(`${BASE_URL}${bumper.body.views[0].originalUrl}`);
check("Original image is served", originalImage.ok);

const combo = await postRun(
  buildForm({
    partReference: true,
    fields: { modificationType: "hood_wrap", wrapColor: "#6e7175", wrapColorName: "Nardo Grey", wrapFinish: "matte" }
  })
);
check("Hood + Wrap run succeeds (default provider)", combo.status === 200 && combo.body.success, `status ${combo.status}`);
check("Wrap color normalized", combo.body.settings?.wrapColor === "#6E7175");
check("Prompt mentions wrap and hood", /Nardo Grey/.test(combo.body.views?.[0]?.prompt) && /hood/.test(combo.body.views?.[0]?.prompt));

const missing = await postRun(buildForm({ views: ["front", "rear"], fields: { modificationType: "hood" } }));
check("Missing views rejected with 400", missing.status === 400, missing.body.error);

const noColor = await postRun(buildForm({ fields: { modificationType: "solid_color_wrap", wrapFinish: "gloss" } }));
check("Wrap without color rejected with 400", noColor.status === 400, noColor.body.error);

const badType = await postRun(buildForm({ fields: { modificationType: "spoiler" } }));
check("Unknown modification type rejected with 400", badType.status === 400, badType.body.error);

const stub = await postRun(buildForm({ fields: { provider: "qwen", modificationType: "hood" } }));
check("Unimplemented provider rejected with 501", stub.status === 501, stub.body.error);

const wrongType = new FormData();
wrongType.append("front", new Blob(["hello"], { type: "text/plain" }), "front.txt");
const wrongTypeResult = await postRun(wrongType);
check("Non-image upload rejected with 400", wrongTypeResult.status === 400, wrongTypeResult.body.error);

console.log(failures === 0 ? "\nAll smoke checks passed." : `\n${failures} smoke check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
