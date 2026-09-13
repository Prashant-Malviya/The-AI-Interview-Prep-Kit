import { Schedule, Question, Requirement } from "@/lib/types";

interface Props {
  schedule: Schedule;
  questions: Question[];
  requirements: Requirement[];
  uncoveredRequirementIds: string[];
  onChange: (schedule: Schedule) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function ScheduleView({
  schedule,
  questions,
  requirements,
  uncoveredRequirementIds,
  onChange,
  onRegenerate,
  regenerating,
}: Props) {
  function updateDay(dayNumber: number, patch: Partial<Schedule["days"][number]>) {
    onChange({
      ...schedule,
      days: schedule.days.map((d) => (d.day === dayNumber ? { ...d, ...patch } : d)),
    });
  }

  function removeQuestionFromDay(dayNumber: number, questionId: string) {
    updateDay(dayNumber, {
      question_ids: schedule.days.find((d) => d.day === dayNumber)!.question_ids.filter((id) => id !== questionId),
    });
  }

  function addQuestionToDay(dayNumber: number, questionId: string) {
    if (!questionId) return;
    updateDay(dayNumber, {
      question_ids: [...schedule.days.find((d) => d.day === dayNumber)!.question_ids, questionId],
    });
  }

  function promptFor(id: string): string {
    return questions.find((q) => q.id === id)?.prompt || "(deleted question)";
  }

  const scheduledIds = new Set(schedule.days.flatMap((d) => d.question_ids));
  const unscheduled = questions.filter((q) => !scheduledIds.has(q.id));

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">
          Study schedule <span className="text-ink/40 font-normal text-sm">({schedule.days_available} days)</span>
        </h2>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {uncoveredRequirementIds.length > 0 && (
        <div className="mb-4 rounded-md bg-warn/10 border border-warn/30 px-4 py-3 text-sm text-warn">
          {uncoveredRequirementIds.length} must-have requirement(s) still have no question:{" "}
          {uncoveredRequirementIds
            .map((id) => requirements.find((r) => r.id === id)?.text || id)
            .join("; ")}
        </div>
      )}

      <div className="space-y-4">
        {schedule.days.map((day) => (
          <div key={day.day} className="rounded-md border border-ink/10 p-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-medium text-ink text-sm shrink-0">Day {day.day}</span>
              <input
                value={day.focus}
                onChange={(e) => updateDay(day.day, { focus: e.target.value })}
                className="flex-1 min-w-[120px] rounded border border-ink/15 bg-paper/50 px-2 py-1 text-sm"
                placeholder="Focus"
              />
              <label className="flex items-center gap-1 text-xs text-ink/50 shrink-0">
                Minutes
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={day.minutes}
                  onChange={(e) => updateDay(day.day, { minutes: Math.round(Number(e.target.value)) })}
                  className="w-20 rounded border border-ink/15 bg-white px-2 py-1"
                />
              </label>
            </div>

            {day.question_ids.length === 0 ? (
              <p className="text-xs text-ink/40 italic mb-2">Light review / rest day</p>
            ) : (
              <ul className="space-y-1 mb-2">
                {day.question_ids.map((qid) => (
                  <li key={qid} className="flex items-center justify-between text-sm text-ink/70 gap-2">
                    <span className="truncate">{promptFor(qid)}</span>
                    <button
                      onClick={() => removeQuestionFromDay(day.day, qid)}
                      className="text-warn/60 hover:text-warn text-xs shrink-0"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {unscheduled.length > 0 && (
              <select
                onChange={(e) => {
                  addQuestionToDay(day.day, e.target.value);
                  e.target.value = "";
                }}
                defaultValue=""
                className="text-xs rounded border border-ink/15 bg-white px-2 py-1"
              >
                <option value="" disabled>
                  + Add a question to this day
                </option>
                {unscheduled.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.prompt.slice(0, 60)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
