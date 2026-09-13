import { useState } from "react";
import { Flashcard } from "@/lib/types";

const CONFIDENCE_LABELS = ["Blanked", "Shaky", "Okay", "Solid", "Nailed it"];

export default function PracticeCard({
  card,
  onRate,
}: {
  card: Flashcard;
  onRate: (confidence: number) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-8 text-center">
      <p className="text-xs uppercase tracking-wide text-ink/40 mb-4">
        {revealed ? "Answer" : "Question"}
      </p>
      <p className="font-display text-xl text-ink mb-6 min-h-[3rem] flex items-center justify-center">
        {revealed ? card.back : card.front}
      </p>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent/90"
        >
          Reveal answer
        </button>
      ) : (
        <div>
          <p className="text-sm text-ink/50 mb-3">How confident did you feel?</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {CONFIDENCE_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  onRate(i + 1);
                  setRevealed(false);
                }}
                className="rounded-md border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:border-accent hover:text-accent"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
