"use client";

import { useState, useEffect } from "react";
import DraggableDashboard from "@/components/admin/DraggableDashboard";
import Link from "next/link";

type Widget = {
  id: string;
  title: string;
  content: React.ReactNode;
  height: number;
  visible: boolean;
};

export default function AdminDashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [stats, setStats] = useState({
    notes: 0,
    files: 0,
    folders: 0,
    vault: 0,
    ideas: 0,
    publishedNotes: 0,
    draftNotes: 0,
    archivedNotes: 0,
    totalFileSize: 0,
  });

  useEffect(() => {
    // Загружаем статистику
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load stats", err));

    // Загружаем сохранённую конфигурацию виджетов
    const saved = localStorage.getItem("admin-widgets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Восстанавливаем виджеты с правильным контентом (React элементы нельзя сериализовать)
        const restored: Widget[] = parsed.map((w: any) => {
          if (w.id === "stats") {
            return {
              ...w,
              content: createStatsContent(stats),
            };
          } else if (w.id === "quick-actions") {
            return {
              ...w,
              content: (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/admin/notes"
                    className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
                  >
                    Новая заметка
                  </Link>
                  <Link
                    href="/admin/files"
                    className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
                  >
                    Загрузить файл
                  </Link>
                  <Link
                    href="/admin/vault"
                    className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
                  >
                    Добавить секрет
                  </Link>
                  <Link
                    href="/admin/journal"
                    className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
                  >
                    Новая идея
                  </Link>
                </div>
              ),
            };
          } else if (w.id === "info") {
            return {
              ...w,
              content: (
                <div className="text-sm text-[#cccccc]">
                  <p>Создайте заметку или идею — всё синхронизируется автоматически.</p>
                  <p className="mt-2">Все данные хранятся локально: SQLite + storage/uploads + storage/vault.</p>
                </div>
              ),
            };
          }
          return w;
        });
        setWidgets(restored);
      } catch (e) {
        console.error("Failed to parse saved widgets", e);
        createDefaultWidgets();
      }
    } else {
      createDefaultWidgets();
    }
  }, []);

  const createStatsContent = (currentStats: typeof stats) => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-4xl font-bold text-[#4CAF50]">{currentStats.notes}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Заметки</p>
          <div className="mt-2 flex gap-2 text-xs text-[#4CAF50]/60 justify-center">
            <span>Опублик: {currentStats.publishedNotes}</span>
            <span>•</span>
            <span>Черновик: {currentStats.draftNotes}</span>
          </div>
        </div>
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-4xl font-bold text-[#4CAF50]">{currentStats.files}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Файлы</p>
          <p className="mt-2 text-xs text-[#4CAF50]/60">{currentStats.totalFileSize} MB</p>
        </div>
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-4xl font-bold text-[#4CAF50]">{currentStats.folders}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Папки</p>
        </div>
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-4xl font-bold text-[#4CAF50]">{currentStats.vault}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Vault</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-3xl font-bold text-[#4CAF50]">{currentStats.ideas}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Идеи в календаре</p>
        </div>
        <div className="text-center p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333]/50">
          <p className="text-3xl font-bold text-[#4CAF50]">{currentStats.archivedNotes}</p>
          <p className="mt-2 text-sm text-[#cccccc]">Архивные заметки</p>
        </div>
      </div>
    </div>
  );

  const createDefaultWidgets = () => {
    const defaultWidgets: Widget[] = [
      {
        id: "stats",
        title: "Статистика",
        height: 350,
        visible: true,
        content: createStatsContent(stats),
      },
      {
        id: "quick-actions",
        title: "Быстрые действия",
        height: 150,
        visible: true,
        content: (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/notes"
              className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
            >
              Новая заметка
            </Link>
            <Link
              href="/admin/files"
              className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
            >
              Загрузить файл
            </Link>
            <Link
              href="/admin/vault"
              className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
            >
              Добавить секрет
            </Link>
            <Link
              href="/admin/journal"
              className="rounded-full border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
            >
              Новая идея
            </Link>
          </div>
        ),
      },
      {
        id: "info",
        title: "Информация",
        height: 120,
        visible: true,
        content: (
          <div className="text-sm text-[#cccccc]">
            <p>Создайте заметку или идею — всё синхронизируется автоматически.</p>
            <p className="mt-2">Все данные хранятся локально: SQLite + storage/uploads + storage/vault.</p>
          </div>
        ),
      },
    ];
    setWidgets(defaultWidgets);
  };

  // Обновляем контент виджета статистики при изменении stats
  useEffect(() => {
    if (widgets.length > 0) {
      const updated = widgets.map((w) => {
        if (w.id === "stats") {
          return {
            ...w,
            content: createStatsContent(stats),
          };
        }
        return w;
      });
      setWidgets(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  const handleWidgetsChange = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    // Сохраняем только сериализуемые данные (без React элементов)
    const serializable = newWidgets.map((w) => ({
      id: w.id,
      title: w.title,
      height: w.height,
      visible: w.visible,
      // content не сохраняем, так как это React элементы
    }));
    localStorage.setItem("admin-widgets", JSON.stringify(serializable));
  };

  if (widgets.length === 0) {
    return <div className="text-white">Загрузка...</div>;
  }

  // Разделяем виджеты: статистика слева, остальные справа
  const statsWidget = widgets.find(w => w.id === "stats");
  const otherWidgets = widgets.filter(w => w.id !== "stats");

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[2fr_1fr] text-white">
      {/* Левая колонка - Статистика (больше) */}
      <div>
        {statsWidget && (
          <DraggableDashboard 
            widgets={[statsWidget]} 
            onWidgetsChange={(newWidgets) => {
              if (newWidgets.length > 0) {
                const updated = widgets.map(w => w.id === "stats" ? newWidgets[0] : w);
                handleWidgetsChange(updated);
              }
            }} 
          />
        )}
      </div>
      
      {/* Правая колонка - Быстрые действия и информация */}
      <div>
        <DraggableDashboard 
          widgets={otherWidgets} 
          onWidgetsChange={(newWidgets) => {
            const updated = widgets.map(w => {
              const found = newWidgets.find(nw => nw.id === w.id);
              return found || w;
            });
            handleWidgetsChange(updated);
          }} 
        />
      </div>
    </div>
  );
}
