import { type FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/app/auth/context";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";

export function LoginModal() {
  const { login, register, guest } = useAuth();
  const { open, hideLoginModal, onSuccess } = useAuthModal();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setNickname("");
      setError(null);
      setMode("login");
    }
  }, [open]);

  if (!open) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      hideLoginModal();
      onSuccess?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run(() =>
      mode === "login" ? login(email, password) : register(email, password, nickname || undefined),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={hideLoginModal}
        onKeyDown={(e) => e.key === "Escape" && hideLoginModal()}
        role="presentation"
      />

      {/* modal */}
      <div className="animate-slide-up relative z-10 mx-4 w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-glow">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-assistant font-semibold text-white">
            O
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">登录 Offer 捕手</h2>
            <p className="text-xs text-muted-foreground">登录后解锁完整功能</p>
          </div>
        </div>

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          {mode === "register" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="modal-nickname">昵称（可选）</Label>
              <Input
                id="modal-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的称呼"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <Label htmlFor="modal-email">邮箱</Label>
            <Input
              id="modal-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="modal-password">密码</Label>
            <Input
              id="modal-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 8 位"
            />
          </div>
          {error ? <p className="text-sm text-critical">{error}</p> : null}
          <Button type="submit" disabled={busy} className="mt-1">
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-primary"
            onClick={() => void run(guest)}
            disabled={busy}
          >
            匿名体验
          </button>
        </div>

        {/* close button */}
        <button
          type="button"
          onClick={hideLoginModal}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
