# drivework-ai-spike-backend

Express backend for the DriveWork AI **multi-view consistency feasibility spike** (internal, 1–2 days).
It accepts four views of one real vehicle plus a structured modification, runs each view through an
image-editing provider behind a common interface, and serves the originals and results for
Before/After evaluation in the separate frontend project.

No database, no auth. Inputs go to `uploads/<runId>/`, results and a `run.json` record to `outputs/<runId>/`.

## Run

```bash
cd drivework-ai-spike-backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
npm run dev               # http://localhost:5000 (auto-restarts on source changes)
```

Requires Node.js 20.12+. With the backend running, `npm run smoke` exercises every endpoint and the main validation paths with generated images.

## Environment (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin(s), comma-separated |
| `MAX_UPLOAD_MB` | `20` | Per-file upload limit |
| `AI_PROVIDER` | `mock` | Provider used when the request does not specify one |
| `MOCK_DELAY_MS` | `400` | Artificial per-view latency for the mock |
| `MOCK_FAIL_VIEWS` | _(empty)_ | e.g. `rear,frontLeft` — mock fails those views (tests error display) |
| `GEMINI_API_KEY` | _(empty)_ | Google AI Studio key. Image output requires a **paid tier** key |
| `GEMINI_MODEL` | `gemini-3.1-flash-image` | Or `gemini-3-pro-image` / `gemini-3.1-flash-lite-image` |
| `GEMINI_IMAGE_SIZE` | _(empty)_ | Optional `512`/`1K`/`2K`/`4K`. Empty means the output matches the input image size |
| `GEMINI_MAX_RETRIES` | `0` | SDK retries per view. Each retry honors Retry-After (~60 s on 429) |
| `QWEN_*`, `FLUX_*` | _(empty)_ | Reserved for real providers — not implemented yet |

`npm run dev` restarts automatically when `src/` or `.env` changes.

### Gemini notes
- Uses the official `@google/genai` SDK and the Interactions API (`client.interactions.create`), checked against the official docs on 2026-10-05.
- **Input order:** the vehicle view goes first, then the optional part reference, then the prompt.
- Sent with `store: false`, so the photos are not kept server-side for later retrieval.
- The API reports **token usage**, not money. Tokens are shown in the benchmark, and `estimatedCost` stays `null`.

AI API keys live **only** in this `.env`. The frontend never sees them.

## Deploying to Vercel

There's no `vercel.json` and no build step. Vercel's Express support detects `src/app.js`, which default-exports the app.

- `src/app.js` exports the app as its default export. Vercel provides the HTTP server, so `app.listen()` is never called there.
- `src/server.js` is the local entry point only. It calls `app.listen()`.
- When `VERCEL` is set, uploads and outputs go to `/tmp/drivework-spike/`, because the deployment directory is read-only. Locally they go to `uploads/` and `outputs/`.
- AI providers and the Gemini SDK load lazily on first use. `/api/health` works even with no AI keys.

Set these in **Vercel → Project Settings → Environment Variables**:
- `CORS_ORIGIN`: the deployed frontend URL. Comma-separate it with `http://localhost:5173` if you still want local dev to work.
- `AI_PROVIDER`
- `GEMINI_API_KEY` and `GEMINI_MODEL`
- Optionally `MAX_UPLOAD_MB`, `GEMINI_IMAGE_SIZE` and `GEMINI_MAX_RETRIES`

`PORT` isn't needed.

Health check: `https://<your-backend-project>.vercel.app/api/health`

### Vercel limitations for this spike
- **4.5 MB request body limit.** Four full-size car photos plus a reference will usually exceed it, and Vercel returns `413 FUNCTION_PAYLOAD_TOO_LARGE`. Images must be downscaled or compressed before upload.
- **`/tmp` is per-instance and temporary.** A later request for `/outputs/...` can land on a different instance and get a 404. Durable result URLs would need object storage such as Vercel Blob.
- **Function duration.** One run makes four sequential provider calls. If runs time out, raise `maxDuration` for the function.

## API

### `GET /api/health`
```json
{ "status": "ok", "service": "drivework-ai-spike-backend", "defaultProvider": "mock", "timestamp": "..." }
```

### `GET /api/providers`
```json
{
  "defaultProvider": "mock",
  "providers": [
    { "id": "mock", "displayName": "Mock (copies original)", "model": "mock-passthrough", "implemented": true, "configured": true },
    { "id": "gemini", "displayName": "Google Gemini", "model": null, "implemented": false, "configured": false }
  ]
}
```

