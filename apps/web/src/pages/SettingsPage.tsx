import { type FormEvent, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/app/auth/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api/resources";
import { getErrorMessage } from "@/lib/errors";

type Tab = "prompts" | "rules" | "jobs" | "users";

const TABS: { key: Tab; label: string }[] = [
  { key: "prompts", label: "提示词模板" },
  { key: "rules", label: "评分规则" },
  { key: "jobs", label: "公共岗位库" },
  { key: "users", label: "用户" },
];

export function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("prompts");

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground">该页面仅管理员可访问。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">系统设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理提示词模板、评分规则版本、公共岗位库与用户。
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prompts" ? <PromptsTab /> : null}
      {tab === "rules" ? <RulesTab /> : null}
      {tab === "jobs" ? <JobsTab /> : null}
      {tab === "users" ? <UsersTab /> : null}
    </div>
  );
}

function PromptsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "prompts"],
    queryFn: () => adminApi.listPrompts(),
  });
  const [form, setForm] = useState({ name: "", version: "", content: "" });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "prompts"] });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createPrompt({ ...form, isActive: true }),
    onSuccess: () => {
      setForm({ name: "", version: "", content: "" });
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const activateMutation = useMutation({
    mutationFn: (promptId: string) => adminApi.activatePrompt(promptId),
    onSuccess: () => void invalidate(),
  });
  const deleteMutation = useMutation({
    mutationFn: (promptId: string) => adminApi.deletePrompt(promptId),
    onSuccess: () => void invalidate(),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>新增提示词模板</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>名称</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="resume_parse"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>版本</Label>
                <Input
                  required
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="v1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>内容</Label>
              <Textarea
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              创建并启用
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">还没有提示词模板。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((prompt) => (
            <Card key={prompt.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{prompt.name}</span>
                    <span className="text-xs text-muted-foreground">{prompt.version}</span>
                    {prompt.isActive ? <Badge tone="success">启用中</Badge> : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {prompt.content}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!prompt.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activateMutation.mutate(prompt.id)}
                    >
                      启用
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(prompt.id)}
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RulesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "rules"],
    queryFn: () => adminApi.listRules(),
  });
  const [form, setForm] = useState({ name: "", version: "", weights: "{}" });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "rules"] });

  const createMutation = useMutation({
    mutationFn: () => {
      let weights: Record<string, number>;
      try {
        weights = JSON.parse(form.weights) as Record<string, number>;
      } catch {
        throw new Error("权重必须是合法 JSON。");
      }
      return adminApi.createRule({ name: form.name, version: form.version, weights, isActive: true });
    },
    onSuccess: () => {
      setForm({ name: "", version: "", weights: "{}" });
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const activateMutation = useMutation({
    mutationFn: (ruleId: string) => adminApi.activateRule(ruleId),
    onSuccess: () => void invalidate(),
  });
  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => adminApi.deleteRule(ruleId),
    onSuccess: () => void invalidate(),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>新增评分规则</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>名称</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="default"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>版本</Label>
                <Input
                  required
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="v1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>权重（JSON）</Label>
              <Textarea
                rows={4}
                value={form.weights}
                onChange={(e) => setForm({ ...form, weights: e.target.value })}
                placeholder='{"hard_skill": 0.3, "experience": 0.3}'
              />
            </div>
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              创建并启用
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">还没有评分规则。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{rule.name}</span>
                    <span className="text-xs text-muted-foreground">{rule.version}</span>
                    {rule.isActive ? <Badge tone="success">启用中</Badge> : null}
                  </div>
                  <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(rule.weights)}
                  </pre>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!rule.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activateMutation.mutate(rule.id)}
                    >
                      启用
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(rule.id)}>
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function JobsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => adminApi.listJobs(),
  });
  const [form, setForm] = useState({ title: "", company: "", city: "", jdText: "" });
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createJob({
        title: form.title,
        company: form.company || undefined,
        city: form.city || undefined,
        jdText: form.jdText,
      }),
    onSuccess: () => {
      setForm({ title: "", company: "", city: "", jdText: "" });
      setError(null);
      void invalidate();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => adminApi.deleteJob(jobId),
    onSuccess: () => void invalidate(),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>新增公共岗位</CardTitle>
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
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>公司</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>城市</Label>
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
                rows={4}
                value={form.jdText}
                onChange={(e) => setForm({ ...form, jdText: e.target.value })}
              />
            </div>
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              新增到公共岗位库
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">公共岗位库为空。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.items.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <span className="font-medium text-foreground">{job.title}</span>
                  <p className="text-xs text-muted-foreground">
                    {[job.company, job.city].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(job.id)}>
                  删除
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.listUsers(),
  });

  if (isLoading) return <LoadingBlock />;
  if (!data?.items.length) return <p className="text-sm text-muted-foreground">暂无用户。</p>;

  return (
    <div className="flex flex-col gap-2">
      {data.items.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex items-center justify-between gap-3 pt-5">
            <div>
              <span className="font-medium text-foreground">
                {u.nickname ?? u.email ?? "匿名用户"}
              </span>
              <p className="text-xs text-muted-foreground">
                {u.email ?? "—"} · {new Date(u.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={u.role === "admin" ? "primary" : "neutral"}>{u.role}</Badge>
              <Badge tone="neutral">{u.accountType}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
