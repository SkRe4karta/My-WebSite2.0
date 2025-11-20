"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import TechnologyBadge from "./TechnologyBadge";

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

interface ProjectCardProps {
  project: Project;
  index: number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    live: "bg-green-500/20 text-green-400 border-green-500/40",
    development: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    archived: "bg-gray-500/20 text-gray-400 border-gray-500/40",
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="glass-panel flex flex-col justify-between border border-[#4CAF50]/40 p-4 sm:p-6 hover:transform hover:-translate-y-3 hover:border-[#4CAF50]/60 hover:bg-[#444] transition-all duration-300"
    >
      <div>
        <div className="flex items-center justify-between text-sm text-[#cccccc] mb-2">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[project.status] || statusColors.development}`}>
            {project.status}
          </span>
          {project.featured && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40">
              Featured
            </span>
          )}
        </div>
        
        {project.imageUrl && (
          <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden border border-[#4CAF50]/20">
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <h3 className="text-xl font-bold text-[#4CAF50] mb-2">{project.title}</h3>
        <p className="text-[#cccccc] mb-4 line-clamp-3">{project.description}</p>
        
        {project.stack && project.stack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.stack.slice(0, 4).map((tech) => (
              <TechnologyBadge key={tech} technology={tech} size="sm" />
            ))}
            {project.stack.length > 4 && (
              <span className="px-2 py-1 text-xs rounded bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20">
                +{project.stack.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4 mt-4">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center text-sm font-bold text-[#4CAF50] transition-all duration-300 hover:text-[#45a049] hover:gap-2"
        >
          Подробнее →
        </Link>
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#cccccc] hover:text-[#4CAF50] transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        )}
        {project.demoUrl && (
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#cccccc] hover:text-[#4CAF50] transition-colors"
            aria-label="Demo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </motion.article>
  );
}

