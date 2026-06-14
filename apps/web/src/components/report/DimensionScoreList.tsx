import type { DimensionScore } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Per-dimension score bars with weights (design: never hide dimensions). */
export function DimensionScoreList({ dimensions }: { dimensions: DimensionScore[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {dimensions.map((dim) => (
        <li key={dim.code} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">
              {dim.name}
              <span className="ml-2 text-xs text-muted-foreground">权重 {dim.weight}%</span>
            </span>
            <span className="font-medium text-foreground">{dim.score}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                dim.score >= 70 ? "bg-primary" : dim.score >= 55 ? "bg-warning" : "bg-critical",
              )}
              style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
