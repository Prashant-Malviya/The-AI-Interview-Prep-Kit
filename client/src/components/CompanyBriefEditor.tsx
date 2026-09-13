import { CompanyBrief } from "@/lib/types";

interface Props {
  brief: CompanyBrief;
  onChange: (brief: CompanyBrief) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function CompanyBriefEditor({ brief, onChange, onRegenerate, regenerating }: Props) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="font-display text-lg font-semibold text-ink">Company brief</h2>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-xs font-medium text-accent hover:underline disabled:opacity-50 shrink-0"
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      <label className="block text-xs font-medium text-ink/50 mb-1">Summary</label>
      <textarea
        value={brief.summary}
        onChange={(e) => onChange({ ...brief, summary: e.target.value })}
        rows={3}
        className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none mb-4"
      />

      <label className="block text-xs font-medium text-ink/50 mb-1">What they do</label>
      <textarea
        value={brief.what_they_do}
        onChange={(e) => onChange({ ...brief, what_they_do: e.target.value })}
        rows={3}
        className="w-full rounded-md border border-ink/15 bg-paper/50 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
      />

      {brief.sources.length > 0 && (
        <p className="mt-3 text-xs text-ink/40">
          Sources: {brief.sources.map((s) => new URL(s).hostname).join(", ")}
        </p>
      )}
    </section>
  );
}
