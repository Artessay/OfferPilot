import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/auth/context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { reportApi } from "@/lib/api/resources";
import { DEMO_REPORT_SUMMARY } from "@/lib/demo-data";
import { MATCH_LEVEL } from "@/lib/labels";

export function ReportsPage() {
  const { user } = useAuth();
  const isGuest = !user;

  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => reportApi.list(),
    enabled: !isGuest,
  });

  const items = isGuest ? [DEMO_REPORT_SUMMARY] : (data?.items ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">匹配报告</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGuest
            ? "当前展示 Demo 报告，登录后可生成自己的匹配诊断。"
            : "查看历史岗位匹配诊断与优化建议。"}
        </p>
      </div>

      {!isGuest && isLoading ? (
        <LoadingBlock />
      ) : !items.length ? (
        <p className="text-sm text-muted-foreground">还没有报告，去岗位详情生成一份吧。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((report) => {
            const level = MATCH_LEVEL[report.matchLevel] ?? {
              label: report.matchLevel,
              tone: "neutral" as const,
            };
            return (
              <Card key={report.id}>
                <CardContent className="flex items-center justify-between gap-3 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-primary">
                      {report.overallScore}
                    </span>
                    <div>
                      <Link
                        to={`/app/reports/${report.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        查看报告
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGuest ? <Badge tone="info">Demo</Badge> : null}
                    <Badge tone={level.tone}>{level.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
