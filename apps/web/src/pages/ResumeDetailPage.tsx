import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { resumeApi } from "@/lib/api/resources";
import type { ResumeVersion, ResumeVersionUpdateInput } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { getDemoResume, getDemoResumeVersion, isDemoId } from "@/lib/demo-data";
import { downloadBlob } from "@/lib/utils";

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

const EDITABLE_SECTIONS = [
  { key: "experiences", title: "实习/工作经历" },
  { key: "projects", title: "项目经历" },
  { key: "education", title: "教育背景" },
  { key: "awards", title: "获奖与证书" },
] as const;

/** Split a textarea value into trimmed, non-empty lines. */
function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Split a skill-tag editor value on newlines/commas, de-duplicated. */
function splitTags(value: string): string[] {
  const parts = value
    .split(/[\n,，、]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return [...new Set(parts)];
}

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

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState("");
  const [editSections, setEditSections] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (input: ResumeVersionUpdateInput) => resumeApi.update(resumeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes", resumeId] });
      queryClient.invalidateQueries({ queryKey: ["resumes", resumeId, "versions"] });
      setEditing(false);
      setEditError(null);
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const { blob, filename } = await resumeApi.download(resumeId);
      downloadBlob(blob, filename);
    },
  });

  const resume = isDemo ? getDemoResume() : data;
  const allVersions = isDemo ? [getDemoResumeVersion()] : versions;

  if (!isDemo && isLoading) return <LoadingBlock />;
  if (!resume) return <p className="text-sm text-muted-foreground">简历不存在。</p>;

  const version = resume.latestVersion;
  const structured = version?.structuredData ?? {};

  const startEdit = () => {
    setEditTags((version?.skillTags ?? []).join("\n"));
    const sections: Record<string, string> = {};
    for (const { key } of EDITABLE_SECTIONS) {
      sections[key] = getStructuredItems(structured[key]).join("\n");
    }
    setEditSections(sections);
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = () => {
    const structuredData: Record<string, unknown> = { ...structured };
    for (const { key } of EDITABLE_SECTIONS) {
      structuredData[key] = splitLines(editSections[key] ?? "");
    }
    updateMutation.mutate({ structuredData, skillTags: splitTags(editTags) });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{resume.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            版本 v{version?.versionNo ?? "-"} ·{" "}
            {resume.status === "parsed" ? "已解析" : resume.status}
          </p>
        </div>
        {!isDemo ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMutation.mutate()}
              disabled={downloadMutation.isPending}
            >
              下载原件
            </Button>
            {version && !editing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                编辑信息
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {version ? (
        editing ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>能力标签</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Textarea
                  rows={3}
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="每行一个技能标签，也可用逗号分隔"
                />
                <p className="text-xs text-muted-foreground">每行一个技能标签，保存后将自动去重。</p>
              </CardContent>
            </Card>

            {EDITABLE_SECTIONS.map(({ key, title }) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Textarea
                    rows={5}
                    value={editSections[key] ?? ""}
                    onChange={(e) =>
                      setEditSections((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder="每行一条内容"
                  />
                  <p className="text-xs text-muted-foreground">每行一条内容，空行将被忽略。</p>
                </CardContent>
              </Card>
            ))}

            {editError ? <p className="text-sm text-critical">{editError}</p> : null}

            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中…" : "保存"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditError(null);
                }}
                disabled={updateMutation.isPending}
              >
                取消
              </Button>
            </div>
          </>
        ) : (
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

            {EDITABLE_SECTIONS.map(({ key, title }) => {
              const items = getStructuredItems(structured[key]);
              if (!items.length) return null;
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
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
        )
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
