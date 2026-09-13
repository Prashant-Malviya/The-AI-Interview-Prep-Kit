import { findUncoveredRequirementIds, findUncoveredMustHaveIds } from "../services/coverage.service";
import { Requirement, Question } from "../types/kit.types";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function question(id: string, requirementIds: string[]): Question {
  return { id, requirement_ids: requirementIds, category: "technical", prompt: "p", answer_outline: "a", difficulty: 2 };
}

describe("coverage.service", () => {
  it("finds no gaps when every requirement has a question", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r1"]), question("q2", ["r2"])];
    expect(findUncoveredRequirementIds(requirements, questions)).toEqual([]);
  });

  it("finds requirements with zero referencing questions", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [question("q1", ["r1"])];
    expect(findUncoveredRequirementIds(requirements, questions)).toEqual(["r2", "r3"]);
  });

  it("a question can cover more than one requirement", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", ["r1", "r2"])];
    expect(findUncoveredRequirementIds(requirements, questions)).toEqual([]);
  });

  it("only treats uncovered MUST requirements as blocking", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions: Question[] = []; // nothing covered at all
    expect(findUncoveredMustHaveIds(requirements, questions)).toEqual(["r1"]);
  });

  it("returns an empty list when all must-haves are covered, even if nice-to-haves are not", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const questions = [question("q1", ["r1"])];
    expect(findUncoveredMustHaveIds(requirements, questions)).toEqual([]);
  });
});
