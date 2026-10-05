import { config } from "../config.js";
import {
  MAX_ADDITIONAL_INSTRUCTIONS_LENGTH,
  MODIFICATION_TYPES,
  PART_REFERENCE_FIELD,
  VIEWS,
  WRAP_FINISHES
} from "../constants.js";
import { getProvider } from "../providers/index.js";
import { HttpError } from "./httpError.js";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates the multipart request for POST /api/spike/run.
 * Throws HttpError (400/501) on invalid input; returns normalized run input otherwise.
 */
export function validateSpikeRequest(req) {
  const body = req.body ?? {};
  const uploaded = req.files ?? {};
  const warnings = [];

  const missingViews = VIEWS.filter((view) => !uploaded[view.key]?.[0]);
  if (missingViews.length > 0) {
    throw new HttpError(400, `Missing required vehicle image(s): ${missingViews.map((view) => view.label).join(", ")}.`, {
      missingViews: missingViews.map((view) => view.key)
    });
  }

  const providerId = (text(body.provider) || config.defaultProvider).toLowerCase();
  const provider = getProvider(providerId);
  if (!provider) {
    throw new HttpError(400, `Unknown provider "${providerId}".`);
  }
  if (!provider.implemented) {
    throw new HttpError(501, `Provider "${providerId}" is not implemented yet. Use "mock" until the real integration is built.`);
  }
  if (!provider.isConfigured()) {
    throw new HttpError(400, `Provider "${providerId}" is not configured. Check the backend .env.`);
  }

  const modificationType = text(body.modificationType);
  const modification = MODIFICATION_TYPES[modificationType];
  if (!modification) {
    throw new HttpError(400, `Invalid modificationType "${modificationType}". Expected one of: ${Object.keys(MODIFICATION_TYPES).join(", ")}.`);
  }

  const settings = {
    wrapColor: null,
    wrapColorName: null,
    wrapFinish: null,
    additionalInstructions: text(body.additionalInstructions) || null
  };

  if (modification.wrap) {
    settings.wrapColor = text(body.wrapColor).toUpperCase();
    settings.wrapColorName = text(body.wrapColorName).slice(0, 60) || null;
    settings.wrapFinish = text(body.wrapFinish).toLowerCase();

    if (!HEX_COLOR.test(settings.wrapColor)) {
      throw new HttpError(400, "wrapColor is required for wrap modifications and must be a hex color like #1A2B3C.");
    }
    if (!WRAP_FINISHES.includes(settings.wrapFinish)) {
      throw new HttpError(400, `wrapFinish must be one of: ${WRAP_FINISHES.join(", ")}.`);
    }
  } else if (text(body.wrapColor) || text(body.wrapFinish)) {
    warnings.push("Wrap settings were ignored because the selected modification type has no wrap.");
  }

  if (settings.additionalInstructions && settings.additionalInstructions.length > MAX_ADDITIONAL_INSTRUCTIONS_LENGTH) {
    throw new HttpError(400, `additionalInstructions must be at most ${MAX_ADDITIONAL_INSTRUCTIONS_LENGTH} characters.`);
  }

  let partReference = uploaded[PART_REFERENCE_FIELD]?.[0] ?? null;
  if (partReference && !modification.part) {
    warnings.push("The part reference image was ignored because the selected modification type does not replace a part.");
    partReference = null;
  }

  return {
    provider,
    modificationType,
    settings,
    viewFiles: Object.fromEntries(VIEWS.map((view) => [view.key, uploaded[view.key][0]])),
    partReference,
    warnings
  };
}
