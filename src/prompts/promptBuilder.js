import { MODIFICATION_TYPES } from "../constants.js";

const VIEW_DESCRIPTIONS = {
  front: "a straight-on front view",
  rear: "a straight-on rear view",
  frontLeft: "a three-quarter front-left view",
  rearRight: "a three-quarter rear-right view"
};

// visibility per view: "primary" = clearly visible, "partial" = edge/corner only, "hidden" = usually not visible.
const PARTS = {
  front_bumper: {
    name: "front bumper",
    protectedAreas:
      "headlights, grille, hood, fenders, wheels, windows, mirrors, badges, vehicle proportions, existing aftermarket modifications, or background",
    visibility: { front: "primary", frontLeft: "primary", rearRight: "partial", rear: "hidden" }
  },
  hood: {
    name: "hood",
    protectedAreas:
      "headlights, grille, front bumper, fenders, windshield, wheels, windows, mirrors, badges, vehicle proportions, existing aftermarket modifications, or background",
    visibility: { front: "primary", frontLeft: "primary", rearRight: "partial", rear: "hidden" }
  }
};

const FINISH_DESCRIPTIONS = {
  gloss: "gloss finish (smooth, high-shine clear coat with sharp reflections)",
  matte: "matte finish (flat, low-sheen surface with soft, diffused highlights and no glossy reflections)",
  metallic: "metallic finish (fine metallic flake with bright, sparkling highlights)"
};

function describeColor({ wrapColor, wrapColorName }) {
  return wrapColorName ? `${wrapColorName} (hex ${wrapColor})` : `the color with hex code ${wrapColor}`;
}

function buildPartInstructions(part, { view, hasReferenceImage, combinedWithWrap }) {
  const lines = [];

  if (hasReferenceImage) {
    lines.push(`Apply the reference ${part.name} shown in the second image to this vehicle.`);
  } else {
    lines.push(`Replace the ${part.name} of this vehicle with a new aftermarket ${part.name} that fits this exact vehicle.`);
  }

  lines.push("Preserve the exact identity of the original vehicle.");
  lines.push(`Only modify the intended ${part.name} region.`);
  lines.push(`Do not unnecessarily modify the ${part.protectedAreas}.`);

  if (hasReferenceImage) {
    lines.push(
      `The installed ${part.name} should match the reference part and maintain the same design, shape, proportions, material and finish across the relevant views.`
    );
  } else {
    lines.push(
      `The installed ${part.name} should maintain the same design, shape, proportions, material and finish across the relevant views.`
    );
  }

  const visibility = part.visibility[view];
  if (visibility === "partial") {
    lines.push(
      `From this angle the ${part.name} is only partially visible. Modify only the visible portion of the ${part.name} and do not invent hidden geometry.`
    );
  } else if (visibility === "hidden") {
    lines.push(
      `The ${part.name} is normally not visible from this angle. If it is not visible, do not add or change it${
        combinedWithWrap ? "" : " and return the vehicle unchanged"
      }.`
    );
  }

  return lines;
}

function buildWrapInstructions(settings, { part }) {
  const lines = [
    `Change only the painted vehicle body panels to ${describeColor(settings)} with a ${FINISH_DESCRIPTIONS[settings.wrapFinish]}.`,
    "Preserve the original vehicle geometry, reflections, lighting, windows, headlights, grille, wheels, badges, existing modifications and background.",
    "Do not recolor glass, lights, tires, wheels, unpainted trim or the background.",
    "Maintain the same wrap color and finish across all views."
  ];

  if (part) {
    lines.push(`Apply the same wrap color and finish to the new ${part.name} so it matches the rest of the body.`);
  }

  return lines;
}

/**
 * Builds the instruction text sent to the image-editing provider for one view.
 *
 * @param {object} params
 * @param {string} params.modificationType  One of MODIFICATION_TYPES keys.
 * @param {string} params.view              front | rear | frontLeft | rearRight
 * @param {object} params.settings          { wrapColor, wrapColorName, wrapFinish, additionalInstructions }
 * @param {boolean} params.hasReferenceImage Whether a part reference image is sent with the request.
 * @returns {string}
 */
export function buildPrompt({ modificationType, view, settings, hasReferenceImage }) {
  const modification = MODIFICATION_TYPES[modificationType];
  if (!modification) {
    throw new Error(`Unknown modification type: ${modificationType}`);
  }

  const part = modification.part ? PARTS[modification.part] : null;
  const sections = [`This image shows a real vehicle photographed from ${VIEW_DESCRIPTIONS[view]}.`];

  if (part && modification.wrap) {
    sections.push("Make exactly the following two changes and nothing else.");
  }

  if (part) {
    sections.push(buildPartInstructions(part, { view, hasReferenceImage, combinedWithWrap: modification.wrap }).join("\n"));
  }

  if (modification.wrap) {
    sections.push(buildWrapInstructions(settings, { part }).join("\n"));
  }

  if (settings.additionalInstructions) {
    sections.push(`Additional instructions:\n${settings.additionalInstructions}`);
  }

  sections.push(
    "Keep the same camera angle, framing, lighting and background. The result must look like an unedited photograph of the same real vehicle, without visible distortion or artifacts."
  );

  return sections.join("\n\n");
}
