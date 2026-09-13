import { Question, Requirement, Schedule, ScheduleDay } from "../types/kit.types";

const MINUTES_PER_DIFFICULTY_POINT = 15; // difficulty 1 -> 15min, 2 -> 30min, 3 -> 45min


export function buildSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysAvailable: number
): Schedule {
  const safeDays = clampDays(daysAvailable);

  const weighted = questions
    .map((q) => ({
      question: q,
      weight: priorityWeight(q, requirements) * 10 + q.difficulty,
      minutes: q.difficulty * MINUTES_PER_DIFFICULTY_POINT,
    }))
    .sort((a, b) => b.weight - a.weight);

  const days: ScheduleDay[] = Array.from({ length: safeDays }, (_, i) => ({
    day: i + 1,
    focus: "",
    question_ids: [],
    minutes: 0,
  }));


  const totalMinutes = weighted.reduce((sum, w) => sum + w.minutes, 0);
  const targetPerDay = totalMinutes / safeDays || 0;

  let dayIndex = 0;
  for (const w of weighted) {

    while (dayIndex < safeDays - 1 && days[dayIndex].minutes >= targetPerDay && dayIndex < weighted.length) {
      dayIndex++;
    }
    days[dayIndex].question_ids.push(w.question.id);
    days[dayIndex].minutes += w.minutes;
  }

  for (const day of days) {
    day.focus = buildFocusLabel(day.question_ids, questions, requirements);
  }

  return { days_available: safeDays, days };
}

function priorityWeight(question: Question, requirements: Requirement[]): number {
  const covered = requirements.filter((r) => question.requirement_ids.includes(r.id));
  return covered.some((r) => r.priority === "must") ? 2 : 1;
}

function buildFocusLabel(questionIds: string[], questions: Question[], requirements: Requirement[]): string {
  if (questionIds.length === 0) return "Light review / rest day";

  const dayQuestions = questions.filter((q) => questionIds.includes(q.id));
  const categories = Array.from(new Set(dayQuestions.map((q) => q.category)));
  return categories
    .map((c) => c.replace("-", " "))
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(" + ");
}


function clampDays(days: number): number {
  if (!Number.isFinite(days) || days < 1) return 1;
  return Math.min(Math.round(days), 90);
}
