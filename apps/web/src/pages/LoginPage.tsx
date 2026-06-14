import { type FormEvent, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "@/app/auth/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";

export function LoginPage() {
  const { login, register, guest } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      navigate("/", { replace: true });
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-semibold text-white">
              O
            </span>
            <CardTitle>Offer 捕手</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "登录以继续你的求职匹配" : "创建账号开始智能求职匹配"}
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            {mode === "register" ? (
              <div className="flex flex-col gap-1">
                <Label htmlFor="nickname">昵称（可选）</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="你的称呼"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
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
        </CardContent>
      </Card>
    </div>
  );
}
