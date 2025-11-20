"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import TechnologyBadge from "@/components/public/TechnologyBadge";
import { motion } from "framer-motion";

type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: string;
  status: string;
  stack: string[];
  githubUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      fetch(`/api/projects/${params.slug}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Project not found");
          }
          return res.json();
        })
        .then((data) => {
          // Убеждаемся, что stack всегда массив
          let stackArray: string[] = [];
          if (Array.isArray(data.stack)) {
            stackArray = data.stack;
          } else if (typeof data.stack === 'string') {
            try {
              stackArray = JSON.parse(data.stack);
            } catch {
              stackArray = [];
            }
          } else if (data.stack && typeof data.stack === 'object') {
            stackArray = Object.values(data.stack) as string[];
          }
          
          setProject({
            ...data,
            stack: stackArray,
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load project:", err);
          setLoading(false);
        });
    }
  }, [params.slug]);

  if (loading) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6 py-8 sm:py-16 text-white bg-[#1e1e1e]">
        <div className="text-center text-[#cccccc]">Загрузка...</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6 py-8 sm:py-16 text-white bg-[#1e1e1e]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#4CAF50] mb-4">Проект не найден</h1>
          <Link
            href="/"
            className="inline-flex items-center text-[#4CAF50] hover:text-[#45a049] transition-colors"
          >
            ← Вернуться на главную
          </Link>
        </div>
      </main>
    );
  }

  const statusColors: Record<string, string> = {
    live: "bg-green-500/20 text-green-400 border-green-500/40",
    development: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    archived: "bg-gray-500/20 text-gray-400 border-gray-500/40",
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6 py-8 sm:py-16 text-white bg-[#1e1e1e]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="inline-flex items-center text-sm text-[#4CAF50] hover:text-[#45a049] transition-colors mb-6"
        >
          ← Вернуться к проектам
        </Link>

        <article className="glass-panel border border-[#4CAF50]/40 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded text-sm font-medium border ${statusColors[project.status] || statusColors.development}`}>
                {project.status}
              </span>
              {project.featured && (
                <span className="px-3 py-1 rounded text-sm font-medium bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40">
                  Featured
                </span>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#4CAF50] mb-4">{project.title}</h1>
          
          {project.imageUrl && (
            <div className="relative w-full h-64 sm:h-96 mb-6 rounded-lg overflow-hidden border border-[#4CAF50]/20">
              <Image
                src={project.imageUrl}
                alt={project.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <p className="text-lg text-[#cccccc] mb-6">{project.description}</p>

          {project.content && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#4CAF50] mb-3">О проекте</h2>
              <div 
                className="prose prose-invert max-w-none text-[#cccccc] mb-4"
                dangerouslySetInnerHTML={{ __html: project.content }}
              />
              
              {project.stack && project.stack.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#4CAF50]/20">
                  <h3 className="text-lg font-semibold text-[#4CAF50] mb-3">Технологии</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((tech) => (
                      <TechnologyBadge key={tech} technology={tech} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!project.content && project.stack && project.stack.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#4CAF50] mb-3">Технологии</h2>
              <div className="flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <TechnologyBadge key={tech} technology={tech} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-6 border-t border-[#4CAF50]/20">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4CAF50]/40 bg-[#333] text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4CAF50]/40 bg-[#333] text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Демо
              </a>
            )}
          </div>
        </article>
      </motion.div>
    </main>
  );
}

