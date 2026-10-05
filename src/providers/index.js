import { FluxProvider } from "./FluxProvider.js";
import { GeminiProvider } from "./GeminiProvider.js";
import { MockProvider } from "./MockProvider.js";
import { QwenProvider } from "./QwenProvider.js";

// Providers are created on first use, never at startup, so a missing or broken provider
// configuration cannot crash the app (e.g. /api/health on a cold start).
const PROVIDER_FACTORIES = {
  mock: () => new MockProvider(),
  gemini: () => new GeminiProvider(),
  qwen: () => new QwenProvider(),
  flux: () => new FluxProvider()
};

const instances = new Map();

export function getProvider(id) {
  const factory = PROVIDER_FACTORIES[id];
  if (!factory) return null;
  if (!instances.has(id)) {
    instances.set(id, factory());
  }
  return instances.get(id);
}

export function listProviders() {
  return Object.keys(PROVIDER_FACTORIES).map((id) => getProvider(id).getInfo());
}
