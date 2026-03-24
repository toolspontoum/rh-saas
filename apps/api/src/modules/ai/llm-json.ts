import type { AiProviderId } from "./resolve-provider.js";
import { getGeminiRuntime, getOpenAiRuntime } from "./platform-ai-runtime.js";

export type VisionImagePart = { mimeType: string; base64: string };

export async function completeJsonWithProvider(input: {
  provider: AiProviderId;
  system: string;
  user: string;
}): Promise<string> {
  if (input.provider === "openai") {
    return completeOpenAiJson(input.system, input.user);
  }
  return completeGeminiJson(input.system, input.user);
}

/** Texto + imagens (currículos/certificados escaneados, fotos de documentos). Requer modelo com visão (ex.: gpt-4o, gemini-2.0-flash). */
export async function completeJsonWithProviderVision(input: {
  provider: AiProviderId;
  system: string;
  userText: string;
  images: VisionImagePart[];
}): Promise<string> {
  if (input.images.length === 0) {
    return completeJsonWithProvider({
      provider: input.provider,
      system: input.system,
      user: input.userText
    });
  }
  if (input.provider === "openai") {
    return completeOpenAiJsonVision(input.system, input.userText, input.images);
  }
  return completeGeminiJsonVision(input.system, input.userText, input.images);
}

async function completeOpenAiJson(system: string, user: string): Promise<string> {
  const cfg = await getOpenAiRuntime();
  if (!cfg) throw new Error("OPENAI_API_KEY_MISSING");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OPENAI_HTTP_${res.status}: ${errText.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("OPENAI_EMPTY_RESPONSE");
  return text;
}

async function completeOpenAiJsonVision(
  system: string,
  userText: string,
  images: VisionImagePart[]
): Promise<string> {
  const cfg = await getOpenAiRuntime();
  if (!cfg) throw new Error("OPENAI_API_KEY_MISSING");

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [{ type: "text", text: userText }];
  for (const img of images) {
    const mime = img.mimeType.toLowerCase();
    const url = `data:${mime};base64,${img.base64}`;
    userContent.push({
      type: "image_url",
      image_url: { url, detail: "high" }
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OPENAI_HTTP_${res.status}: ${errText.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("OPENAI_EMPTY_RESPONSE");
  return text;
}

async function completeGeminiJson(system: string, user: string): Promise<string> {
  const cfg = await getGeminiRuntime();
  if (!cfg) throw new Error("GEMINI_API_KEY_MISSING");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      },
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GEMINI_HTTP_${res.status}: ${errText.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("GEMINI_EMPTY_RESPONSE");
  return text;
}

async function completeGeminiJsonVision(
  system: string,
  userText: string,
  images: VisionImagePart[]
): Promise<string> {
  const cfg = await getGeminiRuntime();
  if (!cfg) throw new Error("GEMINI_API_KEY_MISSING");

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: userText }
  ];
  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64
      }
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      },
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GEMINI_HTTP_${res.status}: ${errText.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("GEMINI_EMPTY_RESPONSE");
  return text;
}
