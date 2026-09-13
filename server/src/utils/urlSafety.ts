import { env } from "../config/env";


const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^::1$/,
  /^\[::1\]$/,
];

export interface UrlCheckResult {
  ok: boolean;
  reason?: string;
  url?: URL;
}


export function checkUrlIsSafeToFetch(rawUrl: string): UrlCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "URL is not valid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Only http/https URLs are allowed" };
  }

  const isPrivate = PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname));

  if (isPrivate && env.nodeEnv === "production") {
    return { ok: false, reason: "Private/loopback addresses are not allowed in production" };
  }

  return { ok: true, url: parsed };
}
