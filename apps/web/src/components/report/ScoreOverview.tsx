import { Badge } from "@/components/ui/badge";
import { MATCH_LEVEL } from "@/lib/labels";

interface ScoreOverviewProps {
  score: number;
  level: string;
  summary?: string | null;
}

/** Match total overview — shows score with its level and a plain-language summary. */
export function ScoreOverview({ score, level, summary }: ScoreOverviewProps) {
  const meta = MATCH_LEVEL[level] ?? { label: level, tone: "neutral" as const };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-primary">{score}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="flex flex-col gap-1">
        <Badge tone={meta.tone} className="w-fit">
          {meta.label}
        </Badge>
        {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
      </div>
    </div>
  );
}
