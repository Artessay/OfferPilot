import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/auth/context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { jobApi, profileApi, reportApi, resumeApi } from "@/lib/api/resources";

const QUICK_ACTIONS = [
  { to: "/profile", title: "完善求职画像", desc: "告诉 AI 你的目标与背景" },
  { to: "/resumes", title: "上传并解析简历", desc: "生成能力画像" },
  { to: "/jobs", title: "导入目标岗位 JD", desc: "解析职责与要求" },
  { to: "/jobs/discovery", title: "AI 发现候选岗位", desc: "生成分层推荐组合" },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { data: resumes } = useQuery({ queryKey: ["resumes"], queryFn: () => resumeApi.list() });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => jobApi.list() });
  const { data: reports } = useQuery({ queryKey: ["reports"], queryFn: () => reportApi.list() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: profileApi.get });

  const stats = [
    { label: "简历", value: resumes?.meta.total ?? 0, to: "/resumes" },
    { label: "岗位", value: jobs?.meta.total ?? 0, to: "/jobs" },
    { label: "匹配报告", value: reports?.meta.total ?? 0, to: "/reports" },
    { label: "目标岗位", value: profile?.targetRoles.length ?? 0, to: "/profile" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          你好{user?.nickname ? `，${user.nickname}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          完成画像与简历后，AI 将为你发现岗位、生成分层推荐并优化简历。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="pt-5">
                <div className="text-2xl font-semibold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">下一步行动</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{action.title}</CardTitle>
                  <CardDescription>{action.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
