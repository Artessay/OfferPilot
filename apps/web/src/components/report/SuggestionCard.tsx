import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/api/types";
import { PRIORITY, SUGGESTION_CATEGORY } from "@/lib/labels";

interface SuggestionCardProps {
  suggestion: Suggestion;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

/** Optimization suggestion card with status actions and rewrite selection. */
export function SuggestionCard({
  suggestion,
  selected,
  onToggleSelect,
  onUpdateStatus,
}: SuggestionCardProps) {
  const priority = PRIORITY[suggestion.priority] ?? { label: suggestion.priority, tone: "neutral" };
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Badge tone="primary">{SUGGESTION_CATEGORY[suggestion.category] ?? suggestion.category}</Badge>
        <Badge tone={priority.tone}>{priority.label}</Badge>
        {!suggestion.rewritable ? <Badge tone="warning">需真实补充</Badge> : null}
        {suggestion.status === "accepted" ? <Badge tone="success">已采纳</Badge> : null}
      </div>
      {suggestion.problem ? (
        <p className="text-sm font-medium text-foreground">{suggestion.problem}</p>
      ) : null}
      {suggestion.suggestion ? (
        <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
      ) : null}
      {suggestion.example ? (
        <p className="rounded-md bg-primary-light/60 p-2 text-xs text-primary">
          示例：{suggestion.example}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        {suggestion.rewritable && onToggleSelect ? (
          <Button
            size="sm"
            variant={selected ? "primary" : "outline"}
            onClick={() => onToggleSelect(suggestion.id)}
          >
            {selected ? "已选入改写" : "选入 AI 改写"}
          </Button>
        ) : null}
        {onUpdateStatus ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(suggestion.id, "accepted")}
            >
              标记已采纳
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(suggestion.id, "dismissed")}
            >
              暂不采纳
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
