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
import { getErrorMessage } from "@/lib/errors";

export function JobsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => jobApi.list() });
  const [form, setForm] = useState({ title: "", company: "", city: "", jdText: "" });
  const [error, setError] = useState<string | null>(null);

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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
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

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">已导入岗位</h2>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.items.length ? (
          <p className="text-sm text-muted-foreground">还没有岗位。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.items.map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-center justify-between gap-2 pt-5">
                  <div>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[job.company, job.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge tone={job.status === "parsed" ? "success" : "neutral"}>
                    {job.status === "parsed" ? "已解析" : job.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
