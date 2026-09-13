import { askLLMForJson } from "./llm.service";
import { makeIdGenerator } from "../utils/idGen";
import { Requirement, RoleSection } from "../types/kit.types";

// Raw shape we ask the model for. Note there's no "id" field here - ids
// are assigned by our own code afterwards (see assignRequirementIds),
// never by the model, so they're guaranteed stable and collision-free.
interface RawRequirement {
  text: string;
  kind: "technical" | "behavioural" | "domain";
  priority: "must" | "nice";
}

interface RawRoleExtraction {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: RawRequirement[];
}

const SYSTEM_PROMPT = `You extract structured information from job descriptions for an interview-prep tool.
Be faithful to the text: only include requirements the posting actually states or clearly implies.
Never invent requirements, technologies, or years of experience that are not in the text.
Distinguish "must" (required, "you have", "must have", core to the role) from "nice" (bonus, "nice to have", "a plus", preferred but optional) STRICTLY based on the posting's own wording.
If the description is very short or vague, return fewer requirements rather than padding with guesses - a thin description should produce a thin, honest result.
Respond with ONLY a JSON object of this exact shape, no extra commentary:
{
  "title": string,
  "seniority": string,
  "responsibilities": string[],
  "requirements": [ { "text": string, "kind": "technical" | "behavioural" | "domain", "priority": "must" | "nice" } ]
}`;

export async function extractRoleAndRequirements(jd: string): Promise<RoleSection> {
  const trimmedJd = jd.trim();

  const prompt = `Job description:\n\n${trimmedJd}\n\nExtract the role details and requirements as specified.`;
  const raw = await askLLMForJson<RawRoleExtraction>(prompt, SYSTEM_PROMPT);

  const requirements = assignRequirementIds(raw.requirements || []);

  return {
    title: raw.title || "Unknown role",
    seniority: raw.seniority || "Not specified",
    responsibilities: raw.responsibilities || [],
    requirements,
  };
}

// Assigning ids is deterministic bookkeeping, not something we ask the
// model to decide - this is what keeps requirement ids stable and lets
// coverage checking be an objective, checkable fact rather than the
// model's opinion of itself.
function assignRequirementIds(raw: RawRequirement[]): Requirement[] {
  const nextId = makeIdGenerator("r");
  return raw
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => ({
      id: nextId(),
      text: r.text.trim(),
      kind: r.kind === "behavioural" || r.kind === "domain" ? r.kind : "technical",
      priority: r.priority === "nice" ? "nice" : "must",
    }));
}
