import { prisma } from "./prisma";

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private provider: string;

  constructor(apiKey: string, model: string = "gemini-2.5-flash", provider: string = "gemini") {
    this.apiKey = apiKey;
    this.model = model;
    this.provider = provider;
  }

  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    if (this.provider === "groq") {
      return this.generateGroqContent(prompt, systemInstruction);
    }
    return this.generateGeminiContent(prompt, systemInstruction);
  }

  async *streamContent(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    if (this.provider === "groq") {
      yield* this.streamGroqContent(prompt, systemInstruction);
      return;
    }
    yield* this.streamGeminiContent(prompt, systemInstruction);
  }

  // --- GEMINI IMPLEMENTATION ---

  private async generateGeminiContent(prompt: string, systemInstruction?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
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

  private async *streamGeminiContent(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
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
            // Skip malformed chunks
          }
        }
      }
    }
  }

  // --- GROQ IMPLEMENTATION ---

  private async generateGroqContent(prompt: string, systemInstruction?: string): Promise<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Groq API error: ${response.status} ${response.statusText}. Details: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  private async *streamGroqContent(prompt: string, systemInstruction?: string): AsyncGenerator<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
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
            const text = data.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // Skip malformed chunks
          }
        }
      }
    }
  }
}

export function createGeminiClient(apiKey: string, model?: string, provider?: string): GeminiClient {
  return new GeminiClient(apiKey, model, provider);
}

export function safeParseJson<T>(rawText: string, fallback: T): T {
  try {
    let jsonText = rawText.trim();
    
    // 1. Try to find JSON content inside markdown code blocks
    const jsonBlockMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/i) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1];
    } else {
      // Find the first '{' or '[' and the last '}' or ']'
      const startObj = jsonText.indexOf("{");
      const startArr = jsonText.indexOf("[");
      const endObj = jsonText.lastIndexOf("}");
      const endArr = jsonText.lastIndexOf("]");
      
      const start = (startObj !== -1 && (startArr === -1 || startObj < startArr)) ? startObj : startArr;
      const end = (endObj !== -1 && (endArr === -1 || endObj > endArr)) ? endObj : endArr;
      
      if (start !== -1 && end !== -1 && end > start) {
        jsonText = jsonText.substring(start, end + 1);
      }
    }
    
    jsonText = jsonText.trim();
    
    // 2. Try parsing directly
    try {
      return JSON.parse(jsonText);
    } catch {
      // 3. Fallback repair: replace raw unescaped newlines in JSON strings with literal \n
      let repaired = jsonText.replace(/: \s*"([\s\S]*?)"\s*([,}\n\]])/g, (match, content, terminator) => {
        const escapedContent = content.replace(/\n/g, "\\n").replace(/\r/g, "");
        return `: "${escapedContent}"${terminator}`;
      });
      
      return JSON.parse(repaired);
    }
  } catch (error) {
    console.error("Failed to parse AI JSON response, returning fallback.", error);
    return fallback;
  }
}

export async function getGeminiClient(): Promise<GeminiClient> {
  const providerSetting = await prisma.settings.findUnique({
    where: { key: "ai_provider" },
  });
  const provider = providerSetting?.value || "gemini";

  const apiKeySetting = await prisma.settings.findUnique({
    where: { key: provider === "groq" ? "groq_api_key" : "gemini_api_key" },
  });
  const modelSetting = await prisma.settings.findUnique({
    where: { key: "gemini_model" },
  });

  const apiKey = apiKeySetting?.value || (provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY) || "";
  const model = modelSetting?.value || (provider === "groq" ? "llama-3.3-70b-versatile" : "gemini-2.5-flash");

  return new GeminiClient(apiKey, model, provider);
}
