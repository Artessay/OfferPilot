import { useNavigate } from "react-router-dom";

import {
  Briefcase,
  ChevronRight,
  FileText,
  Layers,
  ClipboardCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { useAuth } from "@/app/auth/context";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FileText,
    title: "智能简历解析",
    desc: "上传简历，AI 自动提取技能画像与经历结构",
    color: "from-primary to-assistant",
  },
  {
    icon: Briefcase,
    title: "岗位精准匹配",
    desc: "导入 JD，生成多维度匹配报告与差距分析",
    color: "from-assistant to-accent",
  },
  {
    icon: Layers,
    title: "AI 岗位发现",
    desc: "基于画像与简历，自动发现并推荐分层岗位组合",
    color: "from-accent to-warning",
  },
  {
    icon: Zap,
    title: "一键简历优化",
    desc: "根据匹配建议，AI 生成针对性改写方案",
    color: "from-success to-info",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const enterApp = () => navigate("/app");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-assistant font-bold text-white">
              O
            </span>
            <span className="text-lg font-bold text-foreground">Offer 捕手</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">OfferPilot</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={enterApp}>进入工作台</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  登录
                </Button>
                <Button onClick={enterApp}>免费体验</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* animated gradient background */}
        <div className="animate-gradient-x absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-assistant/10 bg-[length:200%_100%]" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <div className="animate-fade-in">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              AI 驱动的智能求职平台
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              让每一份简历
              <span className="bg-gradient-to-r from-primary via-assistant to-accent bg-clip-text text-transparent">
                精准命中
              </span>
              目标岗位
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              OfferPilot 为你智能解析简历、深度匹配岗位、发现高价值机会，并一键生成针对性优化方案。从投递到 Offer，AI 全程助力。
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" onClick={enterApp} className="gap-2 shadow-glow">
                免费体验
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!user && (
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  登录 / 注册
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            四大核心能力，覆盖求职全流程
          </h2>
          <p className="mt-2 text-muted-foreground">
            无需注册即可体验所有功能，感受 AI 如何提升你的求职效率
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="animate-slide-up group rounded-lg border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} text-white shadow-sm`}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface-subtle py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
            三步开启 AI 求职
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "上传简历", desc: "AI 自动解析技能、经历与教育背景" },
              { step: "02", title: "导入目标 JD", desc: "深度分析岗位要求，生成匹配报告" },
              { step: "03", title: "AI 优化简历", desc: "针对差距一键改写，精准命中目标" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-assistant text-lg font-bold text-white">
                  {s.step}
                </div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            准备好提升求职效率了吗？
          </h2>
          <p className="mt-3 text-muted-foreground">
            无需注册，立即用 Demo 简历体验完整匹配流程
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={enterApp} className="gap-2 shadow-glow">
              立即体验
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <p className="flex items-center justify-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" />
            OfferPilot — AI 驱动的智能求职匹配平台
          </p>
        </div>
      </footer>
    </div>
  );
}
