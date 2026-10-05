import { BaseImageProvider } from "./BaseImageProvider.js";

/**
 * FLUX (Black Forest Labs) image editing adapter - STUB.
 *
 * Before implementing, verify against CURRENT official documentation:
 *  - API base URL, auth header and which FLUX model/endpoint supports image editing
 *  - whether multiple input images (view + part reference) are supported, and how
 *  - request/response schemas (async task submission + polling, result URL expiry)
 *  - pricing / whether cost is reported (never fabricate cost)
 *
 * Do not guess any of the above. Model comes from FLUX_MODEL in .env.
 */
export class FluxProvider extends BaseImageProvider {
  constructor() {
    super({ id: "flux", displayName: "FLUX", model: process.env.FLUX_MODEL || null });
  }

  isConfigured() {
    return Boolean(process.env.FLUX_API_KEY && process.env.FLUX_MODEL);
  }

  async editImage() {
    throw new Error("FluxProvider is not implemented yet. Integrate it after verifying the current official documentation.");
  }
}
