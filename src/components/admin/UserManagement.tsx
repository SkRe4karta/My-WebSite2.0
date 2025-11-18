"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  has2FA: boolean;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "admin",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const body = editingUser
        ? { ...formData, password: formData.password || undefined }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Операция выполнена успешно" });
        setShowAddForm(false);
        setEditingUser(null);
        setFormData({ email: "", name: "", password: "", role: "admin" });
        loadUsers();
      } else {
        setMessage({ type: "error", text: data.error || "Ошибка при выполнении операции" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Ошибка при выполнении операции" });
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Пользователь успешно удален" });
        loadUsers();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Ошибка при удалении пользователя" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Ошибка при удалении пользователя" });
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name || "",
      password: "",
      role: user.role,
    });
    setShowAddForm(true);
  }

  function cancelEdit() {
    setEditingUser(null);
    setShowAddForm(false);
    setFormData({ email: "", name: "", password: "", role: "admin" });
    setMessage(null);
  }

  if (loading) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
        <p className="text-[#cccccc]">Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#4CAF50]">Управление пользователями</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-xl bg-[#4CAF50] text-white text-sm font-semibold hover:bg-[#45a049] transition-colors"
          >
            + Добавить пользователя
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/40"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          }`}
        >
          {message.text}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 p-4 bg-[#2a2a2a] rounded-xl">
          <h3 className="text-md font-semibold text-[#4CAF50]">
            {editingUser ? "Редактировать пользователя" : "Новый пользователь"}
          </h3>
          
          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">
              Email *
            </label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">
              Имя
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">
              {editingUser ? "Новый пароль (оставьте пустым, чтобы не менять)" : "Пароль *"}
            </label>
            <input
              type="password"
              required={!editingUser}
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.4em] text-[#cccccc] mb-2 block">
              Роль
            </label>
            <select
              className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Администратор</option>
              <option value="user">Пользователь</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-[#4CAF50] text-white font-semibold hover:bg-[#45a049] transition-colors"
            >
              {editingUser ? "Сохранить" : "Создать"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-xl border border-[#4CAF50]/40 text-white hover:bg-[#333] transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-[#cccccc] text-sm">Пользователи не найдены</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-xl"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    {user.name || user.email}
                  </span>
                  {user.has2FA && (
                    <span className="px-2 py-0.5 text-xs bg-[#4CAF50]/20 text-[#4CAF50] rounded">
                      2FA
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-xs bg-[#333] text-[#cccccc] rounded">
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-[#cccccc] mt-1">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(user)}
                  className="px-3 py-1 text-sm rounded-lg border border-[#4CAF50]/40 text-[#4CAF50] hover:bg-[#4CAF50]/10 transition-colors"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="px-3 py-1 text-sm rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

