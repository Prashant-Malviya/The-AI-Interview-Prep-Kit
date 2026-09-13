import { Requirement } from "@/lib/types";

export default function RequirementBadge({ requirement }: { requirement: Requirement }) {
  const priorityStyle =
    requirement.priority === "must" ? "bg-accent/15 text-accent" : "bg-ink/10 text-ink/60";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`rounded-full px-2 py-0.5 font-medium ${priorityStyle}`}>
        {requirement.priority === "must" ? "Must have" : "Nice to have"}
      </span>
      <span className="text-ink/40">{requirement.kind}</span>
    </span>
  );
}
