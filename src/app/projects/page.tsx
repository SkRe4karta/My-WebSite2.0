import ProjectsSection from "@/components/public/ProjectsSection";

const roadmap = [
  { title: "Модуль заметок", items: ["Markdown", "Поиск и теги", "Черновики"] },
  { title: "Файловый менеджер", items: ["Drag-and-drop", "Preview", "Папки и подпапки"] },
  { title: "Vault", items: ["AES-256", "Отдельная папка", "Журнал действий"] },
];

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 text-white bg-[#1e1e1e]">
      <ProjectsSection />
      <section className="grid gap-6 md:grid-cols-3">
        {roadmap.map((stage) => (
          <div key={stage.title} className="glass-panel border border-[#4CAF50]/40 p-6 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#444]">
            <h3 className="text-2xl font-bold text-[#4CAF50] mb-4">{stage.title}</h3>
            <ul className="mt-4 space-y-2 text-base text-[#cccccc]">
              {stage.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
