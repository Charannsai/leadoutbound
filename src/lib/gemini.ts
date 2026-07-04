export class GeminiClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  async *streamContent(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const body: Record<string, unknown> = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") return;
          try {
            const data = JSON.parse(jsonStr);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }
  }
}

export function createGeminiClient(apiKey: string, model?: string): GeminiClient {
  return new GeminiClient(apiKey, model);
}

import { prisma } from "./prisma";

export async function getGeminiClient(): Promise<GeminiClient> {
  const apiKeySetting = await prisma.settings.findUnique({
    where: { key: "gemini_api_key" },
  });
  const modelSetting = await prisma.settings.findUnique({
    where: { key: "gemini_model" },
  });

  const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY || "";
  const model = modelSetting?.value || "gemini-2.0-flash";

  return new GeminiClient(apiKey, model);
}
