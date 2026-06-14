import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { discoveryApi, recommendationApi } from "@/lib/api/resources";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import type { Candidate, DiscoveryTask } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";

export function DiscoveryPage() {
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();
  const [task, setTask] = useState<DiscoveryTask | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: sources } = useQuery({
    queryKey: ["job-sources"],
    queryFn: discoveryApi.listSources,
  });

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const created = await discoveryApi.createTask({ filters: { maxCandidates: 30 } });
      const list = await discoveryApi.candidates(created.discoveryTaskId);
      return { created, list };
    },
    onSuccess: ({ created, list }) => {
      setTask(created);
      setCandidates(list);
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const recommendMutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("请先发现候选岗位");
      return recommendationApi.createTiered(task.discoveryTaskId);
    },
    onSuccess: (rec) => navigate(`/app/recommendations/${rec.recommendationId}`),
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI 岗位发现</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          从授权数据源与岗位库出发，基于你的画像与简历自动发现候选岗位。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>数据源</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {sources?.map((s) => (
            <Badge key={s.id} tone={s.authStatus === "authorized" ? "success" : "warning"}>
              {s.sourceName}
            </Badge>
          )) ?? <span className="text-sm text-muted-foreground">加载中…</span>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => requireAuth(() => discoverMutation.mutate())} disabled={discoverMutation.isPending}>
          {discoverMutation.isPending ? "检索中…" : "开始 AI 岗位发现"}
        </Button>
        {task ? (
          <Button variant="outline" onClick={() => requireAuth(() => recommendMutation.mutate())}>
            生成分层推荐组合
          </Button>
        ) : null}
        {error ? <span className="text-sm text-critical">{error}</span> : null}
      </div>

      {task ? (
        <p className="text-sm text-muted-foreground">
          已发现 {task.candidateCount} 个候选岗位。
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-2 pt-5">
              <div>
                <p className="font-medium text-foreground">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.company, c.city].filter(Boolean).join(" · ") || "—"} · {c.initialReason}
                </p>
              </div>
              <Badge tone="info">候选</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
