import { type FormEvent, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { jobApi } from "@/lib/api/resources";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { DEMO_JOB_SUMMARIES } from "@/lib/demo-data";
import type { JobImportResult } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";

export function JobsPage() {
  const { requireAuth, isGuest } = useRequireAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list(),
    enabled: !isGuest,
  });
  const [form, setForm] = useState({ title: "", company: "", city: "", jdText: "" });
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<JobImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      jobApi.create({
        title: form.title,
        company: form.company || undefined,
        city: form.city || undefined,
        jdText: form.jdText,
      }),
    onSuccess: () => {
      setForm({ title: "", company: "", city: "", jdText: "" });
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => jobApi.import(file),
    onSuccess: (result) => {
      setImportResult(result);
      setImportError(null);
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => {
      setImportError(getErrorMessage(err));
      setImportResult(null);
    },
  });

  const onImport = (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file) requireAuth(() => importMutation.mutate(file));
    input.value = "";
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    requireAuth(() => createMutation.mutate());
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">岗位中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">粘贴目标岗位 JD，系统会解析职责与要求。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>导入岗位 JD</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label>岗位名称</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="数据分析实习生"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>公司（可选）</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>城市（可选）</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>岗位描述（JD）</Label>
              <Textarea
                required
                rows={6}
                value={form.jdText}
                onChange={(e) => setForm({ ...form, jdText: e.target.value })}
                placeholder="岗位职责：… 任职要求：…"
              />
            </div>
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              解析并保存岗位
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>批量导入岗位</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            支持 CSV、Excel(XLSX) 或 TXT 文件。表格需包含 title、company、city、jd 列；
            TXT 文件将作为单条岗位导入（首行作为岗位名称）。
          </p>
          <label className="w-fit">
            <input
              type="file"
              accept=".csv,.xlsx,.txt,.md"
              className="hidden"
              onChange={onImport}
              disabled={importMutation.isPending}
            />
            <span className="inline-flex h-10 cursor-pointer items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-primary-light">
              {importMutation.isPending ? "导入中…" : "选择文件导入"}
            </span>
          </label>
          {importError ? <p className="text-sm text-critical">{importError}</p> : null}
          {importResult ? (
            <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3 text-sm">
              <p className="text-foreground">
                成功导入 <span className="font-semibold text-primary">{importResult.createdCount}</span>{" "}
                个岗位。
              </p>
              {importResult.errors.length ? (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
                  {importResult.errors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">已导入岗位</h2>
        {!isGuest && isLoading ? (
          <LoadingBlock />
        ) : !(isGuest ? DEMO_JOB_SUMMARIES : data?.items)?.length ? (
          <p className="text-sm text-muted-foreground">还没有岗位。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(isGuest ? DEMO_JOB_SUMMARIES : data!.items).map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-center justify-between gap-2 pt-5">
                  <div>
                    <Link
                      to={`/app/jobs/${job.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[job.company, job.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGuest ? <Badge tone="info">Demo</Badge> : null}
                    <Badge tone={job.status === "parsed" ? "success" : "neutral"}>
                      {job.status === "parsed" ? "已解析" : job.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
