import type { ReportDetail } from "@/lib/api/types";

/** Side-by-side evidence list (resume vs JD) to reduce the black-box feel. */
export function EvidencePanel({ evidence }: { evidence: ReportDetail["evidence"] }) {
  if (!evidence.length) {
    return <p className="text-sm text-muted-foreground">暂无证据引用。</p>;
  }
  const typeLabel: Record<string, string> = {
    matched_reason: "匹配点",
    missing_reason: "缺口",
    job_requirement: "岗位要求",
    resume_evidence: "简历证据",
  };
  return (
    <ul className="flex flex-col gap-2">
      {evidence.map((item) => (
        <li key={item.id} className="rounded-md border border-border bg-surface-subtle p-3 text-sm">
          <span className="mr-2 text-xs font-medium text-assistant">
            {typeLabel[item.type] ?? item.type}
          </span>
          <span className="text-foreground">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