### `GET /api/spike/options`
Views, modification types and wrap finishes the backend accepts.

### `POST /api/spike/run` — `multipart/form-data`

| Field | Required | Notes |
| --- | --- | --- |
| `front`, `rear`, `frontLeft`, `rearRight` | yes | JPEG/PNG/WebP. Front, Rear, 3/4 Front-Left, 3/4 Rear-Right |
| `partReference` | no | Image of the part. Used for bumper/hood types, ignored (with a warning) for wrap-only |
| `provider` | no | `mock` \| `gemini` \| `qwen` \| `flux` (defaults to `AI_PROVIDER`) |
| `modificationType` | yes | `front_bumper` \| `hood` \| `solid_color_wrap` \| `front_bumper_wrap` \| `hood_wrap` |
| `wrapColor` | for wrap types | Hex `#RRGGBB` |
| `wrapColorName` | no | Human-readable color name, used in the prompt |
| `wrapFinish` | for wrap types | `gloss` \| `matte` \| `metallic` |
| `additionalInstructions` | no | ≤ 2000 chars, appended to the generated prompt |

Responses:

- `200`: the run completed. Check `success`, because individual views can fail without failing the whole request.
- `400`: invalid input, for example missing views, a bad color or a non-image file.
- `501`: the provider is not implemented.

```json
{
  "runId": "run_20261005T114209_ba81ff",
  "timestamp": "2026-10-05T11:42:09.112Z",
  "completedAt": "2026-10-05T11:42:10.770Z",
  "success": true,
  "error": null,
  "provider": "mock",
  "providerName": "Mock (copies original)",
  "model": "mock-passthrough",
  "modificationType": "front_bumper_wrap",
  "modificationLabel": "Front Bumper + Wrap",
  "settings": {
    "wrapColor": "#B3121B", "wrapColorName": "Racing Red", "wrapFinish": "matte",
    "additionalInstructions": null, "partReferenceUrl": "/uploads/run_.../partReference.jpg"
  },
  "totalProcessingTimeMs": 1652,
  "estimatedCost": null,
  "warnings": [],
  "views": [
    {
      "view": "front", "label": "Front", "success": true,
      "originalUrl": "/uploads/run_.../front.jpg", "resultUrl": "/outputs/run_.../front.jpg",
      "processingTimeMs": 417, "estimatedCost": null, "model": "mock-passthrough", "error": null,
      "prompt": "This image shows a real vehicle photographed from a straight-on front view. ..."
    }
  ]
}
```

URLs are relative to the backend base URL. Static files are served from `/uploads/*` and `/outputs/*`.
`processingTimeMs` is measured by the backend around each provider call. `estimatedCost` is `null` unless a provider genuinely reports a cost. The run total is only set when every view reports one.

### curl example
```bash
curl -F front=@front.jpg -F rear=@rear.jpg -F frontLeft=@fl.jpg -F rearRight=@rr.jpg \
     -F partReference=@bumper.jpg -F modificationType=front_bumper_wrap \
     -F wrapColor=#6E7175 -F wrapColorName="Nardo Grey" -F wrapFinish=matte \
     -F provider=mock http://localhost:5000/api/spike/run
```

## Structure

```
src/
  server.js / app.js            Express setup, CORS, static files, error handling
  config.js / constants.js      env config; views, modification types, finishes
  routes/ controllers/          HTTP layer
  services/spikeService.js      runs the 4 views through a provider, writes run.json
  prompts/promptBuilder.js      structured, view-aware instructions per modification type
  providers/
    BaseImageProvider.js        contract + timing/normalization (run → normalized result)
    MockProvider.js             copies input to output (no credentials needed)
    GeminiProvider.js           stub — not implemented
    QwenProvider.js             stub — not implemented
    FluxProvider.js             stub — not implemented
    index.js                    provider registry
  utils/                        multer upload config, validation, run IDs, HttpError
scripts/smoke-test.js           backend-only smoke test
```

## Adding a real provider

1. Verify the provider's **current official docs** first: SDK or endpoint, model ID, request/response schema, multi-image support and pricing. Don't guess any of these.
2. Implement `editImage({ imagePath, referenceImagePath, modificationType, settings, prompt, view, outputDir, outputName })`.
   It must write the result into `outputDir` and return `{ outputPath, estimatedCost?, model? }`.
3. Make `implemented` return `true`, and have `isConfigured()` check the required env vars.

`BaseImageProvider.run()` handles timing, error capture and the normalized result shape.
