import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PracticeCard from "@/components/PracticeCard";
import { api, ApiError } from "@/lib/api";
import { KitRecord } from "@/lib/types";

function orderByLeastConfident(
  cardIds: string[],
  progress: Record<string, { confidence: number; lastReviewedAt: string }>
): string[] {
  // Never-reviewed cards come first (treated as confidence 0), then
  // reviewed cards ascending by confidence - "order the next session by
  // what they were least confident about".
  return [...cardIds].sort((a, b) => {
    const confA = progress[a]?.confidence ?? 0;
    const confB = progress[b]?.confidence ?? 0;
    return confA - confB;
  });
}

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<KitRecord | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ kit: KitRecord }>(`/kits/${id}`)
      .then((res) => {
        setRecord(res.kit);
        if (res.kit.kit) {
          const ids = res.kit.kit.flashcards.map((c) => c.id);
          setQueue(orderByLeastConfident(ids, res.kit.practiceProgress));
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this kit"));
  }, [id]);

  const flashcards = record?.kit?.flashcards || [];
  const currentId = queue[position];
  const currentCard = useMemo(() => flashcards.find((c) => c.id === currentId), [flashcards, currentId]);
  const reviewedCount = record ? Object.keys(record.practiceProgress).length : 0;

  async function handleRate(confidence: number) {
    if (!record || !currentId || !id) return;
    try {
      const res = await api.post<{ practiceProgress: KitRecord["practiceProgress"] }>(`/kits/${id}/practice`, {
        flashcardId: currentId,
        confidence,
      });
      setRecord({ ...record, practiceProgress: res.practiceProgress });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your answer");
    }
    setPosition((p) => p + 1);
  }

  function restartSession() {
    if (!record?.kit) return;
    const ids = record.kit.flashcards.map((c) => c.id);
    setQueue(orderByLeastConfident(ids, record.practiceProgress));
    setPosition(0);
  }

  if (error) {
    return (
      <>
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-10 text-warn">{error}</p>
      </>
    );
  }
  if (!record) {
    return (
      <>
        <Navbar />
        <p className="mx-auto max-w-2xl px-6 py-10 text-ink/50">Loading…</p>
      </>
    );
  }
  if (flashcards.length === 0) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-10 text-center">
          <p className="text-ink/60">This kit has no flashcards yet.</p>
          <Link to={`/kits/${id}`} className="text-accent hover:underline text-sm mt-2 inline-block">
            Back to kit
          </Link>
        </div>
      </>
    );
  }

  const sessionDone = position >= queue.length;

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link to={`/kits/${id}`} className="text-sm text-ink/50 hover:text-ink">
            ← Back to kit
          </Link>
          <p className="text-sm text-ink/50">
            Covered {reviewedCount} / {flashcards.length} cards overall
          </p>
        </div>

        {!sessionDone && currentCard && (
          <>
            <div className="mb-4">
              <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${(position / queue.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-ink/40 mt-1">
                Card {position + 1} of {queue.length} this session
              </p>
            </div>
            <PracticeCard card={currentCard} onRate={handleRate} />
          </>
        )}

        {sessionDone && (
          <div className="rounded-lg border border-ink/10 bg-white p-10 text-center">
            <h2 className="font-display text-xl font-semibold text-ink mb-2">Session complete</h2>
            <p className="text-ink/60 mb-6 text-sm">
              You've gone through all {queue.length} flashcards. The next session will lead with whatever you rated
              lowest this time.
            </p>
            <button
              onClick={restartSession}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-paper hover:bg-accent/90"
            >
              Start another session
            </button>
          </div>
        )}
      </div>
    </>
  );
}
