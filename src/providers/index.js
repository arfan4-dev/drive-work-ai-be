import { FluxProvider } from "./FluxProvider.js";
import { GeminiProvider } from "./GeminiProvider.js";
import { MockProvider } from "./MockProvider.js";
import { QwenProvider } from "./QwenProvider.js";

const providers = new Map(
  [new MockProvider(), new GeminiProvider(), new QwenProvider(), new FluxProvider()].map((provider) => [provider.id, provider])
);

export function getProvider(id) {
  return providers.get(id) ?? null;
}

export function listProviders() {
  return [...providers.values()].map((provider) => provider.getInfo());
}
