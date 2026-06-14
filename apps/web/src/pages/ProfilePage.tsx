import { type FormEvent, useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { profileApi } from "@/lib/api/resources";
import type { ProfileInput } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";

const toList = (value: string): string[] =>
  value
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: profileApi.get });
  const { data: skillHints } = useQuery({
    queryKey: ["profile", "skills"],
    queryFn: profileApi.suggestSkills,
  });

  const [form, setForm] = useState({
    educationLevel: "",
    graduationYear: "",
    targetRoles: "",
    targetCities: "",
    industries: "",
    skills: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        educationLevel: profile.educationLevel ?? "",
        graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
        targetRoles: profile.targetRoles.join("、"),
        targetCities: profile.targetCities.join("、"),
        industries: profile.industries.join("、"),
        skills: profile.skills.join("、"),
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (input: ProfileInput) => profileApi.update(input),
    onSuccess: () => {
      setMessage("画像已保存");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => setMessage(getErrorMessage(err)),
  });

  if (isLoading) return <LoadingBlock />;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      educationLevel: form.educationLevel || undefined,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined,
      targetRoles: toList(form.targetRoles),
      targetCities: toList(form.targetCities),
      industries: toList(form.industries),
      skills: toList(form.skills),
    });
  };

  const addSkill = (skill: string) => {
    const current = toList(form.skills);
    if (!current.includes(skill)) {
      setForm({ ...form, skills: [...current, skill].join("、") });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">求职画像</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 将基于你的目标与背景发现岗位、生成推荐并优化简历。
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field label="学历">
              <Input
                value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
                placeholder="本科 / 硕士"
              />
            </Field>
            <Field label="毕业年份">
              <Input
                value={form.graduationYear}
                onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
                placeholder="2026"
              />
            </Field>
            <Field label="目标岗位（顿号分隔）">
              <Input
                value={form.targetRoles}
                onChange={(e) => setForm({ ...form, targetRoles: e.target.value })}
                placeholder="数据分析师、商业分析"
              />
            </Field>
            <Field label="目标城市">
              <Input
                value={form.targetCities}
                onChange={(e) => setForm({ ...form, targetCities: e.target.value })}
                placeholder="上海、杭州"
              />
            </Field>
            <Field label="目标行业">
              <Input
                value={form.industries}
                onChange={(e) => setForm({ ...form, industries: e.target.value })}
                placeholder="互联网、消费"
              />
            </Field>
            <Field label="技能标签">
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="SQL、Python"
              />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                保存画像
              </Button>
              {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
            </div>
          </form>

          {skillHints?.skills.length ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-sm text-muted-foreground">AI 建议技能（点击添加）：</p>
              <div className="flex flex-wrap gap-2">
                {skillHints.skills.map((skill) => (
                  <button key={skill} type="button" onClick={() => addSkill(skill)}>
                    <Badge tone="primary">+ {skill}</Badge>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
