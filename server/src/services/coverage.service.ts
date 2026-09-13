import { Requirement, Question } from "../types/kit.types";


export function findUncoveredRequirementIds(requirements: Requirement[], questions: Question[]): string[] {
  const coveredIds = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) coveredIds.add(rid);
  }
  return requirements.filter((r) => !coveredIds.has(r.id)).map((r) => r.id);
}


export function findUncoveredMustHaveIds(requirements: Requirement[], questions: Question[]): string[] {
  const uncovered = new Set(findUncoveredRequirementIds(requirements, questions));
  return requirements.filter((r) => r.priority === "must" && uncovered.has(r.id)).map((r) => r.id);
}
