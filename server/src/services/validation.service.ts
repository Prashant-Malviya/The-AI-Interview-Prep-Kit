import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createKitSchema = z.object({
  jd: z.string().min(1, "Job description is required"),
  companyUrl: z.string().url("Company website must be a valid URL"),
  days: z.number().int().min(1).max(90),
});

export const batchEntrySchema = z.array(
  z.object({
    id: z.string().min(1),
    jd: z.string(),
    company_url: z.string().url(),
    days: z.number().int().min(1).max(90),
  })
);


const requirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

const questionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const flashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

const scheduleDaySchema = z.object({
  day: z.number().int(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int(),
});

export const kitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int(),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: z.object({
    days_available: z.number().int(),
    days: z.array(scheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int(),
  }),
});

// Extra referential-integrity checks that zod's shape validation alone
// can't express: every question_ids entry in the schedule must point at
// a question that actually exists.
export function validateKitReferentialIntegrity(kit: z.infer<typeof kitSchema>): string[] {
  const problems: string[] = [];
  const questionIds = new Set(kit.questions.map((q) => q.id));
  const requirementIds = new Set(kit.role.requirements.map((r) => r.id));

  for (const day of kit.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) problems.push(`Schedule day ${day.day} references unknown question id ${qid}`);
    }
  }
  for (const q of kit.questions) {
    for (const rid of q.requirement_ids) {
      if (!requirementIds.has(rid)) problems.push(`Question ${q.id} references unknown requirement id ${rid}`);
    }
  }
  return problems;
}
