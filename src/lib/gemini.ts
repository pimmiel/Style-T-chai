import { GoogleGenAI, type Part } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const ALLOWED_IMAGE_HOSTNAMES = /^[a-z0-9-]+\.supabase\.(co|in)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Image URL must use HTTPS");
  }
  if (!ALLOWED_IMAGE_HOSTNAMES.test(url.hostname)) {
    throw new Error("Image URL hostname not allowed");
  }
}

export async function geminiJSON<T>(opts: {
  system?: string;
  prompt: string;
  imageUrl?: string;
  responseSchema: object;
}): Promise<T> {
  const parts: Part[] = [{ text: opts.prompt }];

  if (opts.imageUrl) {
    validateImageUrl(opts.imageUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(opts.imageUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      throw new Error("Image too large");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image too large");
    }
    parts.unshift({
      inlineData: {
        mimeType: res.headers.get("content-type") ?? "image/jpeg",
        data: buf.toString("base64"),
      },
    });
  }

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
      temperature: 0.4,
    },
  });

  return JSON.parse(result.text ?? "{}") as T;
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const r = await ai.models.embedContent({
    model: process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001",
    contents: text,
  });
  return r.embeddings?.[0]?.values ?? [];
}
