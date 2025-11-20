"use client";

import Image from "next/image";

const intro = `Я учусь во втором семестре Московского политеха (поступил в 2024 году) и параллельно собираю
свою экосистему инструментов. Этот сайт — единая точка входа: публичная визитка и приватный кабинет
для заметок, файлов и сохранения идей.`;

export default function AboutSection() {
  return (
    <section id="about" className="relative grid gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] w-full">
      <div className="glass-panel p-4 sm:p-6 md:p-8 text-white">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] mb-4 sm:mb-5">Обо мне</h2>
        <p className="text-xl sm:text-2xl text-[#cccccc] mb-3 sm:mb-4 font-bold">Дмитрий Зелёнкин</p>
        <p className="mt-4 text-base sm:text-lg text-[#cccccc]">{intro}</p>
      </div>

      <div className="glass-panel relative flex items-center justify-center overflow-hidden">
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl bg-[#333] flex items-center justify-center border-2 border-[#4CAF50]/40 shadow-[0_0_30px_rgba(76,175,80,0.25)]">
          <Image
            src="/about-portrait.png"
            alt="Портрет"
            width={320}
            height={320}
            priority
            className="rounded-2xl object-cover w-full h-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </section>
  );
}
