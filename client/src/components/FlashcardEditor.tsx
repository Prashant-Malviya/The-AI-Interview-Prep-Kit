import { Flashcard, Requirement } from "@/lib/types";

interface Props {
  flashcards: Flashcard[];
  requirements: Requirement[];
  pinnedIds: string[];
  onChange: (flashcards: Flashcard[]) => void;
  onPin: (id: string) => void;
}

let manualIdCounter = 0;
function newManualId() {
  manualIdCounter += 1;
  return `manual-f-${Date.now()}-${manualIdCounter}`;
}

export default function FlashcardEditor({ flashcards, requirements, pinnedIds, onChange, onPin }: Props) {
  function update(id: string, patch: Partial<Flashcard>) {
    onChange(flashcards.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    onPin(id);
  }

  function remove(id: string) {
    onChange(flashcards.filter((f) => f.id !== id));
  }

  function add() {
    const card: Flashcard = { id: newManualId(), front: "", back: "", requirement_ids: [] };
    onChange([...flashcards, card]);
    onPin(card.id);
  }

  function requirementText(id: string): string {
    return requirements.find((r) => r.id === id)?.text || "(deleted requirement)";
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">
          Flashcards <span className="text-ink/40 font-normal text-sm">({flashcards.length})</span>
        </h2>
        <button onClick={add} className="text-xs font-medium text-accent hover:underline">
          + Add flashcard
        </button>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {flashcards.map((card) => (
          <li key={card.id} className="rounded-md border border-ink/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-wrap gap-1">
                {card.requirement_ids.map((rid) => (
                  <span key={rid} className="text-xs rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">
                    {requirementText(rid)}
                  </span>
                ))}
                {pinnedIds.includes(card.id) && (
                  <span className="text-xs rounded-full bg-accent/15 px-2 py-0.5 text-accent font-medium">
                    Edited by you
                  </span>
                )}
              </div>
              <button onClick={() => remove(card.id)} className="text-warn/70 hover:text-warn text-xs">
                Delete
              </button>
            </div>
            <textarea
              value={card.front}
              onChange={(e) => update(card.id, { front: e.target.value })}
              placeholder="Front"
              rows={2}
              className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none mb-2"
            />
            <textarea
              value={card.back}
              onChange={(e) => update(card.id, { back: e.target.value })}
              placeholder="Back"
              rows={2}
              className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink/80 focus:border-accent focus:outline-none"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
