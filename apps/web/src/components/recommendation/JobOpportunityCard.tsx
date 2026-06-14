import { Badge } from "@/components/ui/badge";
import type { TierItem } from "@/lib/api/types";
import { RISK_LEVEL, formatProbability } from "@/lib/labels";

/** Candidate job card — shows all decision indicators, never only the score. */
export function JobOpportunityCard({ item }: { item: TierItem }) {
  const risk = RISK_LEVEL[item.riskLevel] ?? { label: item.riskLevel, tone: "neutral" as const };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{item.title}</p>
          {item.company ? (
            <p className="text-xs text-muted-foreground">{item.company}</p>
          ) : null}
        </div>
        <Badge tone={risk.tone}>{risk.label}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Indicator label="岗位匹配度" value={String(item.matchScore)} />
        <Indicator label="成功率预测" value={formatProbability(item.successProbability)} hint="预测" />
        <Indicator label="机会价值" value={String(item.opportunityValue)} />
      </div>
      <p className="text-xs text-muted-foreground">{item.tierReason}</p>
      <p className="text-xs text-assistant">下一步：{item.suggestedAction}</p>
    </div>
  );
}

function Indicator({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-surface-subtle p-2">
      <div className="text-base font-semibold text-primary">{value}</div>
      <div className="text-[11px] text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-warning">({hint})</span> : null}
      </div>
    </div>
  );
}
