import { Requirement, Question } from "../types/kit.types";

// Returns the ids of requirements that have zero questions referencing
// them. This is plain array logic - it must never be delegated to the
// LLM, per the brief ("this is your code's decision to make, not the
// model's"), because it's the objective fact the whole coverage loop
// depends on.
export function findUncoveredRequirementIds(requirements: Requirement[], questions: Question[]): string[] {
  const coveredIds = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) coveredIds.add(rid);
  }
  return requirements.filter((r) => !coveredIds.has(r.id)).map((r) => r.id);
}

// We only ever treat MUST requirements as blocking for the coverage loop.
// A "nice to have" requirement quietly going uncovered isn't a failure of
// the kit's one job; an uncovered MUST requirement is.
export function findUncoveredMustHaveIds(requirements: Requirement[], questions: Question[]): string[] {
  const uncovered = new Set(findUncoveredRequirementIds(requirements, questions));
  return requirements.filter((r) => r.priority === "must" && uncovered.has(r.id)).map((r) => r.id);
}
