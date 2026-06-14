import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { applicationApi } from "@/lib/api/resources";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/api/types";
import { APPLICATION_STATUS, APPLICATION_STATUS_ORDER } from "@/lib/labels";

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationApi.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      applicationApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => applicationApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  const grouped = groupByStatus(data?.items ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">投递跟踪</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          按求职阶段管理岗位投递进展，记录笔试、面试与 Offer 状态。
        </p>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">
          还没有投递记录，去岗位详情或匹配报告点击「加入投递跟踪」吧。
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {APPLICATION_STATUS_ORDER.map((status) => {
            const meta = APPLICATION_STATUS[status];
            const items = grouped[status] ?? [];
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="flex flex-col gap-2 pt-4">
                        <Link
                          to={`/app/jobs/${record.job.jobId}`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {record.job.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {[record.job.company, record.job.city].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {record.note ? (
                          <p className="text-xs text-muted-foreground">{record.note}</p>
                        ) : null}
                        <div className="flex items-center justify-between gap-2">
                          <select
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                            value={record.status}
                            onChange={(e) =>
                              updateMutation.mutate({
                                id: record.id,
                                status: e.target.value as ApplicationStatus,
                              })
                            }
                          >
                            {APPLICATION_STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {APPLICATION_STATUS[s].label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-critical"
                            onClick={() => removeMutation.mutate(record.id)}
                          >
                            删除
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByStatus(
  items: ApplicationRecord[],
): Partial<Record<ApplicationStatus, ApplicationRecord[]>> {
  const groups: Partial<Record<ApplicationStatus, ApplicationRecord[]>> = {};
  for (const item of items) {
    (groups[item.status] ??= []).push(item);
  }
  return groups;
}
