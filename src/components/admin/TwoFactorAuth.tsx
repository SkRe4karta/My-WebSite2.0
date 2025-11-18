"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function TwoFactorAuth() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      const res = await fetch("/api/auth/2fa/status");
      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.enabled);
        setError(null);
      }
    } catch (err) {
      console.error("Error checking 2FA status:", err);
    }
  };

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup");
      if (!res.ok) {
        const data = await res.json();
        // Если 2FA уже настроен, предлагаем пересоздать
        if (data.error && data.error.includes("уже настроен")) {
          setError("2FA уже настроен. Используйте кнопку 'Редактировать' для пересоздания.");
          return;
        }
        throw new Error(data.error || "Ошибка при настройке 2FA");
      }
      const data = await res.json();
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setIsSettingUp(true);
      
      // Генерируем резервные коды
      const codes = generateBackupCodes();
      setBackupCodes(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при настройке 2FA");
    } finally {
      setLoading(false);
    }
  };

  const recreate2FA = async () => {
    if (!confirm("Вы уверены, что хотите пересоздать двухфакторную аутентификацию? Старый 2FA будет удален, и вам нужно будет настроить новый.")) {
      return;
    }

    const password = prompt("Введите пароль для подтверждения:");
    if (!password) return;

    setLoading(true);
    setError(null);
    try {
      // Отключаем старый 2FA (без проверки кода, так как мы пересоздаем)
      const disableRes = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token: "RECREATE" }),
      });

      if (!disableRes.ok) {
        const data = await disableRes.json();
        // Если ошибка связана с паролем, выбрасываем ошибку
        if (data.error?.includes("Неверный пароль")) {
          throw new Error(data.error);
        }
        // Для других ошибок продолжаем (возможно, 2FA не был настроен)
      }

      // Небольшая задержка для обновления БД
      await new Promise(resolve => setTimeout(resolve, 100));

      // Теперь создаем новый
      const setupRes = await fetch("/api/auth/2fa/setup");
      if (!setupRes.ok) {
        const data = await setupRes.json();
        throw new Error(data.error || "Ошибка при создании нового 2FA");
      }
      const data = await setupRes.json();
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setIsSettingUp(true);
      
      // Генерируем резервные коды
      const codes = generateBackupCodes();
      setBackupCodes(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при пересоздании 2FA");
    } finally {
      setLoading(false);
    }
  };

  const delete2FA = async () => {
    if (!confirm("Вы уверены, что хотите полностью удалить двухфакторную аутентификацию? Это действие нельзя отменить.")) {
      return;
    }

    const password = prompt("Введите пароль для подтверждения:");
    if (!password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при удалении 2FA");
      }

      setIsEnabled(false);
      check2FAStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при удалении 2FA");
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      codes.push(code);
    }
    return codes;
  };

  const confirmSetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Введите 6-значный код из приложения");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verificationCode,
          backupCodes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при подтверждении");
      }

      setIsEnabled(true);
      setIsSettingUp(false);
      setQrCodeUrl(null);
      setSecret(null);
      setVerificationCode("");
      check2FAStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при подтверждении");
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    const password = prompt("Введите пароль для подтверждения:");
    if (!password) return;

    const token = prompt("Введите код 2FA (или резервный код):");
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка при отключении");
      }

      setIsEnabled(false);
      check2FAStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при отключении");
    } finally {
      setLoading(false);
    }
  };

  if (isSettingUp) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-6 text-white">
        <h3 className="text-xl font-semibold text-[#4CAF50] mb-4">Настройка 2FA</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#cccccc] mb-2">
              1. Отсканируйте QR код в приложении (Google Authenticator, Authy и т.д.)
            </p>
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-white rounded-xl">
                <Image src={qrCodeUrl} alt="QR Code" width={200} height={200} />
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-[#cccccc] mb-2">
              2. Или введите секрет вручную:
            </p>
            <code className="block p-3 bg-[#333] rounded-xl text-sm text-[#4CAF50] break-all">
              {secret}
            </code>
          </div>

          <div>
            <p className="text-sm text-[#cccccc] mb-2">
              3. Введите 6-значный код из приложения:
            </p>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          {backupCodes.length > 0 && (
            <div>
              <p className="text-sm text-[#cccccc] mb-2">
                Сохраните эти резервные коды в безопасном месте:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="p-2 bg-[#333] rounded text-xs text-[#4CAF50] text-center">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={confirmSetup}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Проверка..." : "Подтвердить"}
            </button>
            <button
              onClick={() => {
                setIsSettingUp(false);
                setQrCodeUrl(null);
                setSecret(null);
                setVerificationCode("");
                setError(null);
              }}
              className="px-4 rounded-xl border border-[#4CAF50]/40 bg-[#333] text-[#4CAF50] transition-all duration-300 hover:bg-[#444]"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-[#4CAF50]">Двухфакторная аутентификация</h3>
          <p className="text-sm text-[#cccccc] mt-1">
            {isEnabled
              ? "2FA включен. Ваш аккаунт защищён дополнительным уровнем безопасности."
              : "Добавьте дополнительный уровень защиты для вашего аккаунта."}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isEnabled
            ? "bg-[#4CAF50]/20 text-[#4CAF50]"
            : "bg-[#333] text-[#cccccc]"
        }`}>
          {isEnabled ? "Включено" : "Выключено"}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-sm text-rose-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!isEnabled ? (
          <button
            onClick={startSetup}
            disabled={loading}
            className="w-full rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Настройка..." : "Включить 2FA"}
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={recreate2FA}
                disabled={loading}
                className="rounded-xl border border-[#4CAF50]/40 bg-[#333] py-2 font-semibold text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Создание..." : "Редактировать"}
              </button>
              <button
                onClick={disable2FA}
                disabled={loading}
                className="rounded-xl border border-rose-500/40 bg-[#333] py-2 font-semibold text-rose-400 transition-all duration-300 hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Отключение..." : "Отключить"}
              </button>
            </div>
            <button
              onClick={delete2FA}
              disabled={loading}
              className="w-full rounded-xl border border-rose-600/40 bg-[#333] py-2 text-sm font-semibold text-rose-500 transition-all duration-300 hover:bg-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Удаление..." : "Удалить 2FA"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

