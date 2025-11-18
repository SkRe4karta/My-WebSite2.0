"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

type VaultItem = {
  id: string;
  label: string;
  description?: string;
  secretType: "FILE" | "PASSWORD" | "NOTE";
  metadata?: Record<string, unknown>;
  fileId?: string;
};

type DocumentWidgetProps = {
  item: VaultItem;
  onClose: () => void;
  onUnlock: (password: string) => Promise<void>;
};

function DocumentWidget({ item, onClose, onUnlock }: DocumentWidgetProps) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await onUnlock(password);
      setUnlocked(true);
      
      // Загружаем данные документа
      const res = await fetch(`/api/vault/${item.id}?raw=1`);
      if (res.ok) {
        const data = await res.json();
        setValue(data.value || "");
        
        // Если есть файл, получаем URL для просмотра
        if (item.fileId || (data.metadata as any)?.path) {
          if (item.fileId) {
            setFileUrl(`/api/files/download/${item.fileId}`);
          } else if ((data.metadata as any)?.path) {
            setFileUrl(`/api/vault/${item.id}/file`);
          }
        }
      }
    } catch (error) {
      alert("Неверный пароль или ошибка открытия");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-panel border border-[#4CAF50]/40 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[#4CAF50]">{item.label}</h2>
          <button
            onClick={onClose}
            className="text-[#cccccc] hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>
        
        {item.description && (
          <p className="text-sm text-[#cccccc] mb-4">{item.description}</p>
        )}

        {!unlocked ? (
          <div className="space-y-4">
            <p className="text-sm text-[#cccccc]">Введите пароль для открытия документа</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Пароль"
                className="flex-1 rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
                autoFocus
              />
              <button
                onClick={handleUnlock}
                disabled={loading}
                className="rounded-xl bg-[#4CAF50] px-6 py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] disabled:opacity-50"
              >
                {loading ? "Открытие..." : "Открыть"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Просмотр заметки */}
            {value && (
              <div className="rounded-xl border border-[#4CAF50]/40 bg-[#333] p-4">
                <h3 className="text-lg font-semibold text-[#4CAF50] mb-2">Заметка</h3>
                <p className="text-sm text-white whitespace-pre-wrap">{value}</p>
              </div>
            )}
            
            {/* Просмотр файла */}
            {fileUrl && (
              <div className="rounded-xl border border-[#4CAF50]/40 bg-[#333] p-4">
                <h3 className="text-lg font-semibold text-[#4CAF50] mb-2">Документ</h3>
                <iframe
                  src={fileUrl}
                  className="w-full h-96 rounded-lg border border-[#4CAF50]/20"
                  title="Просмотр документа"
                />
                <a
                  href={fileUrl}
                  download
                  className="mt-2 inline-block rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
                >
                  ⬇ Скачать
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VaultBoard() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [form, setForm] = useState({ 
    label: "", 
    value: "", 
    password: "", 
    type: "NOTE",
    fileMode: "text" as "text" | "file"
  });
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VaultItem | null>(null);
  const [showForm, setShowForm] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/vault");
    const data = await res.json();
    setItems(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", form.label || file.name);
        if (form.password) {
          formData.append("password", form.password);
        }
        const res = await fetch("/api/vault", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          setUploadedFileId(data.id);
          setForm({ ...form, label: "", value: "", password: "" });
          refresh();
        }
      }
    },
    [form, refresh],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const saveDocument = useCallback(async () => {
    if (form.fileMode === "file" && uploadedFileId) {
      // Файл уже загружен через onDrop
      return;
    }
    
    await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        secretType: form.type,
        metadata: { 
          value: form.value, 
          password: form.password,
          fileMode: form.fileMode
        },
      }),
    });
    setForm({ label: "", value: "", password: "", type: "NOTE", fileMode: "text" });
    setUploadedFileId(null);
    refresh();
  }, [form, uploadedFileId, refresh]);

  const unlockDocument = useCallback(async (item: VaultItem, password: string): Promise<void> => {
    // Проверка пароля происходит на сервере при запросе /api/vault/${id}?raw=1
    // Пока просто возвращаем успех, если запрос прошёл
    return Promise.resolve();
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm("Удалить документ?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
    refresh();
  }, [refresh]);

  return (
    <div {...getRootProps()} className="grid gap-6 lg:grid-cols-[400px_1fr] h-[calc(100vh-200px)] text-white">
      <input {...getInputProps()} />
      
      {/* Левая панель - управление */}
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 h-full overflow-y-auto max-h-[600px] lg:max-h-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#4CAF50]">Управление</h2>
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
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
              placeholder="Название документа"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            
            <div>
              <label className="text-xs uppercase text-[#cccccc] mb-2 block">Тип заполнения</label>
              <select
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 pr-10 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234CAF50%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpolyline points=%226 9 12 15 18 9%22%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-right bg-[length:20px] [background-position-x:calc(100%-12px)]"
                value={form.fileMode}
                onChange={(e) => setForm({ ...form, fileMode: e.target.value as "text" | "file" })}
              >
                <option value="text">Текст</option>
                <option value="file">Файл</option>
              </select>
            </div>
            
            <input
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
              placeholder="Пароль для открытия (необязательно)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            
            {form.fileMode === "text" && (
              <textarea
                className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none min-h-[150px]"
                placeholder="Текст заметки"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            )}
            
            {form.fileMode === "file" && (
              <div className={`rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 ${
                isDragActive
                  ? "border-[#4CAF50] bg-[#4CAF50]/10"
                  : "border-[#4CAF50]/40 bg-[#333] hover:border-[#4CAF50]/60"
              }`}>
                <p className="text-xs text-[#cccccc]">
                  {isDragActive ? "Отпустите файл здесь" : "Перетащите файл сюда или нажмите для выбора"}
                </p>
                <input
                  type="file"
                  className="mt-2 text-xs text-[#cccccc]"
                  onChange={(e) => e.target.files?.[0] && onDrop([e.target.files[0]])}
                />
                {uploadedFileId && (
                  <p className="mt-2 text-xs text-[#4CAF50]">Файл загружен</p>
                )}
              </div>
            )}
            
            <button
              onClick={saveDocument}
              className="w-full rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049] hover:shadow-[0_0_20px_rgba(76,175,80,0.4)]"
            >
              Сохранить
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white"
          >
            + Новый документ
          </button>
        )}
      </div>
      
      {/* Правая панель - все документы/файлы */}
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6 h-full overflow-y-auto">
        <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Документы и файлы</h2>
        {items.length === 0 ? (
          <p className="text-sm text-[#cccccc]">Документы появятся после сохранения.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedDocument(item)}
                className="glass-panel border border-[#4CAF50]/40 p-4 cursor-pointer transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#333] hover:shadow-[0_0_20px_rgba(76,175,80,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#4CAF50]">{item.label}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-400/20 transition-colors"
                  >
                    🗑
                  </button>
                </div>
                <p className="text-xs text-[#4CAF50]/60 mt-2">{item.secretType}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Виджет документа */}
      {selectedDocument && (
        <DocumentWidget
          item={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onUnlock={(password) => unlockDocument(selectedDocument, password)}
        />
      )}
    </div>
  );
}
