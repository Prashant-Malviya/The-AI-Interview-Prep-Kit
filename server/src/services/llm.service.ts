import axios from "axios";
import { env } from "../config/env";
import { withRetry } from "../utils/retry";
import { AppError, ErrorCodes } from "../utils/AppError";

// This is the ONLY file in the codebase that talks to the LLM provider.
// Every other service asks this one a plain question and gets plain text
// or JSON back - they never touch axios or the API shape directly.
//
// We use Google's Gemini API (generativelanguage.googleapis.com) because
// it has a genuine free tier and native JSON-mode support via
// `responseMimeType`. Note this is the Gemini *API* (a Google AI Studio /
// Cloud key), which is a separate product from the consumer Gemini
// app/subscription - a Gemini Pro subscription on gemini.google.com does
// not by itself grant API access. Get a free API key at
// https://aistudio.google.com/apikey.

interface ChatOptions {
  system?: string;
  temperature?: number;
  jsonMode?: boolean; // ask the model to return only JSON
}

// Gemini returns HTTP 429 when its free-tier requests-per-minute limit is
// hit. We treat 429 and 5xx as retryable; anything else (e.g. a bad API
// key -> 400/403) fails fast instead of retrying uselessly.
function isRetryableGeminiError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return true; // network errors: worth a retry
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
          // Gemini's native JSON mode - the model is constrained to emit
          // valid JSON, so we don't have to rely on prompt-only instructions.
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
      // A common Gemini failure mode: the response was cut off or blocked
      // by a safety filter, which shows up as a finishReason instead of text.
      const finishReason = candidate?.finishReason;
      throw new Error(`LLM returned an empty response (finishReason: ${finishReason || "unknown"})`);
    }
    return text as string;
  };

  try {
    return await withRetry(call, {
      retries: 5,
      baseDelayMs: 2000, // Gemini's free-tier RPM limit resets on a rolling window, so back off generously
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

// Asks the model for JSON and parses it, with one repair attempt if the
// first response is not valid JSON (a very common failure mode for LLMs).
export async function askLLMForJson<T>(userPrompt: string, system?: string): Promise<T> {
  const raw = await askLLM(userPrompt, { system, jsonMode: true, temperature: 0.3 });
  try {
    return JSON.parse(stripCodeFence(raw)) as T;
  } catch {
    // One repair pass: show the model its own broken output and ask it
    // to fix it, rather than failing the whole kit over a formatting slip.
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
  // Models sometimes wrap JSON in ```json fences even when told not to.
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1] : text;
}
