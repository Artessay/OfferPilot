import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { DimensionScoreList } from "@/components/report/DimensionScoreList";
import { EvidencePanel } from "@/components/report/EvidencePanel";
import { GapAnalysisList } from "@/components/report/GapAnalysisList";
import { ScoreOverview } from "@/components/report/ScoreOverview";
import { SuggestionCard } from "@/components/report/SuggestionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { applicationApi, reportApi, rewriteApi } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/errors";

export function ReportDetailPage() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [trackMessage, setTrackMessage] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["reports", reportId],
    queryFn: () => reportApi.get(reportId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reportApi.updateSuggestion(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports", reportId] }),
  });

  const trackMutation = useMutation({
    mutationFn: () => {
      if (!report) throw new Error("报告未加载");
      return applicationApi.create({ jobId: report.job.jobId, reportId: report.id });
    },
    onSuccess: () => {
      setTrackMessage("已加入投递跟踪。");
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err) => setTrackMessage(getErrorMessage(err)),
  });

  const rewriteMutation = useMutation({
    mutationFn: () => {
      if (!report) throw new Error("报告未加载");
      return rewriteApi.create(report.resumeVersionId, report.id, Array.from(selected));
    },
    onSuccess: (task) => navigate(`/resume-rewrites/${task.rewriteTaskId}`),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <LoadingBlock />;
  if (!report) return <p className="text-sm text-muted-foreground">报告不存在。</p>;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {report.job.title}
          {report.job.company ? (
            <span className="ml-2 text-sm text-muted-foreground">{report.job.company}</span>
          ) : null}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => trackMutation.mutate()}
          disabled={trackMutation.isPending}
        >
          加入投递跟踪
        </Button>
        {trackMessage ? (
          <span className="text-sm text-muted-foreground">{trackMessage}</span>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-5">
          <ScoreOverview
            score={report.overallScore}
            level={report.matchLevel}
            summary={report.summary}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>维度评分</CardTitle>
          </CardHeader>
          <CardContent>
            <DimensionScoreList dimensions={report.dimensionScores} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>证据对照</CardTitle>
          </CardHeader>
          <CardContent>
            <EvidencePanel evidence={report.evidence} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>差距分析</CardTitle>
        </CardHeader>
        <CardContent>
          <GapAnalysisList gaps={report.gaps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>优化建议</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {report.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              selected={selected.has(s.id)}
              onToggleSelect={toggle}
              onUpdateStatus={(id, status) => statusMutation.mutate({ id, status })}
            />
          ))}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => rewriteMutation.mutate()}
              disabled={selected.size === 0 || rewriteMutation.isPending}
            >
              基于所选建议生成 AI 改写草稿（{selected.size}）
            </Button>
            {error ? <span className="text-sm text-critical">{error}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
