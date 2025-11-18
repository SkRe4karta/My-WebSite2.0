"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { LoadingSpinner } from "@/components/shared";

type AuditLog = {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: any;
  createdAt: string;
};

const actionLabels: Record<string, string> = {
  login: "Вход",
  login_failed: "Неудачная попытка входа",
  logout: "Выход",
  password_change: "Изменение пароля",
  password_change_failed: "Неудачная попытка изменения пароля",
  "2fa_enabled": "Включена 2FA",
  "2fa_disabled": "Отключена 2FA",
  "2fa_failed": "Неверный код 2FA",
  file_upload: "Загрузка файла",
  file_delete: "Удаление файла",
  vault_access: "Доступ к Vault",
  note_create: "Создание заметки",
  note_update: "Обновление заметки",
  note_delete: "Удаление заметки",
  settings_change: "Изменение настроек",
  export_data: "Экспорт данных",
  backup_created: "Создание бэкапа",
  suspicious_activity: "Подозрительная активность",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadLogs();
  }, [filter, limit]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(filter !== "all" && { action: filter }),
      });
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const res = await fetch("/api/audit?export=true");
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export logs:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-[#cccccc]">Загрузка логов...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#4CAF50]">Журнал безопасности</h2>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234CAF50%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:20px] [background-position-x:calc(100%-12px)]"
          >
            <option value="all">Все действия</option>
            <option value="login">Входы</option>
            <option value="login_failed">Неудачные попытки</option>
            <option value="logout">Выходы</option>
            <option value="2fa_enabled">2FA включена</option>
            <option value="2fa_disabled">2FA отключена</option>
            <option value="suspicious_activity">Подозрительная активность</option>
          </select>
          <button
            onClick={exportLogs}
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            Экспорт
          </button>
        </div>
      </div>

      <div className="glass-panel border border-[#4CAF50]/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-white">
            <thead className="bg-[#333] border-b border-[#4CAF50]/40">
              <tr>
                <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">Дата</th>
                <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">Действие</th>
                <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">IP</th>
                <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">User-Agent</th>
                <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">Детали</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#cccccc]">
                    Нет записей
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#4CAF50]/20 hover:bg-[#333] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#cccccc]">
                      {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.action === "login"
                            ? "bg-[#4CAF50]/20 text-[#4CAF50]"
                            : log.action === "login_failed"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-[#333] text-[#cccccc]"
                        }`}
                      >
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#cccccc] font-mono text-xs">
                      {log.ipAddress || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#cccccc] text-xs max-w-xs truncate">
                      {log.userAgent || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#cccccc] text-xs">
                      {log.details ? (
                        <details className="cursor-pointer">
                          <summary className="text-[#4CAF50] hover:text-[#45a049]">
                            Показать
                          </summary>
                          <pre className="mt-2 p-2 bg-[#333] rounded text-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

