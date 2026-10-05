import { performance } from "node:perf_hooks";

/**
 * Common contract for all image-editing providers.
 *
 * Subclasses implement editImage(params) and return { outputPath, estimatedCost?, model? }.
 * Callers use run(params), which measures processing time on the backend and always
 * resolves to the normalized result shape (it never throws):
 *
 *   {
 *     success: true,
 *     outputPath: "...",
 *     processingTimeMs: 42000,
 *     estimatedCost: null,    // only a number when the provider genuinely reports/derives it
 *     provider: "mock",
 *     model: "...",           // null when not actually known
 *     usage: null,            // provider-reported token usage, e.g. { inputTokens, outputTokens, ... }
 *     error: null
 *   }
 */
export class BaseImageProvider {
  constructor({ id, displayName, model = null }) {
    this.id = id;
    this.displayName = displayName;
    this.model = model;
  }

  // Set to true only once the adapter has been built against verified official docs.
  get implemented() {
    return false;
  }

  // Whether the required credentials/config are present in the backend .env.
  isConfigured() {
    return false;
  }

  getInfo() {
    return {
      id: this.id,
      displayName: this.displayName,
      model: this.model,
      implemented: this.implemented,
      configured: this.isConfigured()
    };
  }

  /**
   * @param {object} params
   * @param {string} params.imagePath           Absolute path of the original view image.
   * @param {string|null} params.referenceImagePath Absolute path of the optional part reference image.
   * @param {string} params.modificationType    One of MODIFICATION_TYPES keys.
   * @param {object} params.settings            { wrapColor, wrapColorName, wrapFinish, additionalInstructions }
   * @param {string} params.prompt              Instruction text from the prompt builder.
   * @param {string} params.view                View key (front, rear, frontLeft, rearRight).
   * @param {string} params.outputDir           Directory the result must be written to.
   * @param {string} params.outputName          File name (without extension) for the result.
   */
  async editImage(params) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.editImage() is not implemented.`);
  }

  async run(params) {
    const startedAt = performance.now();
    try {
      const result = await this.editImage(params);
      return {
        success: true,
        outputPath: result.outputPath,
        processingTimeMs: Math.round(performance.now() - startedAt),
        estimatedCost: typeof result.estimatedCost === "number" ? result.estimatedCost : null,
        provider: this.id,
        model: result.model ?? this.model,
        usage: result.usage ?? null,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        outputPath: null,
        processingTimeMs: Math.round(performance.now() - startedAt),
        estimatedCost: null,
        provider: this.id,
        model: this.model,
        usage: null,
        error: error?.message || String(error)
      };
    }
  }
}
