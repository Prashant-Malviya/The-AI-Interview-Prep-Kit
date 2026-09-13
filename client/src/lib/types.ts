
export type RequirementKind = "technical" | "behavioural" | "domain";
export type Priority = "must" | "nice";
export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: Priority;
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface Flashcard {
  id: string;
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
  researched_at: string;
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

export interface Kit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: RoleSection;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

export type KitStatus = "pending" | "generating" | "ready" | "failed";

export interface KitRecord {
  _id: string;
  status: KitStatus;
  failureReason?: string;
  inputJd: string;
  inputCompanyUrl: string;
  inputDays: number;
  kit: Kit | null;
  pinnedQuestionIds: string[];
  pinnedFlashcardIds: string[];
  practiceProgress: Record<string, { confidence: number; lastReviewedAt: string }>;
  createdAt: string;
  updatedAt: string;
}
