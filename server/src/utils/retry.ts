// A small, dependency-free retry helper with exponential backoff.
// Used any time we call something slow/flaky/rate-limited: the LLM
// provider and the page fetcher.
export interface RetryOptions {
  retries?: number; // number of attempts after the first try
  baseDelayMs?: number;
  onRetry?: (attempt: number, err: unknown) => void;
  // Return false to stop retrying immediately (e.g. a 401 from a bad API
  // key will never succeed no matter how many times we ask). Defaults to
  // "always retry" so existing callers don't need to change.
  shouldRetry?: (err: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 800;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      if (options.shouldRetry && !options.shouldRetry(err)) break;
      options.onRetry?.(attempt + 1, err);
      // Exponential backoff with a little jitter, so a rate-limited call
      // backs off instead of hammering the provider again immediately.
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }
  throw lastError;
}
