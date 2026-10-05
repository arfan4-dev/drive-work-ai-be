// The four camera views every run must contain. Keys are the multipart field names.
export const VIEWS = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "frontLeft", label: "3/4 Front-Left" },
  { key: "rearRight", label: "3/4 Rear-Right" }
];

// part: which physical part is replaced (null = none), wrap: whether a color wrap is applied.
export const MODIFICATION_TYPES = {
  front_bumper: { label: "Front Bumper", part: "front_bumper", wrap: false },
  hood: { label: "Hood", part: "hood", wrap: false },
  solid_color_wrap: { label: "Solid Color Wrap", part: null, wrap: true },
  front_bumper_wrap: { label: "Front Bumper + Wrap", part: "front_bumper", wrap: true },
  hood_wrap: { label: "Hood + Wrap", part: "hood", wrap: true }
};

export const WRAP_FINISHES = ["gloss", "matte", "metallic"];

export const PART_REFERENCE_FIELD = "partReference";

export const MAX_ADDITIONAL_INSTRUCTIONS_LENGTH = 2000;
