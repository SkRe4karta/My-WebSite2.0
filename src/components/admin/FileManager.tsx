"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

type FileItem = {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType?: string;
  size?: number;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Breadcrumb = {
  id: string | null;
  name: string;
};

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "Корень" }]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const currentParent = useMemo(() => breadcrumbs[breadcrumbs.length - 1]?.id ?? null, [breadcrumbs]);

  const refresh = useCallback(
    async (parentId: string | null) => {
      try {
        const url = parentId ? `/api/files?parentId=${parentId}` : "/api/files";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setFiles(data);
        }
      } catch (error) {
        console.error("Failed to load files:", error);
      }
    },
    [],
  );

  useEffect(() => {
    refresh(currentParent);
  }, [refresh, currentParent]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        if (currentParent) formData.append("parentId", currentParent);
        // Сохраняем относительный путь для папок
        if ((file as any).webkitRelativePath) {
          formData.append("relativePath", (file as any).webkitRelativePath);
        }
        await fetch("/api/files", { method: "POST", body: formData });
      }
      refresh(currentParent);
    },
    [currentParent, refresh],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute("webkitdirectory", "true");
    }
  }, []);

  const enterFolder = async (item: FileItem) => {
    if (!item.isFolder) {
      setSelectedFile(item.id);
      return;
    }
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    setSelectedFile(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedFile(null);
  };

  const goBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs((prev) => prev.slice(0, -1));
      setSelectedFile(null);
    }
  };

  const createFolder = async () => {
    const name = window.prompt("Название папки");
    if (!name?.trim()) return;
    try {
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), isFolder: true, parentId: currentParent }),
      });
      refresh(currentParent);
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const deleteItem = async (item: FileItem) => {
    if (!confirm(`Удалить ${item.isFolder ? "папку" : "файл"} "${item.name}"?`)) return;
    try {
      await fetch(`/api/files/${item.id}`, { method: "DELETE" });
      refresh(currentParent);
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const download = async (item: FileItem) => {
    if (item.isFolder) return;
    try {
      const res = await fetch(`/api/files/download/${item.id}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (item: FileItem): string => {
    if (item.isFolder) return "📁";
    const ext = item.name.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: "📄",
      doc: "📝",
      docx: "📝",
      txt: "📃",
      jpg: "🖼️",
      jpeg: "🖼️",
      png: "🖼️",
      gif: "🖼️",
      zip: "📦",
      rar: "📦",
      mp4: "🎬",
      mp3: "🎵",
    };
    return iconMap[ext || ""] || "📄";
  };

  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      // Сначала папки
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;

      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ru");
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "date":
          comparison =
            new Date(a.updatedAt || a.createdAt || 0).getTime() -
            new Date(b.updatedAt || b.createdAt || 0).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [files, sortBy, sortOrder]);

  return (
    <div className="space-y-4 text-white">
      {/* Панель инструментов */}
      <div className="flex items-center justify-between border-b border-[#333] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={breadcrumbs.length <= 1}
            className="rounded-lg border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            ← Назад
          </button>
          <button
            onClick={createFolder}
            className="rounded-lg border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            + Новая папка
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#cccccc]">Сортировка:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "size" | "date")}
            className="rounded-lg border border-[#4CAF50]/40 bg-[#333] px-3 py-1.5 pr-9 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234CAF50%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:16px] [background-position-x:calc(100%-8px)]"
          >
            <option value="name">Имя</option>
            <option value="size">Размер</option>
            <option value="date">Дата</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="rounded-lg border border-[#4CAF50]/40 bg-[#333] px-3 py-1.5 text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-[#4CAF50]">/</span>}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`transition-all duration-300 ${
                index === breadcrumbs.length - 1
                  ? "text-[#4CAF50] font-semibold"
                  : "text-[#cccccc] hover:text-[#4CAF50]"
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Область загрузки файлов */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragActive
            ? "border-[#4CAF50] bg-[#4CAF50]/10"
            : "border-[#4CAF50]/40 bg-[#333] hover:border-[#4CAF50]/60"
        }`}
      >
        <input {...getInputProps()} ref={inputRef} />
        <p className="text-sm text-[#cccccc]">
          {isDragActive ? "Отпустите файлы здесь" : "Перетащите файлы или папки сюда или нажмите для выбора"}
        </p>
        <p className="mt-2 text-xs text-[#cccccc]/60">Поддерживается загрузка целых папок</p>
      </div>

      {/* Таблица файлов (как в проводнике) */}
      <div className="glass-panel border border-[#4CAF50]/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#333] border-b border-[#4CAF50]/40">
            <tr>
              <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold w-12"></th>
              <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold">Имя</th>
              <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold w-32">Размер</th>
              <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold w-40">Изменён</th>
              <th className="px-4 py-3 text-left text-[#4CAF50] font-semibold w-32">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#cccccc]">
                  Папка пуста
                </td>
              </tr>
            ) : (
              sortedFiles.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-[#4CAF50]/20 transition-colors cursor-pointer ${
                    selectedFile === item.id
                      ? "bg-[#4CAF50]/20"
                      : "hover:bg-[#333]"
                  }`}
                  onDoubleClick={() => enterFolder(item)}
                  onClick={() => setSelectedFile(item.id)}
                >
                  <td className="px-4 py-3 text-2xl">{getFileIcon(item)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={item.isFolder ? "font-semibold text-[#4CAF50]" : "text-white"}>
                        {item.name}
                      </span>
                      {item.isFolder && <span className="text-xs text-[#cccccc]">папка</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#cccccc]">{formatSize(item.size)}</td>
                  <td className="px-4 py-3 text-[#cccccc]">{formatDate(item.updatedAt || item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!item.isFolder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            download(item);
                          }}
                          className="rounded px-2 py-1 text-xs text-[#4CAF50] hover:bg-[#4CAF50]/20 transition-colors"
                          title="Скачать"
                        >
                          ⬇
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item);
                        }}
                        className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-400/20 transition-colors"
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
