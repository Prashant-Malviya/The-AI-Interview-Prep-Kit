
export type RequirementKind = "technical" | "behavioural" | "domain";
export type Priority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";

export interface Requirement {
  id: string; // stable within a kit, e.g. "r1"
  text: string;
  kind: RequirementKind;
  priority: Priority;
}

export interface Question {
  id: string; // e.g. "q1"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface Flashcard {
  id: string; // e.g. "f1"
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO string
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface RoleSection {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

// This is the exact shape from Appendix A.
export interface Kit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: RoleSection;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}



export interface HiringSignal {

  found: boolean;
  summary: string;
  pages_used: string[];
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface RetrievalResult {
  companyPages: CrawledPage[];
  hiringPages: CrawledPage[];
  hiringSignal: HiringSignal;
  publicDiscussion: { summary: string; sources: string[] };
  skippedSources: { url: string; reason: string }[];
}


export interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchKitResult {
  id: string;
  status: "ok" | "failed";
  kit: Kit | null;
  error: { code: string; message: string } | null;
}

export interface BatchOutput {
  version: string;
  generated_at: string;
  kits: BatchKitResult[];
}
