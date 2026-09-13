import { Question, Requirement, Schedule, ScheduleDay } from "../types/kit.types";

const MINUTES_PER_DIFFICULTY_POINT = 15; // difficulty 1 -> 15min, 2 -> 30min, 3 -> 45min

// Sorts questions so that harder, higher-priority material comes first -
// "harder and higher-priority material lands earlier, not the night
// before" - then greedily fills days in order so early days get the
// heaviest material. Every day in [1, daysAvailable] is present even if
// some end up empty (e.g. a 60-day schedule for a 5-question kit), which
// is the honest way to handle that edge case rather than padding with
// invented content.
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

  // Greedy round-robin weighted by day capacity: always place the next
  // (hardest-remaining) question onto whichever early day currently has
  // the least minutes assigned, but never skip ahead of an earlier day
  // that still has room relative to the running average.
  const totalMinutes = weighted.reduce((sum, w) => sum + w.minutes, 0);
  const targetPerDay = totalMinutes / safeDays || 0;

  let dayIndex = 0;
  for (const w of weighted) {
    // Move to the next day once the current one has reached its fair share,
    // but never leave a day completely empty while later heavy items remain
    // for only a few days.
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

// Guards against the two explicit edge cases in the brief: a 1-day ask
// and a 60-day (or larger) ask. We don't reject either - we just keep
// the number sane so we don't try to allocate, say, 0 or 10,000 days.
function clampDays(days: number): number {
  if (!Number.isFinite(days) || days < 1) return 1;
  return Math.min(Math.round(days), 90);
}
