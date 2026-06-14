import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { jobApi, matchApi, resumeApi, applicationApi } from "@/lib/api/resources";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { getDemoJob, isDemoId } from "@/lib/demo-data";
import { getErrorMessage } from "@/lib/errors";

export function JobDetailPage() {
  const { jobId = "" } = useParams();
  const { requireAuth, isGuest } = useRequireAuth();
  const isDemo = isDemoId(jobId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [trackMessage, setTrackMessage] = useState<string | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId),
    enabled: !isDemo,
  });
  const { data: resumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list(),
    enabled: !isGuest,
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      const defaultResume =
        resumes?.items.find((r) => r.isDefault) ?? resumes?.items[0] ?? null;
      if (!defaultResume) throw new Error("请先在简历中心上传简历。");
      const detail = await resumeApi.get(defaultResume.id);
      const versionId = detail.latestVersion?.id;
      if (!versionId) throw new Error("默认简历尚未解析完成。");
      return matchApi.create(versionId, jobId);
    },
    onSuccess: (task) => {
      if (task.reportId) navigate(`/app/reports/${task.reportId}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const trackMutation = useMutation({
    mutationFn: () => applicationApi.create({ jobId }),
    onSuccess: () => setTrackMessage("已加入投递跟踪。"),
    onError: (err) => setTrackMessage(getErrorMessage(err)),
  });

  const favoriteMutation = useMutation({
    mutationFn: (favorite: boolean) =>
      favorite ? jobApi.removeFavorite(jobId) : jobApi.addFavorite(jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });

  const resolvedJob = isDemo ? getDemoJob(jobId) : job;

  if (!isDemo && isLoading) return <LoadingBlock />;
  if (!resolvedJob) return <p className="text-sm text-muted-foreground">岗位不存在。</p>;

  const analysis = resolvedJob.analysis;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{resolvedJob.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[resolvedJob.company, resolvedJob.city].filter(Boolean).join(" · ") || "—"}
          {isDemo ? "  ·  Demo 数据" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => requireAuth(() => matchMutation.mutate())}
          disabled={matchMutation.isPending}
        >
          {matchMutation.isPending ? "分析中…" : "用默认简历生成匹配报告"}
        </Button>
        <Button
          variant="outline"
          onClick={() => requireAuth(() => trackMutation.mutate())}
          disabled={trackMutation.isPending}
        >
          加入投递跟踪
        </Button>
        {!isDemo ? (
          <Button
            variant="outline"
            onClick={() => requireAuth(() => favoriteMutation.mutate(resolvedJob.isFavorite))}
            disabled={favoriteMutation.isPending}
          >
            {resolvedJob.isFavorite ? "取消收藏" : "收藏岗位"}
          </Button>
        ) : null}
        {error ? <span className="text-sm text-critical">{error}</span> : null}
        {trackMessage ? (
          <span className="text-sm text-muted-foreground">{trackMessage}</span>
        ) : null}
      </div>

      {analysis ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>硬技能要求</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {analysis.hardSkills.map((s) => (
                <Badge key={s} tone="primary">
                  {s}
                </Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>任职要求</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
                {analysis.requirements.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">岗位尚未解析。</p>
      )}
    </div>
  );
}
