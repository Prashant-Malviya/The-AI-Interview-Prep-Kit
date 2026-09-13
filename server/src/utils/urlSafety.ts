import { env } from "../config/env";

// Private/loopback ranges we refuse to fetch in production. In development
// we allow localhost so the batch command can hit the local fixture site
// used for testing (see Appendix B: "company sites ... may be served from
// a local address").
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

// Validates that a URL is well-formed, http(s), and (in production) not
// pointing at a private/loopback address. Called before every outbound
// fetch so we never let the app be used as an open proxy.
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
