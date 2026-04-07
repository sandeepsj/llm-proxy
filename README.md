# LLM Proxy

A centralized Vercel serverless proxy for calling LLM APIs (OpenAI, Anthropic, Google/Gemini). Use this from any frontend or backend project so each project doesn't need its own LLM backend or expose API keys.

**Base URL:** `https://llm-proxy-smoky.vercel.app`

---

## Authentication

### From Frontend (Google OAuth)

Send the user's Google access token in the `Authorization` header. The proxy validates it with Google and checks the email against the allowlist.

```
Authorization: Bearer <google_access_token>
```

### From Backend (Shared Secret)

If `PROXY_SECRET` is configured, send it as a bearer token. This skips Google auth and the email check.

```
Authorization: Bearer <proxy_secret>
```

---

## API

### `POST /api/proxy`

Single endpoint for all LLM calls.

#### Request Body

```json
{
  "provider": "openai" | "anthropic" | "google",
  "endpoint": "<provider-specific API path>",
  "body": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `provider` | string | `"openai"`, `"anthropic"`, or `"google"` |
| `endpoint` | string | API path relative to the provider's base URL |
| `body` | object | Request payload in the format the provider expects |

The proxy forwards `body` as-is to `{provider_base_url}/{endpoint}`. You construct the body in whatever format the provider's API requires.

#### Response

The provider's response is returned as-is (JSON, binary, or streamed).

---

## Examples

### OpenAI Chat Completion

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "openai",
    endpoint: "chat/completions",
    body: {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }],
    },
  }),
});

const data = await res.json();
console.log(data.choices[0].message.content);
```

### Anthropic Chat

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "anthropic",
    endpoint: "messages",
    body: {
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello!" }],
    },
  }),
});

const data = await res.json();
console.log(data.content[0].text);
```

### Google Gemini Chat

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "google",
    endpoint: "models/gemini-2.0-flash:generateContent",
    body: {
      contents: [{ parts: [{ text: "Hello!" }] }],
    },
  }),
});

const data = await res.json();
console.log(data.candidates[0].content.parts[0].text);
```

### OpenAI Embeddings

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "openai",
    endpoint: "embeddings",
    body: {
      model: "text-embedding-3-small",
      input: "Some text to embed",
    },
  }),
});

const data = await res.json();
console.log(data.data[0].embedding);
```

### Google Gemini Embeddings

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "google",
    endpoint: "models/text-embedding-004:embedContent",
    body: {
      content: { parts: [{ text: "Some text to embed" }] },
    },
  }),
});

const data = await res.json();
console.log(data.embedding.values);
```

### OpenAI Image Generation

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "openai",
    endpoint: "images/generations",
    body: {
      model: "dall-e-3",
      prompt: "A cat riding a bicycle",
      n: 1,
      size: "1024x1024",
    },
  }),
});

const data = await res.json();
console.log(data.data[0].url);
```

### OpenAI Text-to-Speech

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "openai",
    endpoint: "audio/speech",
    body: {
      model: "tts-1",
      input: "Hello, how are you?",
      voice: "alloy",
    },
  }),
});

// Response is audio binary
const audioBlob = await res.blob();
```

### Streaming

Add `"stream": true` in the body. The proxy streams the response back as server-sent events.

```ts
const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${googleAccessToken}`,
  },
  body: JSON.stringify({
    provider: "openai",
    endpoint: "chat/completions",
    body: {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Write a poem" }],
      stream: true,
    },
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

---

## Quick Reference: Provider Endpoints

| Use Case | Provider | `endpoint` | Key `body` fields |
|---|---|---|---|
| Chat | `openai` | `chat/completions` | `model`, `messages` |
| Chat | `anthropic` | `messages` | `model`, `max_tokens`, `messages` |
| Chat | `google` | `models/{model}:generateContent` | `contents` |
| Embeddings | `openai` | `embeddings` | `model`, `input` |
| Embeddings | `google` | `models/{model}:embedContent` | `content` |
| Image Gen | `openai` | `images/generations` | `model`, `prompt`, `n`, `size` |
| TTS | `openai` | `audio/speech` | `model`, `input`, `voice` |
| STT | `openai` | `audio/transcriptions` | `model`, `file` |

---

## Error Responses

| Status | Meaning |
|---|---|
| 401 | Invalid/expired token, unverified email |
| 403 | Email not in allowlist |
| 400 | Missing `provider`, `endpoint`, or `body` |
| 405 | Not a POST request |
| 500 | Provider API key not configured / upstream error |

Error body format:

```json
{
  "error": "description of what went wrong"
}
```

---

## Helper Function

Drop this into any project for convenience:

```ts
async function llmProxy(
  provider: "openai" | "anthropic" | "google",
  endpoint: string,
  body: Record<string, unknown>,
  token: string
) {
  const res = await fetch("https://llm-proxy-smoky.vercel.app/api/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ provider, endpoint, body }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }

  return res;
}

// Usage
const data = await llmProxy(
  "openai",
  "chat/completions",
  { model: "gpt-4o", messages: [{ role: "user", content: "Hi" }] },
  googleAccessToken
).then((r) => r.json());
```
