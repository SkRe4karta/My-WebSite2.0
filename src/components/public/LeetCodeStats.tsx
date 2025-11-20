"use client";

import { useEffect, useState } from "react";

type LeetCodeStats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
  contributionPoints: number;
};

interface LeetCodeStatsProps {
  username: string;
}

export default function LeetCodeStats({ username }: LeetCodeStatsProps) {
  const [stats, setStats] = useState<LeetCodeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/integrations/leetcode?username=${username}`)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load LeetCode stats:", err);
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return <div className="text-[#cccccc]">Загрузка статистики LeetCode...</div>;
  }

  if (!stats) {
    return <div className="text-[#cccccc]">Не удалось загрузить статистику</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#4CAF50]">LeetCode статистика</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{stats.totalSolved}</p>
          <p className="text-sm text-[#cccccc]">Всего решено</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-2xl font-bold text-[#4CAF50]">{stats.acceptanceRate}%</p>
          <p className="text-sm text-[#cccccc]">Acceptance Rate</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-lg font-semibold text-green-400">{stats.easySolved}</p>
          <p className="text-xs text-[#cccccc]">Easy</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-lg font-semibold text-yellow-400">{stats.mediumSolved}</p>
          <p className="text-xs text-[#cccccc]">Medium</p>
        </div>
        <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
          <p className="text-lg font-semibold text-red-400">{stats.hardSolved}</p>
          <p className="text-xs text-[#cccccc]">Hard</p>
        </div>
        {stats.ranking > 0 && (
          <div className="p-4 rounded-lg bg-[#333] border border-[#4CAF50]/20">
            <p className="text-lg font-semibold text-[#4CAF50]">#{stats.ranking.toLocaleString()}</p>
            <p className="text-xs text-[#cccccc]">Рейтинг</p>
          </div>
        )}
      </div>
    </div>
  );
}

