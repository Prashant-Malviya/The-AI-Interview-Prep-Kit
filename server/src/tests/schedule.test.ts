import { buildSchedule } from "../services/schedule.service";
import { Requirement, Question } from "../types/kit.types";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `requirement ${id}`, kind: "technical", priority };
}

function question(id: string, requirementId: string, difficulty: 1 | 2 | 3): Question {
  return {
    id,
    requirement_ids: [requirementId],
    category: "technical",
    prompt: "p",
    answer_outline: "a",
    difficulty,
  };
}

describe("schedule.service", () => {
  it("produces exactly as many days as requested", () => {
    const requirements = [req("r1")];
    const questions = [question("q1", "r1", 2)];
    const schedule = buildSchedule(questions, requirements, 5);
    expect(schedule.days_available).toBe(5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives every day an integer minutes value", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [question("q1", "r1", 3), question("q2", "r2", 1)];
    const schedule = buildSchedule(questions, requirements, 3);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("places every must-have-covering question somewhere in the schedule", () => {
    const requirements = [req("r1", "must"), req("r2", "must")];
    const questions = [question("q1", "r1", 2), question("q2", "r2", 3)];
    const schedule = buildSchedule(questions, requirements, 4);
    const scheduledIds = schedule.days.flatMap((d) => d.question_ids);
    expect(scheduledIds).toEqual(expect.arrayContaining(["q1", "q2"]));
  });

  it("puts the hardest / highest priority question on an earlier day than an easier one", () => {
    const requirements = [req("r1", "must"), req("r2", "nice")];
    const hard = question("q-hard", "r1", 3);
    const easy = question("q-easy", "r2", 1);
    const schedule = buildSchedule([easy, hard], requirements, 4);

    const dayOf = (qid: string) => schedule.days.find((d) => d.question_ids.includes(qid))!.day;
    expect(dayOf("q-hard")).toBeLessThanOrEqual(dayOf("q-easy"));
  });

  it("handles a 1-day schedule without dropping questions", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [question("q1", "r1", 1), question("q2", "r2", 2), question("q3", "r3", 3)];
    const schedule = buildSchedule(questions, requirements, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("handles a large day count (e.g. 60) without crashing, leaving extra days light", () => {
    const requirements = [req("r1")];
    const questions = [question("q1", "r1", 2)];
    const schedule = buildSchedule(questions, requirements, 60);
    expect(schedule.days).toHaveLength(60);
    const totalScheduled = schedule.days.flatMap((d) => d.question_ids).length;
    expect(totalScheduled).toBe(1);
  });
});
