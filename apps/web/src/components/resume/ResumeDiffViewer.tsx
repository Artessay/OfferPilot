import type { DiffBlock } from "@/lib/api/types";

/** Resume rewrite diff viewer: original vs rewritten, with reason + risk note. */
export function ResumeDiffViewer({ blocks }: { blocks: DiffBlock[] }) {
  if (!blocks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        没有可自动改写的片段，建议根据材料清单据实补充后手动编辑。
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{block.section}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md bg-[#FBE9E7]/40 p-3 text-sm">
              <p className="mb-1 text-xs text-critical">改写前</p>
              <p className="text-foreground">{block.original}</p>
            </div>
            <div className="rounded-md bg-[#E6F4EA]/50 p-3 text-sm">
              <p className="mb-1 text-xs text-success">改写后</p>
              <p className="text-foreground">{block.rewritten}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">原因：{block.reason}</p>
          <p className="text-xs text-warning">⚠ {block.riskWarning}</p>
        </div>
      ))}
    </div>
  );
}
