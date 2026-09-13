import { Kit, Requirement, Question } from "../types/kit.types";
import { extractRoleAndRequirements } from "./extraction.service";
import { crawlCompanySite, summariseHiringSignal } from "./research.service";
import { findPublicDiscussion } from "./discussion.service";
import { generateCompanyBrief, generateQuestionsForCategory, generateFlashcards, categoryForKind } from "./generation.service";
import { findUncoveredMustHaveIds } from "./coverage.service";
import { buildSchedule } from "./schedule.service";
import { kitSchema, validateKitReferentialIntegrity } from "./validation.service";
import { AppError, ErrorCodes } from "../utils/AppError";

const MAX_COVERAGE_PASSES = 3;

export interface PipelineInput {
  jd: string;
  companyUrl: string;
  days: number;
}

//step-by-step-report-porgress
export type ProgressCallback = (step: string) => void;


export async function runKitPipeline(input: PipelineInput, onProgress: ProgressCallback = () => {}): Promise<Kit> {
  const { jd, companyUrl, days } = input;

  // Step 1: pasted text needs no retrieval - extract requirements straight away.
  onProgress("Extracting requirements from the job description");
  const role = await extractRoleAndRequirements(jd);

  // Step 2: the company homepage needs crawling before it's useful.
  onProgress("Crawling the company site");
  const crawl = await crawlCompanySite(companyUrl);
  const companyName = deriveCompanyName(companyUrl, crawl.pagesUsed[0]?.title);

  // Step 3: once we've found hiring pages, summarise what they actually say
  onProgress("Looking for how this company runs interviews");
  const hiringSignal = await summariseHiringSignal(crawl.hiringPages);

  onProgress("Searching for public discussion of their interview process");
  const discussion = await findPublicDiscussion(companyName);

  onProgress("Writing the company brief");
  const companyBrief = await generateCompanyBrief(companyName, crawl.pagesUsed);
  if (discussion.sources.length > 0) {
    companyBrief.sources = Array.from(new Set([...companyBrief.sources, ...discussion.sources]));
  }

  // Step 4: generate questions per requirement KIND in separate calls 
  onProgress("Generating technical questions");
  const technicalReqs = role.requirements.filter((r) => categoryForKind(r.kind) === "technical");
  const behaviouralReqs = role.requirements.filter((r) => categoryForKind(r.kind) === "behavioural");
  const companyFitReqs = role.requirements.filter((r) => categoryForKind(r.kind) === "company-fit");

  let questions: Question[] = [
    ...(await generateQuestionsForCategory(technicalReqs, "technical", hiringSignal.summary)),
    ...(await generateQuestionsForCategory(behaviouralReqs, "behavioural", hiringSignal.summary)),
    ...(await generateQuestionsForCategory(companyFitReqs, "company-fit", hiringSignal.summary)),
  ];


  if (/system.?design/i.test(hiringSignal.summary) && technicalReqs.length > 0) {
    onProgress("Adding system-design questions (their process includes one)");
    questions = questions.concat(await generateQuestionsForCategory(technicalReqs, "system-design", hiringSignal.summary));
  }

  onProgress("Building flashcards");
  const flashcards = await generateFlashcards(role.requirements);

  // Step 5: the second pass 
  onProgress("Checking coverage of must-have requirements");
  let passes = 1;
  let uncovered = findUncoveredMustHaveIds(role.requirements, questions);

  while (uncovered.length > 0 && passes < MAX_COVERAGE_PASSES) {
    onProgress(`Coverage gap found (${uncovered.length}) - generating missing questions`);
    const gapRequirements = role.requirements.filter((r) => uncovered.includes(r.id));
    const byCategory = groupByCategory(gapRequirements);

    for (const [category, reqs] of byCategory) {
      questions = questions.concat(await generateQuestionsForCategory(reqs, category as any, hiringSignal.summary));
    }

    passes++;
    uncovered = findUncoveredMustHaveIds(role.requirements, questions);
  }

  // Step 6: scheduling is arithmetic - always in code, never the model.
  onProgress("Building the study schedule");
  const schedule = buildSchedule(questions, role.requirements, days);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: role.title,
      location: "Not specified",
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawl.pagesUsed.map((p) => p.url),
    },
    company_brief: companyBrief,
    role,
    questions,
    flashcards,
    schedule,
    coverage: {
      uncovered_requirement_ids: findUncoveredMustHaveIds(role.requirements, questions),
      passes,
    },
  };

  onProgress("Validating the generated kit");
  validateKitOrThrow(kit);

  return kit;
}

function groupByCategory(requirements: Requirement[]): Map<string, Requirement[]> {
  const map = new Map<string, Requirement[]>();
  for (const r of requirements) {
    const cat = categoryForKind(r.kind);
    map.set(cat, [...(map.get(cat) || []), r]);
  }
  return map;
}

function deriveCompanyName(companyUrl: string, homepageTitle?: string): string {
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    const fallback = base.charAt(0).toUpperCase() + base.slice(1);
    if (homepageTitle && homepageTitle.length < 60) {
      
      const first = homepageTitle.split(/[-|:]/)[0].trim();
      if (first.length > 1) return first;
    }
    return fallback;
  } catch {
    return "Unknown company";
  }
}

export function validateKitOrThrow(kit: Kit): void {
  const result = kitSchema.safeParse(kit);
  if (!result.success) {
    throw new AppError(
      ErrorCodes.KIT_STRUCTURE_INVALID,
      `Generated kit does not match the required structure: ${result.error.issues.map((i) => i.message).join("; ")}`,
      502
    );
  }
  const problems = validateKitReferentialIntegrity(result.data);
  if (problems.length > 0) {
    throw new AppError(ErrorCodes.KIT_STRUCTURE_INVALID, `Kit has broken references: ${problems.join("; ")}`, 502);
  }
}
