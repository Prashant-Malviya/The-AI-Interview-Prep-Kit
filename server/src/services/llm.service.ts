import axios from "axios";
import { env } from "../config/env";
import { withRetry } from "../utils/retry";
import { AppError, ErrorCodes } from "../utils/AppError";



interface ChatOptions {
  system?: string;
  temperature?: number;
  jsonMode?: boolean; 
}

function isRetryableGeminiError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return true; 
  const status = err.response?.status;
  return status === 429 || (status !== undefined && status >= 500);
}

function geminiUrl(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`;
}

export async function askLLM(userPrompt: string, options: ChatOptions = {}): Promise<string> {
  if (!env.geminiApiKey) {
    throw new AppError(ErrorCodes.LLM_FAILED, "GEMINI_API_KEY is not configured", 500);
  }

  const call = async () => {
    const response = await axios.post(
      geminiUrl(),
      {
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          
          ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      },
      {
        params: { key: env.geminiApiKey },
        headers: { "Content-Type": "application/json" },
        timeout: 60_000,
      }
    );

    const candidate = response.data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text || "").join("");
    if (!text) {
      
      const finishReason = candidate?.finishReason;
      throw new Error(`LLM returned an empty response (finishReason: ${finishReason || "unknown"})`);
    }
    return text as string;
  };

  try {
    return await withRetry(call, {
      retries: 5,
      baseDelayMs: 2000, 
      shouldRetry: isRetryableGeminiError,
      onRetry: (attempt, err) => {
        const status = axios.isAxiosError(err) ? err.response?.status : "n/a";
        console.warn(`[llm] retry ${attempt} after error (status: ${status})`);
      },
    });
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? `Gemini request failed: ${err.response?.status} ${JSON.stringify(err.response?.data)}`
      : `Gemini request failed: ${(err as Error).message}`;
    throw new AppError(ErrorCodes.LLM_FAILED, message, 502);
  }
}


export async function askLLMForJson<T>(userPrompt: string, system?: string): Promise<T> {
  const raw = await askLLM(userPrompt, { system, jsonMode: true, temperature: 0.3 });
  try {
    return JSON.parse(stripCodeFence(raw)) as T;
  } catch {
    
    const repaired = await askLLM(
      `The following was supposed to be valid JSON but failed to parse. ` +
        `Return ONLY the corrected JSON, nothing else.\n\n${raw}`,
      { jsonMode: true, temperature: 0 }
    );
    try {
      return JSON.parse(stripCodeFence(repaired)) as T;
    } catch {
      throw new AppError(ErrorCodes.LLM_FAILED, "LLM returned invalid JSON twice in a row", 502);
    }
  }
}

function stripCodeFence(text: string): string {
  
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1] : text;
}
