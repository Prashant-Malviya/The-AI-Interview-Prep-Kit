import axios from "axios";
import * as cheerio from "cheerio";
import { env } from "../config/env";
import { checkUrlIsSafeToFetch } from "../utils/urlSafety";
import { withRetry } from "../utils/retry";
import { CrawledPage } from "../types/kit.types";

const MAX_CONTENT_LENGTH_BYTES = 3_000_000; // 3MB - refuse anything larger
const REQUEST_TIMEOUT_MS = 15_000;

export interface FetchedPage {
  url: string;
  html: string;
}


export async function fetchRawHtml(rawUrl: string): Promise<FetchedPage> {
  const check = checkUrlIsSafeToFetch(rawUrl);
  if (!check.ok || !check.url) {
    throw new Error(`Refusing to fetch ${rawUrl}: ${check.reason}`);
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(check.url.hostname);
  const canUseBrowserbase = env.browserbaseApiKey && env.browserbaseProjectId && !isLocal;

  if (canUseBrowserbase) {
    try {
      return await fetchWithBrowserbase(check.url.toString());
    } catch (err) {
      console.warn(`[scraper] Browserbase failed for ${rawUrl}, falling back to plain fetch:`, (err as Error).message);
    }
  }

  return fetchWithAxios(check.url.toString());
}

async function fetchWithAxios(url: string): Promise<FetchedPage> {
  const response = await withRetry(
    () =>
      axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        maxContentLength: MAX_CONTENT_LENGTH_BYTES,
        responseType: "text",
        headers: {
          
          "User-Agent": "InterviewPrepKitBot/1.0 (+https://example.com/bot)",
          Accept: "text/html,application/xhtml+xml",
        },
        validateStatus: (status) => status < 500, // let 4xx through so we can report it cleanly
      }),
    { retries: 2, baseDelayMs: 500 }
  );

  if (response.status >= 400) {
    throw new Error(`Received HTTP ${response.status} for ${url}`);
  }

  const contentType = String(response.headers["content-type"] || "");
  if (contentType !== "" && !contentType.includes("text/html") && !contentType.includes("xml")) {
    throw new Error(`Unexpected content-type "${contentType}" for ${url}`);
  }

  return { url, html: response.data };
}

async function fetchWithBrowserbase(url: string): Promise<FetchedPage> {

  
  const { Browserbase } = await import("@browserbasehq/sdk");
  const { chromium } = await import("playwright-core");

  const bb = new Browserbase({ apiKey: env.browserbaseApiKey });
  const session = await bb.sessions.create({ projectId: env.browserbaseProjectId });

  const browser = await chromium.connectOverCDP(session.connectUrl);
  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT_MS });
    const html = await page.content();
    return { url, html };
  } finally {
    await browser.close().catch(() => undefined);
  }
}


export function extractCleanText(html: string, url: string): CrawledPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const title = $("title").first().text().trim() || url;
  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000); // cap so we never blow the LLM's context window

  return { url, title, text };
}


export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
    try {
      const resolved = new URL(href, base);
      
      if (resolved.hostname === base.hostname) {
        resolved.hash = "";
        links.add(resolved.toString());
      }
    } catch {
    }
  });

  return Array.from(links);
}
