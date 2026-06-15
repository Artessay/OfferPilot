import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { LogIn, LogOut, Sparkles } from "lucide-react";

import { useAuth } from "@/app/auth/context";
import { primaryNav, secondaryNav, type NavItem } from "@/app/navigation";
import { useAuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-l-2 border-primary bg-primary-light text-primary"
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
 * right AI assistant panel. Supports guest mode (no user).
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const { showLoginModal } = useAuthModal();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const visibleSecondaryNav = isAdmin
    ? secondaryNav
    : secondaryNav.filter((item) => item.to !== "/app/settings");
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Gradient header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-gradient-to-r from-navy via-[#312E81] to-[#4C1D95] px-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-90"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-bold text-sm">
              O
            </span>
            <span className="font-semibold">Offer 捕手</span>
          </button>
          <span className="hidden text-xs text-white/60 sm:inline">OfferPilot</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/80">
          {user ? (
            <>
              <span className="hidden md:inline">{user.nickname ?? user.email ?? "用户"}</span>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                退出
              </button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => showLoginModal()}
              className="gap-1 text-white hover:bg-white/10 hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              登录
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-border bg-surface px-3 py-4 md:flex">
          <NavSection items={primaryNav} />
          <NavSection items={visibleSecondaryNav} />
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
