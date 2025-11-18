"use client";

import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

type Idea = {
  id: string;
  title: string;
  date: string;
  content: string;
  files?: string[]; // IDs файлов
  tags?: any; // Может содержать files в структуре { files: string[] }
};

type IdeaWidgetProps = {
  idea: Idea;
  onClose: () => void;
  onDelete: () => void;
};

function IdeaWidget({ idea, onClose, onDelete }: IdeaWidgetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-panel border border-[#4CAF50]/40 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[#4CAF50]">{idea.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="rounded px-3 py-1 text-sm text-rose-400 hover:bg-rose-400/20 transition-colors"
            >
              Удалить
            </button>
            <button
              onClick={onClose}
              className="text-[#cccccc] hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
        </div>
        
        <p className="text-sm text-[#cccccc] mb-4">
          {format(new Date(idea.date), "dd.MM.yyyy", { locale: ru })}
        </p>

        {/* Содержимое */}
        {idea.content && (
          <div className="rounded-xl border border-[#4CAF50]/40 bg-[#333] p-4 mb-4">
            <h3 className="text-lg font-semibold text-[#4CAF50] mb-2">Описание</h3>
            <p className="text-sm text-white whitespace-pre-wrap">{idea.content}</p>
          </div>
        )}

        {/* Просмотр файлов */}
        {idea.tags && (idea.tags as any)?.files && (idea.tags as any).files.length > 0 && (
          <div className="rounded-xl border border-[#4CAF50]/40 bg-[#333] p-4">
            <h3 className="text-lg font-semibold text-[#4CAF50] mb-2">Файлы</h3>
            <div className="space-y-2">
              {(idea.tags as any).files.map((fileId: string) => (
                <div key={fileId} className="flex items-center justify-between p-2 bg-[#444] rounded">
                  <span className="text-sm text-white">Файл {fileId}</span>
                  <a
                    href={`/api/files/download/${fileId}`}
                    download
                    className="rounded px-3 py-1 text-xs text-[#4CAF50] hover:bg-[#4CAF50]/20 transition-colors"
                  >
                    ⬇ Скачать
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JournalBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [form, setForm] = useState({ title: "", content: "", date: new Date().toISOString().slice(0, 10), files: [] as string[] });
  const [month, setMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/journal?month=${format(month, "yyyy-MM")}`);
    const data = await res.json();
    setIdeas(data);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const uploaded: string[] = [];
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/files", { method: "POST", body: formData });
        if (res.ok) {
          const entry = await res.json();
          uploaded.push(entry.id);
        }
      }
      setForm((prev) => ({ ...prev, files: [...prev.files, ...uploaded] }));
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const saveIdea = useCallback(async () => {
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        content: form.content,
        date: form.date,
        tags: form.files.length > 0 ? { files: form.files } : undefined, // Сохраняем файлы в tags как JSON
      }),
    });
    setForm({ title: "", content: "", date: new Date().toISOString().slice(0, 10), files: [] });
    load();
  }, [form, load]);

  const deleteIdea = useCallback(async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    load();
    setSelectedIdea(null);
  }, [load]);

  const getDayIdeas = (day: Date): Idea[] => {
    const iso = format(day, "yyyy-MM-dd");
    return ideas.filter((idea) => idea.date.slice(0, 10) === iso);
  };

  const handleDayClick = (day: Date) => {
    const iso = format(day, "yyyy-MM-dd");
    const dayIdeas = getDayIdeas(day);
    if (dayIdeas.length > 0) {
      setSelectedIdea(dayIdeas[0]); // Показываем первую запись, если их несколько
    } else {
      // Если нет записей, создаём новую с этой датой
      setForm((prev) => ({ ...prev, date: iso }));
      setShowForm(true);
    }
  };

  return (
    <div {...getRootProps()} className="grid gap-6 lg:grid-cols-[400px_1fr] h-[calc(100vh-200px)] text-white">
      <input {...getInputProps()} />
      
      {/* Левая панель - новая запись */}
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 h-full overflow-y-auto max-h-[600px] lg:max-h-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#4CAF50]">Новая запись</h2>
          {showForm && (
            <button
              onClick={() => setShowForm(false)}
              className="text-[#cccccc] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        
        {showForm ? (
          <div className="space-y-4">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
            />
            <input
              placeholder="Тема"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
            />
            <textarea
              placeholder="Описание"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white min-h-[150px]"
            />
            <div className={`rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 ${
              isDragActive
                ? "border-[#4CAF50] bg-[#4CAF50]/10"
                : "border-[#4CAF50]/40 bg-[#333] hover:border-[#4CAF50]/60"
            }`}>
              <p className="text-xs text-[#cccccc]">
                {isDragActive ? "Отпустите файлы здесь" : "Перетащите файлы сюда или нажмите для выбора"}
              </p>
              <input
                type="file"
                multiple
                className="mt-2 text-xs text-[#cccccc]"
                onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))}
              />
              {form.files.length > 0 && (
                <p className="mt-2 text-xs text-[#4CAF50]">Загружено файлов: {form.files.length}</p>
              )}
            </div>
            <button
              onClick={saveIdea}
              className="w-full rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
            >
              Сохранить
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            + Новая запись
          </button>
        )}
      </div>
      
      {/* Правая панель - календарь */}
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 h-full flex flex-col min-h-0">
        <div className="mb-4 flex items-center justify-between text-sm text-[#cccccc]">
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            className="rounded-full border border-[#4CAF50]/40 px-3 py-1 hover:bg-[#4CAF50]/20 transition-colors"
          >
            ←
          </button>
          <p className="text-lg font-semibold text-white">{format(month, "LLLL yyyy", { locale: ru })}</p>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-full border border-[#4CAF50]/40 px-3 py-1 hover:bg-[#4CAF50]/20 transition-colors"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#cccccc] mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <span key={day} className="font-semibold">{day}</span>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-2 text-sm overflow-y-auto">
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const dayIdeas = getDayIdeas(day);
            return (
              <div
                key={iso}
                onClick={() => handleDayClick(day)}
                className={`rounded-xl border border-[#4CAF50]/40 p-2 min-h-[80px] cursor-pointer transition-all duration-300 hover:border-[#4CAF50]/60 ${
                  dayIdeas.length > 0 ? "bg-[#4CAF50]/20" : "bg-[#333]"
                }`}
              >
                <p className="text-xs text-[#cccccc] mb-1">{format(day, "d")}</p>
                {dayIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="mb-1 p-1 rounded bg-[#4CAF50]/30 text-xs text-white hover:bg-[#4CAF50]/40 transition-colors group relative"
                    title={idea.content}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{idea.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteIdea(idea.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Виджет записи */}
      {selectedIdea && (
        <IdeaWidget
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onDelete={() => deleteIdea(selectedIdea.id)}
        />
      )}
    </div>
  );
}
