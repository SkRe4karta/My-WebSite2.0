"use client";

import { useEffect, useState } from "react";
import TwoFactorAuth from "./TwoFactorAuth";

type Settings = {
  enableAnimations?: boolean;
  backupTarget?: string | null;
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({ enableAnimations: true });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSettings(data));
  }, []);

  async function save() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }

  async function changePassword() {
    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json();

      if (res.ok) {
        setPasswordMessage({ type: "success", text: data.message || "Пароль успешно изменён" });
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Ошибка при изменении пароля" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Ошибка при изменении пароля" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] min-h-[calc(100vh-200px)] text-white">
      {/* Левая колонка - Анимации и Бэкапы */}
      <div className="space-y-6">
        <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-[#4CAF50] mb-6">Настройки</h2>
          <div className="space-y-6">
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Анимации</label>
              <select
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234CAF50%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:20px] [background-position-x:calc(100%-12px)]"
                value={settings.enableAnimations ? "1" : "0"}
                onChange={(e) => setSettings({ ...settings, enableAnimations: e.target.value === "1" })}
              >
                <option value="1">Включены</option>
                <option value="0">Выключены</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Бэкап (rclone/rsync target)</label>
              <input
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
                placeholder="drive:backups/zelyonkin"
                value={settings.backupTarget ?? ""}
                onChange={(e) => setSettings({ ...settings, backupTarget: e.target.value })}
              />
            </div>
            <button 
              onClick={save} 
              className="w-full rounded-xl bg-[#4CAF50] py-3 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] hover:shadow-[0_0_20px_rgba(76,175,80,0.4)]"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
        
        {/* Смена пароля */}
        <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-[#4CAF50] mb-6">Смена пароля</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Текущий пароль</label>
              <input
                type="password"
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
                placeholder="Введите текущий пароль"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Новый пароль</label>
              <input
                type="password"
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
                placeholder="Введите новый пароль"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Подтверждение пароля</label>
              <input
                type="password"
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
                placeholder="Подтвердите новый пароль"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
            {passwordMessage && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  passwordMessage.type === "success"
                    ? "bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}
            <button
              onClick={changePassword}
              disabled={isChangingPassword || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="w-full rounded-xl bg-[#4CAF50] py-3 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] hover:shadow-[0_0_20px_rgba(76,175,80,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? "Изменение..." : "Изменить пароль"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Правая колонка - Двухфакторка */}
      <div>
        <TwoFactorAuth />
      </div>
    </div>
  );
}
