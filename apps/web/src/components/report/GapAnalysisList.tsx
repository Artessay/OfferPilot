import { Badge } from "@/components/ui/badge";
import type { ReportDetail } from "@/lib/api/types";

const SEVERITY_TONE: Record<string, "critical" | "warning" | "neutral"> = {
  high: "critical",
  medium: "warning",
  low: "neutral",
};

/** Ranked gap list (missing skills, weak expression, hard risks). */
export function GapAnalysisList({ gaps }: { gaps: ReportDetail["gaps"] }) {
  if (!gaps.length) {
    return <p className="text-sm text-muted-foreground">未发现明显差距。</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {gaps.map((gap, idx) => (
        <li
          key={idx}
          className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 text-sm"
        >
          <Badge tone={SEVERITY_TONE[gap.severity] ?? "neutral"}>{gap.severity}</Badge>
          <span className="text-foreground">{gap.description}</span>
        </li>
      ))}
    </ul>
  );
}
