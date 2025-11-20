"use client";

import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import ProjectFilters from "./ProjectFilters";

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

export default function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        // Проверяем, что data - массив, а не объект с ошибкой
        if (!Array.isArray(data)) {
          console.error("API returned non-array data:", data);
          setProjects([]);
          setFilteredProjects([]);
          setLoading(false);
          return;
        }
        
        // Убеждаемся, что stack всегда массив
        const formattedData = data.map((project: any) => {
          let stackArray: string[] = [];
          if (Array.isArray(project.stack)) {
            stackArray = project.stack;
          } else if (typeof project.stack === 'string') {
            try {
              stackArray = JSON.parse(project.stack);
            } catch {
              stackArray = [];
            }
          } else if (project.stack && typeof project.stack === 'object') {
            stackArray = Object.values(project.stack) as string[];
          }
          
          return {
            ...project,
            stack: stackArray,
          };
        });
        setProjects(formattedData);
        setFilteredProjects(formattedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
        setProjects([]);
        setFilteredProjects([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section id="projects" className="relative space-y-8">
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] text-center mb-4 sm:mb-5">Проекты</h2>
        </div>
        <div className="text-center text-[#cccccc]">Загрузка...</div>
      </section>
    );
  }

  return (
    <section id="projects" className="relative space-y-8">
      <div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] text-center mb-4 sm:mb-5">Проекты</h2>
      </div>

      {/* Описание секции проектов */}
      <div className="glass-panel p-6 md:p-8 text-white">
        <p className="text-base sm:text-lg text-[#cccccc] mb-4">
          Ниже представлен текущий проект — <strong className="text-[#4CAF50]">My-WebSite 2.0</strong>. 
          Это современный веб-сайт-портфолио с публичной и приватной частями, включающий систему управления 
          заметками, файлами, идеями и проектами. Реализована аутентификация с двухфакторной защитой, 
          система бэкапов, API для интеграций и многое другое.
        </p>
        <p className="text-base sm:text-lg text-[#cccccc]">
          <strong className="text-[#4CAF50]">Следующие проекты находятся в разработке</strong> и будут добавлены по мере готовности.
        </p>
      </div>

      {projects.length > 0 && (
        <ProjectFilters projects={projects} onFilterChange={setFilteredProjects} />
      )}

      {filteredProjects.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center text-[#cccccc] py-8">
          {projects.length === 0 ? "Проекты пока не добавлены" : "Нет проектов, соответствующих фильтрам"}
        </div>
      )}
    </section>
  );
}
