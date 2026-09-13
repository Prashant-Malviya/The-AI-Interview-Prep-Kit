import { fetchRawHtml, extractCleanText, extractLinks } from "./scraper.service";
import { CrawledPage, HiringSignal } from "../types/kit.types";
import { askLLM } from "./llm.service";
import { loadDisallowedPaths, isPathAllowed } from "../utils/robots";

// Keywords that make a link worth following. We rank rather than hard-code
// a fixed path list, because (per the brief) hiring pages live at wildly
// different paths per company - /careers, /jobs, a handbook, an engineering
// blog post, etc.
const HIRING_KEYWORDS = [
  "career", "careers", "jobs", "job", "hiring", "join", "join-us",
  "work-with-us", "interview", "interviewing", "recruit", "recruiting",
  "life-at", "culture", "handbook", "team", "openings",
];
const COMPANY_INFO_KEYWORDS = ["about", "company", "mission", "story", "team", "product", "blog"];

const MAX_PAGES_TO_FETCH = 6;
const MAX_LINKS_TO_CONSIDER = 40;

interface ScoredLink {
  url: string;
  score: number;
}

function scoreLink(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  for (const kw of HIRING_KEYWORDS) if (lower.includes(kw)) score += 3;
  for (const kw of COMPANY_INFO_KEYWORDS) if (lower.includes(kw)) score += 1;
  // Slightly prefer shorter, shallower paths - they tend to be section landing pages.
  const depth = (url.match(/\//g) || []).length;
  score -= Math.max(0, depth - 4) * 0.2;
  return score;
}

export interface CrawlResult {
  pagesUsed: CrawledPage[];
  hiringPages: CrawledPage[];
  skipped: { url: string; reason: string }[];
}

// Crawl the site: fetch the homepage, rank its links, fetch the
// most promising ones, and separate "about the company" pages from
// "how they hire" pages. Any page that fails to fetch is skipped and
// reported rather than aborting the whole run.
export async function crawlCompanySite(companyUrl: string): Promise<CrawlResult> {
  const pagesUsed: CrawledPage[] = [];
  const hiringPages: CrawledPage[] = [];
  const skipped: { url: string; reason: string }[] = [];

  const disallowedPaths = await loadDisallowedPaths(companyUrl);

  if (!isPathAllowed(companyUrl, disallowedPaths)) {
    skipped.push({ url: companyUrl, reason: "Disallowed by robots.txt" });
    return { pagesUsed, hiringPages, skipped };
  }

  let homepage;
  try {
    homepage = await fetchRawHtml(companyUrl);
  } catch (err) {
    skipped.push({ url: companyUrl, reason: (err as Error).message });
    return { pagesUsed, hiringPages, skipped };
  }

  const homeText = extractCleanText(homepage.html, companyUrl);
  pagesUsed.push(homeText);

  const links = extractLinks(homepage.html, companyUrl)
    .filter((url) => isPathAllowed(url, disallowedPaths))
    .slice(0, MAX_LINKS_TO_CONSIDER);
  const ranked: ScoredLink[] = links
    .map((url) => ({ url, score: scoreLink(url) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PAGES_TO_FETCH);

  for (const link of ranked) {
    try {
      const page = await fetchRawHtml(link.url);
      const cleaned = extractCleanText(page.html, link.url);
      const isHiring = HIRING_KEYWORDS.some((kw) => link.url.toLowerCase().includes(kw));
      if (isHiring) hiringPages.push(cleaned);
      else pagesUsed.push(cleaned);
    } catch (err) {
      skipped.push({ url: link.url, reason: (err as Error).message });
    }
  }

  return { pagesUsed, hiringPages, skipped };
}

// Once we have candidate "hiring" pages, ask the model to summarise what,
// if anything, they reveal about the interview process. If no hiring
// pages were found at all, we report that honestly instead of guessing.
export async function summariseHiringSignal(hiringPages: CrawledPage[]): Promise<HiringSignal> {
  if (hiringPages.length === 0) {
    return { found: false, summary: "No public information about the interview process was found on the company site.", pages_used: [] };
  }

  const combined = hiringPages.map((p) => `URL: ${p.url}\n${p.text}`).join("\n\n---\n\n").slice(0, 12_000);

  const prompt =
    `Below is text scraped from a company's careers/hiring-related pages. ` +
    `Summarise, in 2-4 sentences, what it reveals about their interview process ` +
    `(stages, take-homes, timelines, what they evaluate). ` +
    `If the pages don't actually describe an interview process, say so plainly - do not invent one.\n\n${combined}`;

  const summary = await askLLM(prompt, { temperature: 0.2 });
  const found = !/no (specific )?(information|details|mention)/i.test(summary.slice(0, 80));

  return { found, summary: summary.trim(), pages_used: hiringPages.map((p) => p.url) };
}
