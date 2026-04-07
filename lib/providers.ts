export interface ProviderConfig {
  baseUrl: string;
  authHeader: (apiKey: string) => Record<string, string>;
  apiKeyEnv: string;
}

const providers: Record<string, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    apiKeyEnv: "OPENAI_API_KEY",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    authHeader: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    authHeader: (key) => ({ "x-goog-api-key": key }),
    apiKeyEnv: "GOOGLE_API_KEY",
  },
};

export function getProvider(name: string): ProviderConfig {
  const provider = providers[name.toLowerCase()];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}. Supported: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}
