import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config } from "../config.js";
import { BaseImageProvider } from "./BaseImageProvider.js";

/**
 * Copies the original image to the output folder and returns it as the "generated" result.
 * Used to validate upload -> backend -> provider abstraction -> outputs -> frontend comparison
 * without any AI credentials.
 */
export class MockProvider extends BaseImageProvider {
  constructor() {
    super({ id: "mock", displayName: "Mock (copies original)", model: "mock-passthrough" });
  }

  get implemented() {
    return true;
  }

  isConfigured() {
    return true;
  }

  async editImage({ imagePath, view, outputDir, outputName }) {
    if (config.mock.delayMs > 0) {
      await sleep(config.mock.delayMs);
    }

    if (config.mock.failViews.includes(view)) {
      throw new Error(`Simulated failure for view "${view}" (MOCK_FAIL_VIEWS).`);
    }

    const outputPath = path.join(outputDir, `${outputName}${path.extname(imagePath)}`);
    await fs.copyFile(imagePath, outputPath);

    return { outputPath, estimatedCost: null };
  }
}
