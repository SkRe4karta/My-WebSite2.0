"use client";

import { useEffect, useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
};

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState({
    name: "",
    permissions: ["notes:read"] as string[],
    expiresAt: "",
  });
  const [showNewKey, setShowNewKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    refreshKeys();
  }, []);

  const refreshKeys = async () => {
    setLoading(true);
    const res = await fetch("/api/v1/api-keys");
    const data = await res.json();
    setKeys(data);
    setLoading(false);
  };

  const createKey = async () => {
    if (!newKey.name.trim()) return;

    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKey),
    });

    const data = await res.json();
    setCreatedKey(data.key);
    setNewKey({ name: "", permissions: ["notes:read"], expiresAt: "" });
    setShowNewKey(false);
    refreshKeys();
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Удалить API ключ? Это действие нельзя отменить.")) return;
    await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    refreshKeys();
  };

  if (loading) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">API Ключи</h2>
        <div className="text-[#cccccc]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#4CAF50]">API Ключи</h2>
        <button
          onClick={() => setShowNewKey(!showNewKey)}
          className="px-4 py-2 rounded-xl bg-[#4CAF50] text-white text-sm font-semibold hover:bg-[#45a049] transition-colors"
        >
          + Создать ключ
        </button>
      </div>

      {/* Форма создания ключа */}
      {showNewKey && (
        <div className="mb-4 p-4 rounded-xl border border-[#4CAF50]/20 bg-[#333] space-y-3">
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Название</label>
            <input
              type="text"
              value={newKey.name}
              onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              placeholder="Мой API ключ"
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#444] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Разрешения</label>
            <div className="space-y-2">
              {["notes:read", "notes:write", "files:read", "files:write"].map((perm) => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKey.permissions.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewKey({ ...newKey, permissions: [...newKey.permissions, perm] });
                      } else {
                        setNewKey({ ...newKey, permissions: newKey.permissions.filter((p) => p !== perm) });
                      }
                    }}
                    className="w-4 h-4 rounded border-[#4CAF50]/40 bg-[#333] text-[#4CAF50]"
                  />
                  <span className="text-sm text-[#cccccc]">{perm}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">Срок действия (опционально)</label>
            <input
              type="date"
              value={newKey.expiresAt}
              onChange={(e) => setNewKey({ ...newKey, expiresAt: e.target.value })}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#444] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={createKey}
              className="flex-1 rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
            >
              Создать
            </button>
            <button
              onClick={() => {
                setShowNewKey(false);
                setNewKey({ name: "", permissions: ["notes:read"], expiresAt: "" });
              }}
              className="px-4 py-2 rounded-xl border border-[#4CAF50]/40 text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50]/20"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Показываем созданный ключ один раз */}
      {createdKey && (
        <div className="mb-4 p-4 rounded-xl border border-[#4CAF50] bg-[#4CAF50]/10">
          <p className="text-sm font-semibold text-[#4CAF50] mb-2">Ключ создан! Сохраните его:</p>
          <code className="block p-2 rounded bg-[#333] text-[#4CAF50] break-all">{createdKey}</code>
          <p className="text-xs text-[#cccccc] mt-2">Этот ключ больше не будет показан</p>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-xs text-[#4CAF50] hover:text-[#45a049]"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Список ключей */}
      {keys.length === 0 ? (
        <div className="text-[#cccccc]">Нет API ключей</div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#333] border border-[#4CAF50]/20"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{key.name}</p>
                <p className="text-xs text-[#888] mt-1">
                  {key.permissions.join(", ")}
                </p>
                <p className="text-xs text-[#888] mt-1">
                  Создан: {new Date(key.createdAt).toLocaleDateString("ru-RU")}
                  {key.lastUsedAt && ` • Использован: ${new Date(key.lastUsedAt).toLocaleDateString("ru-RU")}`}
                  {key.expiresAt && ` • Истекает: ${new Date(key.expiresAt).toLocaleDateString("ru-RU")}`}
                </p>
              </div>
              <button
                onClick={() => deleteKey(key.id)}
                className="text-[#cccccc] hover:text-red-400 transition-colors p-1"
                aria-label="Удалить"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

