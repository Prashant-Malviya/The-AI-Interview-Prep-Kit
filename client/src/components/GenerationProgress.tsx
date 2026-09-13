import { useEffect, useState } from "react";


const STAGES = [
  "Extracting requirements from the job description",
  "Crawling the company site",
  "Looking for how they run interviews",
  "Searching for public discussion",
  "Generating interview questions",
  "Checking coverage and closing gaps",
  "Building your study schedule",
];

export default function GenerationProgress({ startedAt }: { startedAt: string }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    const startAt = Math.min(STAGES.length - 1, Math.floor(elapsedMs / 12000));
    setStageIndex(startAt);

    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(STAGES.length - 1, i + 1));
    }, 12000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="h-3 w-3 rounded-full bg-accent animate-pulse" />
        <h2 className="font-display text-lg font-semibold text-ink">Building your kit…</h2>
      </div>
      <ul className="space-y-3">
        {STAGES.map((stage, i) => (
          <li key={stage} className="flex items-center gap-3 text-sm">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                i < stageIndex ? "bg-accent" : i === stageIndex ? "bg-accent animate-pulse" : "bg-ink/15"
              }`}
            />
            <span className={i <= stageIndex ? "text-ink" : "text-ink/40"}>{stage}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ink/40">
        This can take a minute or two - we're genuinely crawling the site and calling the model in stages, not just
        showing you a spinner.
      </p>
    </div>
  );
}
