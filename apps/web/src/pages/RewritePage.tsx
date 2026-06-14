import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { ResumeDiffViewer } from "@/components/resume/ResumeDiffViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { rewriteApi } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/errors";

export function RewritePage() {
  const { rewriteTaskId = "" } = useParams();
  const navigate = useNavigate();
  const [edited, setEdited] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ["resume-rewrites", rewriteTaskId],
    queryFn: () => rewriteApi.get(rewriteTaskId),
  });

  useEffect(() => {
    if (task && !edited) {
      setEdited(task.diffBlocks.map((b) => b.rewritten).join("\n"));
    }
  }, [task, edited]);

  const confirmMutation = useMutation({
    mutationFn: () => rewriteApi.confirm(rewriteTaskId, edited, "AI 改写优化版本"),
    onSuccess: () => navigate("/app/resumes"),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <LoadingBlock />;
  if (!task) return <p className="text-sm text-muted-foreground">改写任务不存在。</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI 简历改写确认</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          改写只优化表达，不会编造经历、技能或数据。请确认差异后保存为新版本。
        </p>
      </div>

      {task.materialsChecklist.length ? (
        <Card>
          <CardHeader>
            <CardTitle>需真实补充的材料</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-warning">
              {task.materialsChecklist.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>改写差异预览</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeDiffViewer blocks={task.diffBlocks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>编辑并确认新版本</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea rows={8} value={edited} onChange={(e) => setEdited(e.target.value)} />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending || !edited.trim()}
            >
              确认并保存为新简历版本
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              放弃
            </Button>
            {error ? <span className="text-sm text-critical">{error}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
