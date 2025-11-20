"use client";

import { useEffect, useState } from "react";

type AnalyticsData = {
  notes: number;
  files: number;
  vault: number;
  activity: number;
  dailyActivity: Array<{ date: string; count: number }>;
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    fetch(`/api/analytics/stats?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analytics:", err);
        setLoading(false);
      });
  }, [period]);

  if (loading) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Аналитика</h2>
        <div className="text-[#cccccc]">Загрузка...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Аналитика</h2>
        <div className="text-[#cccccc]">Не удалось загрузить данные</div>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#4CAF50]">Аналитика</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
        >
          <option value="day">День</option>
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{data.notes}</p>
          <p className="text-sm text-[#cccccc]">Заметки</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{data.files}</p>
          <p className="text-sm text-[#cccccc]">Файлы</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{data.vault}</p>
          <p className="text-sm text-[#cccccc]">Vault</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{data.activity}</p>
          <p className="text-sm text-[#cccccc]">Активность</p>
        </div>
      </div>

      {data.dailyActivity.length > 0 && (
        <div>
          <h3 className="text-md font-semibold text-[#4CAF50] mb-2">Активность по дням</h3>
          <div className="space-y-2">
            {data.dailyActivity.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-[#cccccc] w-24">
                  {new Date(item.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                </span>
                <div className="flex-1 bg-[#333] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#4CAF50] h-full rounded-full transition-all"
                    style={{ width: `${Math.min((item.count / Math.max(...data.dailyActivity.map((d) => d.count))) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#cccccc] w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

