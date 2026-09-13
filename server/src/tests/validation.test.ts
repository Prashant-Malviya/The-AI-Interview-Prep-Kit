import { kitSchema, validateKitReferentialIntegrity } from "../services/validation.service";
import { Kit } from "../types/kit.types";

function validKit(): Kit {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.example",
      role: "Backend Engineer",
      location: "Remote",
      jd_chars: 500,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.example"],
    },
    company_brief: { summary: "s", what_they_do: "w", sources: ["https://acme.example"] },
    role: {
      title: "Backend Engineer",
      seniority: "Senior",
      responsibilities: ["Build things"],
      requirements: [{ id: "r1", text: "5+ years Node", kind: "technical", priority: "must" }],
    },
    questions: [
      { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "p", answer_outline: "a", difficulty: 2 },
    ],
    flashcards: [{ id: "f1", front: "f", back: "b", requirement_ids: ["r1"] }],
    schedule: { days_available: 3, days: [{ day: 1, focus: "Technical", question_ids: ["q1"], minutes: 30 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("kitSchema", () => {
  it("accepts a well-formed kit", () => {
    const result = kitSchema.safeParse(validKit());
    expect(result.success).toBe(true);
  });

  it("rejects a kit missing a required field", () => {
    const kit: any = validKit();
    delete kit.role.title;
    const result = kitSchema.safeParse(kit);
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer duration", () => {
    const kit: any = validKit();
    kit.schedule.days[0].minutes = 30.5;
    const result = kitSchema.safeParse(kit);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const kit: any = validKit();
    kit.role.requirements[0].priority = "should-have";
    const result = kitSchema.safeParse(kit);
    expect(result.success).toBe(false);
  });
});

describe("validateKitReferentialIntegrity", () => {
  it("passes for a kit with no dangling references", () => {
    const parsed = kitSchema.parse(validKit());
    expect(validateKitReferentialIntegrity(parsed)).toEqual([]);
  });

  it("flags a schedule day pointing at a question that does not exist", () => {
    const kit = validKit();
    kit.schedule.days[0].question_ids.push("q-does-not-exist");
    const parsed = kitSchema.parse(kit);
    const problems = validateKitReferentialIntegrity(parsed);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("flags a question pointing at a requirement that does not exist", () => {
    const kit = validKit();
    kit.questions[0].requirement_ids.push("r-does-not-exist");
    const parsed = kitSchema.parse(kit);
    const problems = validateKitReferentialIntegrity(parsed);
    expect(problems.length).toBeGreaterThan(0);
  });
});
