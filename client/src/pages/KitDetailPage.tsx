import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GenerationProgress from "@/components/GenerationProgress";
import RequirementBadge from "@/components/RequirementBadge";
import CompanyBriefEditor from "@/components/CompanyBriefEditor";
import QuestionEditor from "@/components/QuestionEditor";
import FlashcardEditor from "@/components/FlashcardEditor";
import ScheduleView from "@/components/ScheduleView";
import { api, ApiError } from "@/lib/api";
import { KitRecord, Kit, QuestionCategory } from "@/lib/types";

export default function KitDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<KitRecord | null>(null);
  const [draft, setDraft] = useState<Kit | null>(null);
  const [pinnedQ, setPinnedQ] = useState<string[]>([]);
  const [pinnedF, setPinnedF] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<{ kit: KitRecord }>(`/kits/${id}`);
      setRecord(res.kit);
      if (res.kit.kit && !dirty) {
        setDraft(res.kit.kit);
        setPinnedQ(res.kit.pinnedQuestionIds);
        setPinnedF(res.kit.pinnedFlashcardIds);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this kit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the kit is still being generated.
  useEffect(() => {
    if (!record || record.status === "ready" || record.status === "failed") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [record, load]);

  function updateDraft(patch: Partial<Kit>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
  }

  function pinQuestion(qid: string) {
    setPinnedQ((prev) => (prev.includes(qid) ? prev : [...prev, qid]));
  }
  function pinFlashcard(fid: string) {
    setPinnedF((prev) => (prev.includes(fid) ? prev : [...prev, fid]));
  }

  async function saveDraft(): Promise<KitRecord | null> {
    if (!draft || !id) return null;
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<{ kit: KitRecord }>(`/kits/${id}`, {
        kit: draft,
        pinnedQuestionIds: pinnedQ,
        pinnedFlashcardIds: pinnedF,
      });
      setRecord(res.kit);
      setDirty(false);
      return res.kit;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your changes");
      return null;
    } finally {
      setSaving(false);
    }
  }

  // Regeneration always operates on the server's saved copy, so we save
  // any unsaved edits first - that's what guarantees a regeneration of
  // one section never discards edits made elsewhere in the kit.
  async function regenerate(section: "company_brief" | QuestionCategory | "schedule") {
    if (!id) return;
    setRegeneratingSection(section);
    setError(null);
    try {
      if (dirty) {
        const saved = await saveDraft();
        if (!saved) return;
      }
      const res = await api.post<{ kit: KitRecord }>(`/kits/${id}/regenerate`, { section });
      setRecord(res.kit);
      setDraft(res.kit.kit);
      setDirty(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingSection(null);
    }
  }

  if (error && !record) {
    return (
      <>
        <Navbar />
        <p className="mx-auto max-w-3xl px-6 py-10 text-warn">{error}</p>
      </>
    );
  }
  if (!record) {
    return (
      <>
        <Navbar />
        <p className="mx-auto max-w-3xl px-6 py-10 text-ink/50">Loading…</p>
      </>
    );
  }

  if (record.status === "failed") {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <div className="rounded-lg border border-warn/30 bg-warn/5 p-6">
            <h1 className="font-display text-lg font-semibold text-warn mb-2">Generation failed</h1>
            <p className="text-sm text-ink/70">{record.failureReason}</p>
            <Link to="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (record.status !== "ready" || !draft) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <GenerationProgress startedAt={record.createdAt} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{draft.role.title}</h1>
            <p className="text-ink/60 text-sm mt-1">
              {draft.source.company} · {draft.role.seniority} · {draft.schedule.days_available}-day plan
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/kits/${id}/practice`}
              className="rounded-md border border-accent text-accent px-4 py-2 text-sm font-medium hover:bg-accentLight"
            >
              Practice mode
            </Link>
            <button
              onClick={saveDraft}
              disabled={!dirty || saving}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>

        {error && <p className="text-warn text-sm">{error}</p>}

        <CompanyBriefEditor
          brief={draft.company_brief}
          onChange={(company_brief) => updateDraft({ company_brief })}
          onRegenerate={() => regenerate("company_brief")}
          regenerating={regeneratingSection === "company_brief"}
        />

        <section className="rounded-lg border border-ink/10 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Role requirements</h2>
          <ul className="space-y-2">
            {draft.role.requirements.map((r) => (
              <li key={r.id} className="flex items-center gap-3 text-sm">
                <RequirementBadge requirement={r} />
                <span className="text-ink/80">{r.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <QuestionEditor
          questions={draft.questions}
          requirements={draft.role.requirements}
          pinnedIds={pinnedQ}
          onChange={(questions) => updateDraft({ questions })}
          onPin={pinQuestion}
          onRegenerateCategory={(category) => regenerate(category)}
          regeneratingCategory={regeneratingSection as QuestionCategory | null}
        />

        <FlashcardEditor
          flashcards={draft.flashcards}
          requirements={draft.role.requirements}
          pinnedIds={pinnedF}
          onChange={(flashcards) => updateDraft({ flashcards })}
          onPin={pinFlashcard}
        />

        <ScheduleView
          schedule={draft.schedule}
          questions={draft.questions}
          requirements={draft.role.requirements}
          uncoveredRequirementIds={draft.coverage.uncovered_requirement_ids}
          onChange={(schedule) => updateDraft({ schedule })}
          onRegenerate={() => regenerate("schedule")}
          regenerating={regeneratingSection === "schedule"}
        />
      </div>
    </>
  );
}
