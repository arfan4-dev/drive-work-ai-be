import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { BaseImageProvider } from "./BaseImageProvider.js";

/**
 * Google Gemini image editing via the official @google/genai SDK and the Interactions API.
 *
 * Verified against the official docs (ai.google.dev/gemini-api/docs/generate-content/image-generation,
 * checked 2026-10-05):
 *  - client.interactions.create({ model, input: [{ type: "image", mime_type, data }, ..., { type: "text", text }] })
 *  - edited image is returned as interaction.output_image (or an image block in a model_output step), base64
 *  - without response_format.aspect_ratio the output matches the input image size, so the vehicle
 *    view is sent FIRST and the part reference second
 *  - usage is reported as token counts (interaction.usage); the API does not return a monetary cost
 *  - image output is not available on the free tier (paid tier required)
 *
 * Model comes from GEMINI_MODEL, e.g. gemini-3.1-flash-image or gemini-3-pro-image.
 */

const MIME_TYPE_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

async function toImageContent(filePath) {
  const mimeType = MIME_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported image type for Gemini: ${path.basename(filePath)}`);
  }
  const data = await fs.readFile(filePath, { encoding: "base64" });
  return { type: "image", mime_type: mimeType, data };
}

function findOutputImage(interaction) {
  if (interaction.output_image?.data) {
    return interaction.output_image;
  }
  const outputSteps = (interaction.steps ?? []).filter((step) => step.type === "model_output");
  for (const step of outputSteps.reverse()) {
    const image = [...(step.content ?? [])].reverse().find((block) => block.type === "image" && block.data);
    if (image) return image;
  }
  return null;
}

// SDK errors carry the useful API message in error.body (JSON string, sometimes wrapped in an array).
function describeApiError(error) {
  const status = error?.statusCode ?? error?.status;
  try {
    const parsed = typeof error?.body === "string" ? JSON.parse(error.body) : error?.body;
    const apiError = (Array.isArray(parsed) ? parsed[0] : parsed)?.error;
    if (apiError?.message) {
      const message = `Gemini API ${status ?? apiError.code} ${apiError.status ?? ""}: ${apiError.message}`.replace(/\s+:/, ":");
      // Image models have zero quota on the free tier - point at the actual fix.
      return /limit: 0\b.*free tier/i.test(apiError.message)
        ? `${message} → This API key is on the free tier, which has no quota for image models. Enable billing for the key's project in Google AI Studio.`
        : message;
    }
  } catch {
    // fall through to the SDK message
  }
  return error?.message || String(error);
}

function normalizeUsage(usage) {
  if (!usage) return null;
  return {
    inputTokens: usage.total_input_tokens ?? null,
    outputTokens: usage.total_output_tokens ?? null,
    thoughtTokens: usage.total_thought_tokens ?? null,
    totalTokens: usage.total_tokens ?? null
  };
}

export class GeminiProvider extends BaseImageProvider {
  constructor() {
    super({ id: "gemini", displayName: "Google Gemini", model: process.env.GEMINI_MODEL || null });
    this.client = null;
  }

  get implemented() {
    return true;
  }

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);
  }

  // The SDK is loaded and the client created only when a Gemini run actually happens.
  async getClient() {
    if (!this.client) {
      const { GoogleGenAI } = await import("@google/genai");
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  async editImage({ imagePath, referenceImagePath, prompt, outputDir, outputName }) {
    const input = [await toImageContent(imagePath)];
    if (referenceImagePath) {
      input.push(await toImageContent(referenceImagePath));
    }
    input.push({ type: "text", text: prompt });

    const request = {
      model: this.model,
      input,
      // Each view is an independent, stateless edit - don't keep the car photos server-side.
      store: false
    };
    const responseFormat = { type: "image" };
    if (process.env.GEMINI_IMAGE_SIZE) {
      responseFormat.image_size = process.env.GEMINI_IMAGE_SIZE;
    }
    if (config.resultDelivery === "inline") {
      // Results travel inside the JSON response (4.5 MB limit on Vercel) - JPEG keeps them small.
      responseFormat.mime_type = "image/jpeg";
    }
    if (Object.keys(responseFormat).length > 1) {
      request.response_format = responseFormat;
    }

    let interaction;
    try {
      // SDK retries honor the server's Retry-After (~60 s on 429), so retries are off by default:
      // a failed view should show up immediately in the benchmark rather than stall the run.
      const client = await this.getClient();
      interaction = await client.interactions.create(request, {
        maxRetries: Number(process.env.GEMINI_MAX_RETRIES ?? 0)
      });
    } catch (error) {
      throw new Error(describeApiError(error));
    }

    const image = findOutputImage(interaction);
    if (!image) {
      const modelText = interaction.output_text?.trim();
      throw new Error(`Gemini returned no image${modelText ? `. Model said: ${modelText}` : "."}`);
    }

    const extension = EXTENSION_BY_MIME_TYPE[image.mime_type] ?? ".png";
    const outputPath = path.join(outputDir, `${outputName}${extension}`);
    await fs.writeFile(outputPath, Buffer.from(image.data, "base64"));

    return {
      outputPath,
      // The API reports tokens, not money. Cost stays null rather than being estimated here.
      estimatedCost: null,
      model: interaction.model || this.model,
      usage: normalizeUsage(interaction.usage)
    };
  }
}
