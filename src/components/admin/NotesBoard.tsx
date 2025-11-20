"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Note = {
  id: string;
  title: string;
  content: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  format: "MARKDOWN" | "PLAINTEXT";
  tags?: { tag: { name: string } }[];
  attachments?: { file: { id: string; name: string } }[];
  updatedAt: string;
};

const defaultNote = {
  title: "",
  content: "",
  tags: [] as string[],
  status: "DRAFT" as Note["status"],
  attachments: [] as string[],
};

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState({ ...defaultNote });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notes");
    const data = await res.json();
    setNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Загружаем шаблоны
    fetch("/api/notes/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data))
      .catch((err) => console.error("Failed to load templates:", err));
  }, [refresh]);

  useEffect(() => {
    if (activeId && showVersions) {
      fetch(`/api/notes/${activeId}/versions`)
        .then((res) => res.json())
        .then((data) => setVersions(data))
        .catch((err) => console.error("Failed to load versions:", err));
    }
  }, [activeId, showVersions]);

  const filtered = useMemo(() => {
    if (!query) return notes;
    return notes.filter((note) => note.title.toLowerCase().includes(query.toLowerCase()));
  }, [query, notes]);

  const startEdit = useCallback((note?: Note) => {
    if (!note) {
      setActiveId(null);
      setEditor({ ...defaultNote });
      return;
    }
    setActiveId(note.id);
    setEditor({
      title: note.title,
      content: note.content,
      status: note.status,
      tags: note.tags?.map((t) => t.tag.name) ?? [],
      attachments: note.attachments?.map((a) => a.file.id) ?? [],
    });
  }, []);

  const saveNote = useCallback(async () => {
    const payload = { ...editor };
    const method = activeId ? "PUT" : "POST";
    const url = activeId ? `/api/notes/${activeId}` : "/api/notes";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    startEdit();
    refresh();
  }, [activeId, editor, refresh, startEdit]);

  const deleteNote = useCallback(async (id: string) => {
    if (!confirm("Удалить заметку?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (activeId === id) {
      startEdit();
    }
    refresh();
  }, [activeId, refresh, startEdit]);

  const uploadAttachments = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      // Сохраняем в папку "заметки"
      formData.append("folder", "заметки");
      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (res.ok) {
        const entry = await res.json();
        uploaded.push(entry.id);
      }
    }
    setEditor((prev) => ({ ...prev, attachments: [...(prev.attachments ?? []), ...uploaded] }));
  }, []);

  const exportNote = async (format: "markdown" | "pdf") => {
    if (!activeId) return;
    const res = await fetch(`/api/notes/${activeId}/export?format=${format}`);
    if (format === "markdown") {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${editor.title || "note"}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const applyTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setEditor({ ...editor, content: template.content });
    }
  };

  const addToFavorites = async () => {
    if (!activeId) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "note", entityId: activeId }),
    });
  };

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[240px_1fr] h-[calc(100vh-200px)]">
      <div className="glass-panel h-full overflow-y-auto border border-[#4CAF50]/40 p-3 sm:p-4 text-white max-h-[400px] lg:max-h-none">
        <div className="mb-4">
          <input
            className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
            placeholder="Поиск"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => startEdit()}
          className="mb-4 w-full rounded-xl border border-dashed border-[#4CAF50]/40 bg-[#333] py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#4CAF50]/20"
        >
          + Новая заметка
        </button>
        {loading ? (
          <p className="text-sm text-[#cccccc]">Загрузка...</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {filtered.map((note) => (
              <li
                key={note.id}
                className={`group rounded-xl border border-[#4CAF50]/40 p-3 transition-all duration-300 ${
                  activeId === note.id ? "bg-[#4CAF50]/20 border-[#4CAF50]/60" : "hover:bg-[#444]"
                }`}
              >
                <div 
                  onClick={() => startEdit(note)}
                  className="cursor-pointer"
                >
                  <p className="font-medium text-white">{note.title}</p>
                  <p className="text-xs text-[#cccccc]">{new Date(note.updatedAt).toLocaleString("ru-RU")}</p>
                  {note.attachments && note.attachments.length > 0 && (
                    <p className="text-xs text-[#4CAF50]/60 mt-1">
                      📎 {note.attachments.length} файл(ов) скрыто
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNote(note.id);
                  }}
                  className="mt-2 w-full opacity-0 group-hover:opacity-100 rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-400/20 transition-all"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="glass-panel h-full flex flex-col border border-[#4CAF50]/40 p-4 sm:p-6 text-white">
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <input
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 sm:py-3 text-base sm:text-lg font-semibold text-white focus:border-[#4CAF50] focus:outline-none"
            placeholder="Заголовок"
            value={editor.title}
            onChange={(e) => setEditor({ ...editor, title: e.target.value })}
          />
          <textarea
            className="flex-1 min-h-[300px] sm:min-h-[400px] rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-3 font-mono text-xs sm:text-sm text-white resize-none focus:border-[#4CAF50] focus:outline-none"
            placeholder="Начните писать markdown..."
            value={editor.content}
            onChange={(e) => setEditor({ ...editor, content: e.target.value })}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-[#cccccc]">Теги</label>
              <input
                className="mt-2 w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-white"
                placeholder="tag1, tag2"
                value={editor.tags.join(", ")}
                onChange={(e) => setEditor({ ...editor, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-[#cccccc]">Статус</label>
              <select
                className="mt-2 w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-sm text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234CAF50%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:18px] [background-position-x:calc(100%-12px)]"
                value={editor.status}
                onChange={(e) => setEditor({ ...editor, status: e.target.value as Note["status"] })}
              >
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликовано</option>
                <option value="ARCHIVED">Архив</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-[#4CAF50]/40 p-4 text-center">
            <p className="text-sm text-[#cccccc]">Прикрепите PDF / фото / видео</p>
            <input className="mt-2 text-xs" type="file" multiple onChange={(e) => uploadAttachments(e.target.files)} />
            <p className="mt-2 text-xs text-[#cccccc]">
              Файлы сохраняются в папку "заметки"
            </p>
          </div>
          {editor.attachments && editor.attachments.length > 0 && (
            <div className="rounded-xl border border-[#4CAF50]/40 bg-[#333] p-4">
              <p className="text-xs uppercase text-[#cccccc] mb-2">Прикреплённые файлы ({editor.attachments.length})</p>
              <div className="space-y-2">
                {editor.attachments.map((fileId, idx) => (
                  <div key={fileId || idx} className="flex items-center justify-between p-2 bg-[#444] rounded">
                    <span className="text-xs text-white">Файл {fileId.slice(0, 8)}...</span>
                    <div className="flex gap-2">
                      <a
                        href={`/api/files/download/${fileId}`}
                        download
                        className="rounded px-2 py-1 text-xs text-[#4CAF50] hover:bg-[#4CAF50]/20 transition-colors"
                      >
                        ⬇
                      </a>
                      <button
                        onClick={() => setEditor({ ...editor, attachments: editor.attachments?.filter(id => id !== fileId) })}
                        className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-400/20 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Дополнительные функции */}
          {activeId && (
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[#4CAF50]/20 bg-[#333]">
              <button
                onClick={() => exportNote("markdown")}
                className="px-3 py-1.5 text-xs rounded bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 hover:bg-[#4CAF50]/20"
              >
                Экспорт MD
              </button>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="px-3 py-1.5 text-xs rounded bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 hover:bg-[#4CAF50]/20"
              >
                Версии
              </button>
              <button
                onClick={addToFavorites}
                className="px-3 py-1.5 text-xs rounded bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 hover:bg-[#4CAF50]/20"
              >
                ⭐ В избранное
              </button>
            </div>
          )}

          {/* Шаблоны */}
          {templates.length > 0 && !activeId && (
            <div className="p-3 rounded-xl border border-[#4CAF50]/20 bg-[#333]">
              <label className="text-xs uppercase text-[#cccccc] mb-2 block">Шаблоны</label>
              <select
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#444] px-4 py-2 text-sm text-white"
              >
                <option value="">Выберите шаблон...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Версии */}
          {showVersions && versions.length > 0 && (
            <div className="p-3 rounded-xl border border-[#4CAF50]/20 bg-[#333] max-h-48 overflow-y-auto">
              <p className="text-xs uppercase text-[#cccccc] mb-2">История версий</p>
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-2 rounded bg-[#444] border border-[#4CAF50]/10 cursor-pointer hover:border-[#4CAF50]/30"
                    onClick={() => {
                      setEditor({ ...editor, title: version.title, content: version.content });
                      setShowVersions(false);
                    }}
                  >
                    <p className="text-xs text-white">Версия {version.version}</p>
                    <p className="text-xs text-[#888]">{new Date(version.createdAt).toLocaleString("ru-RU")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={saveNote}
              className="rounded-xl bg-[#4CAF50] py-3 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] hover:shadow-[0_0_20px_rgba(76,175,80,0.4)]"
            >
              {activeId ? "Сохранить изменения" : "Создать заметку"}
            </button>
            {activeId && (
              <button
                onClick={() => startEdit()}
                className="rounded-2xl border border-rose-200 py-3 text-sm text-rose-500"
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
