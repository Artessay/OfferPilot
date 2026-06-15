import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { resumeApi } from "@/lib/api/resources";
import { getDemoResume, getDemoResumeVersion, isDemoId } from "@/lib/demo-data";
import type { ResumeVersion } from "@/lib/api/types";

const STRUCTURED_FIELD_ORDER = [
  "company",
  "role",
  "name",
  "school",
  "degree",
  "major",
  "period",
  "title",
  "description",
  "organization",
  "issuer",
];

const STRUCTURED_FIELD_SET = new Set<string>(STRUCTURED_FIELD_ORDER);

export function ResumeDetailPage() {
  const { resumeId = "" } = useParams();
  const isDemo = isDemoId(resumeId);

  const { data, isLoading } = useQuery({
    queryKey: ["resumes", resumeId],
    queryFn: () => resumeApi.get(resumeId),
    enabled: !isDemo,
  });
  const { data: versions } = useQuery({
    queryKey: ["resumes", resumeId, "versions"],
    queryFn: () => resumeApi.versions(resumeId),
    enabled: !isDemo,
  });

  const resume = isDemo ? getDemoResume() : data;
  const allVersions = isDemo ? [getDemoResumeVersion()] : versions;

  if (!isDemo && isLoading) return <LoadingBlock />;
  if (!resume) return <p className="text-sm text-muted-foreground">简历不存在。</p>;

  const version = resume.latestVersion;
  const structured = version?.structuredData ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{resume.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          版本 v{version?.versionNo ?? "-"} · {resume.status === "parsed" ? "已解析" : resume.status}
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
            const items = getStructuredItems(structured[key]);
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

      {allVersions && allVersions.length >= 2 ? <VersionCompare versions={allVersions} /> : null}
    </div>
  );
}

function getStructuredItems(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return items.map(formatStructuredValue).filter(isNonEmptyString);
}

function formatStructuredValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value) return "";

  if (Array.isArray(value)) {
    return value.map(formatStructuredValue).filter(isNonEmptyString).join("；");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const orderedValues = STRUCTURED_FIELD_ORDER.map((field) => formatStructuredValue(record[field]));
    const remainingValues = Object.entries(record)
      .filter(([field]) => !STRUCTURED_FIELD_SET.has(field))
      .map(([, fieldValue]) => formatStructuredValue(fieldValue));

    return [...orderedValues, ...remainingValues].filter(isNonEmptyString).join(" · ");
  }

  return "";
}

function isNonEmptyString(value: string): boolean {
  return value.length > 0;
}

function VersionCompare({ versions }: { versions: ResumeVersion[] }) {
  const [leftId, setLeftId] = useState(versions[1]?.id ?? versions[0].id);
  const [rightId, setRightId] = useState(versions[0].id);

  const left = versions.find((v) => v.id === leftId) ?? versions[0];
  const right = versions.find((v) => v.id === rightId) ?? versions[0];

  const { added, removed } = useMemo(() => {
    const leftTags = new Set(left.skillTags);
    const rightTags = new Set(right.skillTags);
    return {
      added: right.skillTags.filter((t) => !leftTags.has(t)),
      removed: left.skillTags.filter((t) => !rightTags.has(t)),
    };
  }, [left, right]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>版本对比</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">基准版本</label>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">对比版本</label>
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">基准摘要 v{left.versionNo}</p>
            <p className="text-sm text-foreground">{left.summary ?? "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">对比摘要 v{right.versionNo}</p>
            <p className="text-sm text-foreground">{right.summary ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">新增技能：</span>
            {added.length ? (
              added.map((t) => (
                <Badge key={t} tone="success">
                  +{t}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">无</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">移除技能：</span>
            {removed.length ? (
              removed.map((t) => (
                <Badge key={t} tone="critical">
                  -{t}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">无</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
