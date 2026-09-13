import axios from "axios";
import * as cheerio from "cheerio";
import { askLLM } from "./llm.service";

// We don't have a paid search API key (the brief explicitly won't supply
// one), so we use DuckDuckGo's keyless HTML search endpoint to look for
// public discussion of the company's interview process - Glassdoor/Blind/
// Reddit threads, blog write-ups, etc. If this turns up nothing (blocked,
// no results, or the company is obscure), we say so honestly rather than
// inventing "what people say" about the interview.
export interface DiscussionResult {
  summary: string;
  sources: string[];
}

export async function findPublicDiscussion(companyName: string): Promise<DiscussionResult> {
  const query = `${companyName} interview process experience`;

  let results: { title: string; url: string; snippet: string }[] = [];
  try {
    const res = await axios.get("https://html.duckduckgo.com/html/", {
      params: { q: query },
      timeout: 10_000,
      headers: { "User-Agent": "InterviewPrepKitBot/1.0" },
    });
    results = parseDuckDuckGoResults(res.data as string).slice(0, 5);
  } catch (err) {
    console.warn(`[discussion] search failed for "${companyName}":`, (err as Error).message);
    return { summary: "Public discussion of this company's interview process could not be retrieved.", sources: [] };
  }

  if (results.length === 0) {
    return { summary: "No public discussion of this company's interview process was found.", sources: [] };
  }

  const combined = results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
  const prompt =
    `Here are search result snippets about "${companyName}"'s interview process. ` +
    `In 2-3 sentences, summarise any concrete, recurring details about their interview stages, ` +
    `formats, or difficulty. If the snippets are too vague to say anything concrete, say that plainly.\n\n${combined}`;

  const summary = await askLLM(prompt, { temperature: 0.2 });
  return { summary: summary.trim(), sources: results.map((r) => r.url) };
}

function parseDuckDuckGoResults(html: string): { title: string; url: string; snippet: string }[] {
  const $ = cheerio.load(html);
  const results: { title: string; url: string; snippet: string }[] = [];

  $(".result").each((_, el) => {
    const title = $(el).find(".result__title").text().trim();
    const url = $(el).find(".result__a").attr("href") || "";
    const snippet = $(el).find(".result__snippet").text().trim();
    if (title && url) results.push({ title, url, snippet });
  });

  return results;
}
