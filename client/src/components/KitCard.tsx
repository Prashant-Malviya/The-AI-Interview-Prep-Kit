import { Link } from "react-router-dom";
import { KitRecord } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-ink/10 text-ink/60",
  generating: "bg-accentLight text-accent",
  ready: "bg-accent/15 text-accent",
  failed: "bg-warn/15 text-warn",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  generating: "Generating…",
  ready: "Ready",
  failed: "Failed",
};

export default function KitCard({ kit }: { kit: KitRecord }) {
  const title = kit.kit?.role.title || "Untitled role";
  const company = kit.kit?.source.company || new URL(safeUrl(kit.inputCompanyUrl)).hostname;

  return (
    <Link to={`/kits/${kit._id}`} className="block">
      <div className="rounded-lg border border-ink/10 bg-white p-5 hover:border-accent/40 transition-colors h-full flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[kit.status]}`}>
              {STATUS_LABEL[kit.status]}
            </span>
          </div>
          <p className="text-sm text-ink/60 mt-1">{company}</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-ink/40">
          <span>{kit.inputDays} day plan</span>
          <span>{new Date(kit.createdAt).toLocaleDateString()}</span>
        </div>
        {kit.status === "failed" && kit.failureReason && (
          <p className="mt-2 text-xs text-warn line-clamp-2">{kit.failureReason}</p>
        )}
      </div>
    </Link>
  );
}

function safeUrl(url: string): string {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    return "http://unknown.invalid";
  }
}
