import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { resumeApi } from "@/lib/api/resources";

export function ResumeDetailPage() {
  const { resumeId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["resumes", resumeId],
    queryFn: () => resumeApi.get(resumeId),
  });

  if (isLoading) return <LoadingBlock />;
  if (!data) return <p className="text-sm text-muted-foreground">简历不存在。</p>;

  const version = data.latestVersion;
  const structured = (version?.structuredData ?? {}) as Record<string, string[]>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          版本 v{version?.versionNo ?? "-"} · {data.status === "parsed" ? "已解析" : data.status}
        </p>
      </div>

      {version ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>能力标签</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {version.skillTags.length ? (
                version.skillTags.map((tag) => (
                  <Badge key={tag} tone="primary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">未识别到技能标签。</span>
              )}
            </CardContent>
          </Card>

          {(["experiences", "projects", "education", "awards"] as const).map((key) => {
            const items = structured[key] ?? [];
            if (!items.length) return null;
            const titles: Record<string, string> = {
              experiences: "实习/工作经历",
              projects: "项目经历",
              education: "教育背景",
              awards: "获奖与证书",
            };
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{titles[key]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
                    {items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">简历尚未解析完成。</p>
      )}
    </div>
  );
}
