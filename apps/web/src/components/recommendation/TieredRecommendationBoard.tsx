import { JobOpportunityCard } from "@/components/recommendation/JobOpportunityCard";
import type { TierGroup } from "@/lib/api/types";

const TIER_ACCENT: Record<string, string> = {
  priority: "border-l-primary",
  exploratory: "border-l-info",
  baseline: "border-l-success",
};

/** Tiered recommendation board — opportunity gradient, not a flat ranking. */
export function TieredRecommendationBoard({ tiers }: { tiers: TierGroup[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tiers.map((group) => (
        <section
          key={group.tier}
          className={`flex flex-col gap-3 rounded-lg border border-border border-l-4 bg-surface-subtle p-4 ${
            TIER_ACCENT[group.tier] ?? "border-l-border"
          }`}
        >
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
            <span className="text-xs text-muted-foreground">{group.items.length} 个岗位</span>
          </header>
          {group.items.length ? (
            group.items.map((item) => <JobOpportunityCard key={item.jobId} item={item} />)
          ) : (
            <p className="text-xs text-muted-foreground">该梯度暂无岗位。</p>
          )}
        </section>
      ))}
    </div>
  );
}
