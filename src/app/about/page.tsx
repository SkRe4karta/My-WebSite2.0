import AboutSection from "@/components/public/AboutSection";

const skills = {
  dev: ["Next.js", "TypeScript", "Node.js", "Prisma", "SQLite", "Docker"],
  design: ["Figma", "After Effects", "Notion", "Parallax", "Design systems"],
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-12 px-4 sm:px-6 py-8 sm:py-16 text-white bg-[#1e1e1e]">
      <header className="space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] text-center">Дмитрий Зелёнкин</h1>
      </header>
      <AboutSection />
      <section className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#444]">
          <h3 className="text-xl sm:text-2xl font-bold text-[#4CAF50]">Разработка</h3>
          <p className="mt-2 text-sm sm:text-base text-[#cccccc]">Стек уже развёрнут на сервере Ubuntu.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {skills.dev.map((skill) => (
              <span 
                key={skill} 
                className="rounded-full border border-[#4CAF50]/40 px-4 py-1 text-sm text-[#4CAF50] bg-[#333] transition-all duration-300 hover:border-[#4CAF50] hover:bg-[#444]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#444]">
          <h3 className="text-xl sm:text-2xl font-bold text-[#4CAF50]">Дизайн и процессы</h3>
          <p className="mt-2 text-sm sm:text-base text-[#cccccc]">UI-эксперименты, микробиблиотеки, параллакс.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {skills.design.map((skill) => (
              <span 
                key={skill} 
                className="rounded-full border border-[#4CAF50]/40 px-4 py-1 text-sm text-[#4CAF50] bg-[#333] transition-all duration-300 hover:border-[#4CAF50] hover:bg-[#444]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
