import { Question, Requirement, QuestionCategory } from "@/lib/types";

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System design",
  "company-fit": "Company fit",
};

interface Props {
  questions: Question[];
  requirements: Requirement[];
  pinnedIds: string[];
  onChange: (questions: Question[]) => void;
  onPin: (id: string) => void;
  onRegenerateCategory: (category: QuestionCategory) => void;
  regeneratingCategory: QuestionCategory | null;
}

let manualIdCounter = 0;
function newManualId() {
  manualIdCounter += 1;
  return `manual-q-${Date.now()}-${manualIdCounter}`;
}

export default function QuestionEditor({
  questions,
  requirements,
  pinnedIds,
  onChange,
  onPin,
  onRegenerateCategory,
  regeneratingCategory,
}: Props) {
  function updateQuestion(id: string, patch: Partial<Question>, pin = true) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    if (pin) onPin(id);
  }

  function deleteQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function addQuestion(category: QuestionCategory) {
    const newQuestion: Question = {
      id: newManualId(),
      requirement_ids: [],
      category,
      prompt: "",
      answer_outline: "",
      difficulty: 2,
    };
    onChange([...questions, newQuestion]);
    onPin(newQuestion.id); // hand-added, so it must survive regeneration
  }

  function move(id: string, direction: -1 | 1) {
    const indices = questions.map((q, i) => i).filter((i) => questions[i].category === questions.find((q) => q.id === id)?.category);
    const currentPos = indices.indexOf(questions.findIndex((q) => q.id === id));
    const swapWith = indices[currentPos + direction];
    const currentIndex = questions.findIndex((q) => q.id === id);
    if (swapWith === undefined) return;
    const next = [...questions];
    [next[currentIndex], next[swapWith]] = [next[swapWith], next[currentIndex]];
    onChange(next);
  }

  function requirementText(id: string): string {
    return requirements.find((r) => r.id === id)?.text || "(deleted requirement)";
  }

  return (
    <section className="space-y-6">
      {CATEGORIES.map((category) => {
        const items = questions.filter((q) => q.category === category);
        return (
          <div key={category} className="rounded-lg border border-ink/10 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-ink">
                {CATEGORY_LABEL[category]}{" "}
                <span className="text-ink/40 font-normal text-sm">({items.length})</span>
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={() => addQuestion(category)} className="text-xs font-medium text-accent hover:underline">
                  + Add question
                </button>
                <button
                  onClick={() => onRegenerateCategory(category)}
                  disabled={regeneratingCategory === category}
                  className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                >
                  {regeneratingCategory === category ? "Regenerating…" : "Regenerate category"}
                </button>
              </div>
            </div>

            {items.length === 0 && <p className="text-sm text-ink/40 italic">No questions in this category yet.</p>}

            <ul className="space-y-4">
              {items.map((q) => (
                <li key={q.id} className="rounded-md border border-ink/10 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {q.requirement_ids.map((rid) => (
                        <span key={rid} className="text-xs rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">
                          {requirementText(rid)}
                        </span>
                      ))}
                      {pinnedIds.includes(q.id) && (
                        <span className="text-xs rounded-full bg-accent/15 px-2 py-0.5 text-accent font-medium">
                          Edited by you
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => move(q.id, -1)} aria-label="Move up" className="text-ink/40 hover:text-ink text-xs">
                        ↑
                      </button>
                      <button onClick={() => move(q.id, 1)} aria-label="Move down" className="text-ink/40 hover:text-ink text-xs">
                        ↓
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} aria-label="Delete question" className="text-warn/70 hover:text-warn text-xs">
                        Delete
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                    placeholder="Question prompt"
                    rows={2}
                    className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none mb-2"
                  />
                  <textarea
                    value={q.answer_outline}
                    onChange={(e) => updateQuestion(q.id, { answer_outline: e.target.value })}
                    placeholder="Answer outline"
                    rows={2}
                    className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink/80 focus:border-accent focus:outline-none mb-2"
                  />

                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 text-ink/50">
                      Difficulty
                      <select
                        value={q.difficulty}
                        onChange={(e) => updateQuestion(q.id, { difficulty: Number(e.target.value) as 1 | 2 | 3 })}
                        className="rounded border border-ink/15 bg-white px-1.5 py-1"
                      >
                        <option value={1}>1 - easy</option>
                        <option value={2}>2 - medium</option>
                        <option value={3}>3 - hard</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-ink/50">
                      Category
                      <select
                        value={q.category}
                        onChange={(e) => updateQuestion(q.id, { category: e.target.value as QuestionCategory })}
                        className="rounded border border-ink/15 bg-white px-1.5 py-1"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
