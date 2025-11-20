"use client";

import { useEffect, useState } from "react";

type Commit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
};

interface GitHubActivityProps {
  username: string;
  token?: string;
}

export default function GitHubActivity({ username, token }: GitHubActivityProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ username, type: "activity" });
    if (token) params.append("token", token);

    fetch(`/api/integrations/github?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setCommits(data.activity || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load GitHub activity:", err);
        setLoading(false);
      });
  }, [username, token]);

  if (loading) {
    return <div className="text-[#cccccc]">Загрузка активности GitHub...</div>;
  }

  if (commits.length === 0) {
    return <div className="text-[#cccccc]">Нет недавних коммитов</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-[#4CAF50]">Последние коммиты</h3>
      <div className="space-y-2">
        {commits.slice(0, 5).map((commit) => (
          <a
            key={commit.sha}
            href={commit.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg bg-[#333] border border-[#4CAF50]/20 hover:border-[#4CAF50]/40 transition-colors"
          >
            <p className="text-sm text-[#cccccc] line-clamp-2">{commit.commit.message}</p>
            <p className="text-xs text-[#888] mt-1">
              {new Date(commit.commit.author.date).toLocaleDateString("ru-RU")}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

