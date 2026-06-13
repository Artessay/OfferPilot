import { NavLink, Outlet } from "react-router-dom";

import { Sparkles } from "lucide-react";

import { primaryNav, secondaryNav, type NavItem } from "@/app/navigation";
import { cn } from "@/lib/utils";

function NavSection({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary-light text-primary"
                : "text-muted-foreground hover:bg-primary-light/60 hover:text-primary",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Workspace shell: top context bar + left navigation + main work area +
 * right AI assistant panel (docs/04 §4.3). The assistant panel and left nav
 * collapse on smaller screens.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-navy px-4 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary font-semibold">
            O
          </span>
          <span className="font-semibold">Offer 捕手</span>
          <span className="hidden text-xs text-white/60 sm:inline">OfferPilot</span>
        </div>
        <div className="hidden items-center gap-4 text-xs text-white/70 md:flex">
          <span>目标方向：待设置</span>
          <span>默认简历：未选择</span>
          <span>数据源：未授权</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-border bg-surface px-3 py-4 md:flex">
          <NavSection items={primaryNav} />
          <NavSection items={secondaryNav} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-border bg-surface-subtle px-4 py-6 xl:block">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-assistant" aria-hidden />
            AI 助手
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            AI 助手会根据当前页面给出下一步行动建议。完整能力将随各业务模块逐步上线。
          </p>
        </aside>
      </div>
    </div>
  );
}
