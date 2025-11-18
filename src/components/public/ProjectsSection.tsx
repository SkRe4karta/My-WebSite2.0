"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const showcase = [
  {
    title: "Личный кабинет",
    status: "v1.0 release candidate",
    stack: ["Next.js", "SQLite", "Docker"],
    description: "Приватная админка с файловым хранилищем, заметками и журналом идей.",
  },
  {
    title: "zelyonkin.ru",
    status: "live",
    stack: ["Tailwind", "Framer Motion"],
    description: "Публичная визитка с лёгкой темой, быстрой навигацией и контактами.",
  },
  {
    title: "UI playground",
    status: "R&D",
    stack: ["Figma", "Three.js"],
    description: "Эксперименты с иллюстрациями и мини-анимациями для будущих разделов.",
  },
];

export default function ProjectsSection() {
  return (
    <section id="projects" className="relative space-y-8">
      <div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] text-center mb-4 sm:mb-5">Проекты</h2>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {showcase.map((project, index) => (
          <motion.article
            key={project.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="glass-panel flex flex-col justify-between border border-[#4CAF50]/40 p-4 sm:p-6 hover:transform hover:-translate-y-3 hover:border-[#4CAF50]/60 hover:bg-[#444] transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between text-sm text-[#cccccc]">
                <span className="font-medium">{project.status}</span>
                <span className="text-[#cccccc]">{project.stack.join(" · ")}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#4CAF50]">{project.title}</h3>
              <p className="mt-3 text-[#cccccc]">{project.description}</p>
            </div>
            <Link
              href="/projects"
              className="mt-6 inline-flex items-center text-sm font-bold text-[#4CAF50] transition-all duration-300 hover:text-[#45a049] hover:gap-2"
            >
              Подробнее →
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
