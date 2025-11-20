"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState, useTransition } from "react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/admin";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data: any = {
      username: form.username.value,
      password: form.password.value,
    };

    // Если требуется 2FA, добавляем код
    if (requires2FA) {
      data.totpCode = totpCode;
    }

    startTransition(async () => {
      setError(null);
      const res = await signIn("credentials", {
        ...data,
        redirect: false,
      }) as { error?: string } | undefined;
      if (res?.error) {
        const errorString = res.error;
        if (errorString === "2FA_REQUIRED") {
          setRequires2FA(true);
          setError(null);
          return;
        }
        const errorMessage = errorString === "CredentialsSignin" 
          ? "Неверный логин или пароль"
          : errorString;
        setError(errorMessage);
        return;
      }
      window.location.assign(callbackUrl);
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1e1e1e] px-4">
      <div className="glass-panel w-full max-w-md border border-[#4CAF50]/30 bg-[#333] p-8 text-white">
        <h1 className="text-5xl font-bold text-[#4CAF50] mb-2 text-center">Доступ</h1>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-bold text-[#cccccc]">Логин</label>
            <input
              name="username"
              className="mt-2 w-full rounded-xl border border-[#4CAF50]/30 bg-[#444] px-4 py-3 text-white shadow-sm"
              type="text"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-[#cccccc]">Пароль</label>
            <input
              name="password"
              className="mt-2 w-full rounded-xl border border-[#4CAF50]/30 bg-[#444] px-4 py-3 text-white shadow-sm"
              type="password"
              autoComplete="off"
              required
              disabled={requires2FA}
            />
          </div>
          {requires2FA && (
            <div>
              <label className="text-sm font-bold text-[#cccccc]">Код 2FA</label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 w-full rounded-xl border border-[#4CAF50]/30 bg-[#444] px-4 py-3 text-white shadow-sm text-center text-2xl tracking-widest"
                type="text"
                placeholder="000000"
                maxLength={6}
                autoComplete="off"
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-[#cccccc]">
                Введите 6-значный код из приложения аутентификации или резервный код
              </p>
            </div>
          )}
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={isPending || (requires2FA && totpCode.length !== 6)}
            className="w-full rounded-xl bg-[#4CAF50] py-3 text-center text-base font-bold text-white transition hover:bg-[#45a049] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (requires2FA ? "Проверяем код..." : "Проверяем...") : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Загрузка формы…</div>}>
      <LoginForm />
    </Suspense>
  );
}
