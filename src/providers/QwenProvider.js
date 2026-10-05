import { BaseImageProvider } from "./BaseImageProvider.js";

/**
 * Qwen image editing adapter - STUB.
 *
 * Before implementing, verify against CURRENT official documentation:
 *  - which hosting/API to use for the Qwen image-edit model and its auth method
 *  - exact model ID and whether it accepts a second (reference) image
 *  - request/response schemas (sync vs. async task polling, how output images are returned)
 *  - pricing / whether usage or cost is reported (never fabricate cost)
 *
 * Do not guess any of the above. Model comes from QWEN_MODEL in .env.
 */
export class QwenProvider extends BaseImageProvider {
  constructor() {
    super({ id: "qwen", displayName: "Qwen Image Edit", model: process.env.QWEN_MODEL || null });
  }

  isConfigured() {
    return Boolean(process.env.QWEN_API_KEY && process.env.QWEN_MODEL);
  }

  async editImage() {
    throw new Error("QwenProvider is not implemented yet. Integrate it after verifying the current official documentation.");
  }
}
