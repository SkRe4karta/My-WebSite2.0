"use client";

import { useState, useMemo } from "react";

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  stack: string[];
  githubUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  featured: boolean;
};

interface ProjectFiltersProps {
  projects: Project[];
  onFilterChange: (filtered: Project[]) => void;
}

export default function ProjectFilters({ projects, onFilterChange }: ProjectFiltersProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedStack, setSelectedStack] = useState<string>("all");
  const [showFeatured, setShowFeatured] = useState<boolean>(false);

  // Получаем все уникальные технологии
  const allStacks = useMemo(() => {
    const stacks = new Set<string>();
    projects.forEach((project) => {
      if (project.stack) {
        project.stack.forEach((tech) => stacks.add(tech));
      }
    });
    return Array.from(stacks).sort();
  }, [projects]);

  // Получаем все статусы
  const allStatuses = useMemo(() => {
    const statuses = new Set<string>();
    projects.forEach((project) => {
      statuses.add(project.status);
    });
    return Array.from(statuses).sort();
  }, [projects]);

  // Фильтрация проектов
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    if (selectedStatus !== "all") {
      filtered = filtered.filter((p) => p.status === selectedStatus);
    }

    if (selectedStack !== "all") {
      filtered = filtered.filter((p) => p.stack && p.stack.includes(selectedStack));
    }

    if (showFeatured) {
      filtered = filtered.filter((p) => p.featured);
    }

    return filtered;
  }, [projects, selectedStatus, selectedStack, showFeatured]);

  // Уведомляем родителя об изменении фильтров
  useMemo(() => {
    onFilterChange(filteredProjects);
  }, [filteredProjects, onFilterChange]);

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 mb-6">
      <h3 className="text-lg font-semibold text-[#4CAF50] mb-4">Фильтры</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Фильтр по статусу */}
        <div>
          <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Статус</label>
          <select
            className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Все</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Фильтр по технологиям */}
        <div>
          <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Технология</label>
          <select
            className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer"
            value={selectedStack}
            onChange={(e) => setSelectedStack(e.target.value)}
          >
            <option value="all">Все</option>
            {allStacks.map((stack) => (
              <option key={stack} value={stack}>
                {stack}
              </option>
            ))}
          </select>
        </div>

        {/* Фильтр по избранным */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showFeatured}
              onChange={(e) => setShowFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-[#4CAF50]/40 bg-[#333] text-[#4CAF50] focus:ring-[#4CAF50] focus:ring-2"
            />
            <span className="text-sm text-[#cccccc]">Только избранные</span>
          </label>
        </div>
      </div>

      {/* Сброс фильтров */}
      {(selectedStatus !== "all" || selectedStack !== "all" || showFeatured) && (
        <button
          onClick={() => {
            setSelectedStatus("all");
            setSelectedStack("all");
            setShowFeatured(false);
          }}
          className="mt-4 text-sm text-[#4CAF50] hover:text-[#45a049] transition-colors"
        >
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}

