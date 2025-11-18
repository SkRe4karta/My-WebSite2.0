"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

const stats = [
  { label: "Статус", value: "Студент 2 курса" },
  { label: "Формат", value: "Web + UI" },
  { label: "Город", value: "Москва" },
];

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const translateY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  return (
    <section id="hero" ref={ref} className="relative isolate overflow-hidden">
      <motion.div aria-hidden style={{ translateY }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#1e1e1e]" />
      </motion.div>

      <div className="glass-panel relative grid gap-8 sm:gap-12 px-4 sm:px-8 py-8 sm:py-16 md:px-16 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-[#4CAF50] font-semibold">zelyonkin.ru</p>
          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#ffffff] text-center md:text-left">
            Привет! Я Дмитрий Зелёнкин.
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl text-sm sm:text-base text-[#cccccc] md:text-lg text-center md:text-left">
            Учусь на втором курсе (c 2024 года) и собираю свой личный инструментарий: публичную визитку и
            приватный кабинет для проектов, заметок и учебных идей. Всё это написано на Next.js + Tailwind,
            хранится на SQLite и разворачивается на Ubuntu-сервере.
          </p>
          <div className="mt-6 sm:mt-10 flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
            <Link
              href="/projects"
              className="rounded-xl bg-[#4CAF50] px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition-all duration-300 hover:bg-[#45a049] hover:shadow-[0_0_20px_rgba(76,175,80,0.5)] active:scale-95 min-w-[140px] sm:min-w-[160px] text-center"
            >
              Проекты
            </Link>
            <Link
              href="/about"
              className="rounded-xl border-2 border-[#4CAF50] px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white transition-all duration-300 hover:bg-[#4CAF50]/20 hover:border-[#45a049] hover:shadow-[0_0_15px_rgba(76,175,80,0.3)] active:scale-95 min-w-[140px] sm:min-w-[160px] text-center"
            >
              Обо мне
            </Link>
          </div>
          <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 border-t border-[#4CAF50]/40 pt-6 sm:pt-8 grid-cols-1 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#4CAF50]/40 bg-[#333] px-6 py-4 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#444]">
                <p className="text-xs uppercase tracking-wider text-[#cccccc] font-semibold">{stat.label}</p>
                <p className="mt-2 text-xl font-bold text-[#ffffff]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center mt-6 md:mt-0">
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-square rounded-2xl bg-[#333] flex items-center justify-center border-2 border-[#4CAF50]/40 overflow-hidden shadow-[0_0_30px_rgba(76,175,80,0.3)]">
            <Image
              src="/hero-illustration.jpg"
              alt="Рисунок из таблицы"
              width={360}
              height={360}
              priority
              className="rounded-2xl object-cover w-full h-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
