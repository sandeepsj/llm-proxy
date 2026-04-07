import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";
import { authenticate } from "../lib/auth";
import { getProvider } from "../lib/providers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Authenticate the caller and get their email
    const userEmail = await authenticate(req.headers.authorization ?? null);

    // 2. Extract routing info
    const { provider: providerName, endpoint, body: proxyBody } = req.body as {
      provider: string;
      endpoint: string;
      body: Record<string, unknown>;
    };

    if (!providerName || !endpoint || !proxyBody) {
      return res.status(400).json({
        error: "Missing required fields: provider, endpoint, body",
      });
    }

    // 3. Get provider config and API key
    const provider = getProvider(providerName);
    const apiKey = process.env[provider.apiKeyEnv];

    if (!apiKey) {
      return res.status(500).json({
        error: `API key not configured for provider: ${providerName}`,
      });
    }

    // 4. Build the upstream URL
    const url = `${provider.baseUrl}/${endpoint}`;

    // 5. Check if client wants streaming
    const isStreaming = proxyBody.stream === true;

    // 6. Forward the request to the provider
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...provider.authHeader(apiKey),
      },
      body: JSON.stringify(proxyBody),
    });

    // 7. Handle streaming responses
    if (isStreaming && upstream.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.status(upstream.status);

      const nodeStream = Readable.fromWeb(upstream.body as any);
      nodeStream.pipe(res);
      return;
    }

    // 8. Non-streaming: forward the response
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    res.setHeader("Content-Type", contentType);
    res.status(upstream.status);

    // Handle binary responses (e.g., audio, images)
    if (!contentType.includes("application/json") && !contentType.includes("text/")) {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      return res.send(buffer);
    }

    const data = await upstream.text();
    return res.end(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status =
      message.includes("Invalid Google") || message.includes("Missing Auth") || message.includes("Unsupported auth") || message.includes("not verified")
        ? 401
        : message.includes("not allowed")
          ? 403
          : 500;
    return res.status(status).json({ error: message });
  }
}
