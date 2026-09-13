
export interface RetryOptions {
  retries?: number; 
  baseDelayMs?: number;
  onRetry?: (attempt: number, err: unknown) => void;
  
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
    
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }
  throw lastError;
}
