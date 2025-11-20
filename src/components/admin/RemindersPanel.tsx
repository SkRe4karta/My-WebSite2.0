"use client";

import { useEffect, useState } from "react";

type Reminder = {
  id: string;
  taskId?: string;
  noteId?: string;
  message: string;
  triggerAt: string;
  completed: boolean;
  createdAt: string;
};

export default function RemindersPanel() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminder, setNewReminder] = useState({
    message: "",
    triggerAt: "",
  });

  useEffect(() => {
    refreshReminders();
  }, []);

  const refreshReminders = async () => {
    setLoading(true);
    const res = await fetch("/api/reminders?completed=false");
    const data = await res.json();
    setReminders(data);
    setLoading(false);
  };

  const createReminder = async () => {
    if (!newReminder.message.trim() || !newReminder.triggerAt) return;

    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReminder),
    });

    setNewReminder({ message: "", triggerAt: "" });
    refreshReminders();
  };

  const completeReminder = async (id: string) => {
    await fetch(`/api/reminders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    refreshReminders();
  };

  const deleteReminder = async (id: string) => {
    if (!confirm("Удалить напоминание?")) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    refreshReminders();
  };

  const upcomingReminders = reminders.filter((r) => new Date(r.triggerAt) > new Date());
  const overdueReminders = reminders.filter((r) => new Date(r.triggerAt) <= new Date() && !r.completed);

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[#4CAF50] mb-4">Напоминания</h2>

      {/* Форма создания напоминания */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Текст напоминания"
          value={newReminder.message}
          onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
          className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="datetime-local"
            value={newReminder.triggerAt}
            onChange={(e) => setNewReminder({ ...newReminder, triggerAt: e.target.value })}
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
          />
          <button
            onClick={createReminder}
            className="rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
          >
            Добавить
          </button>
        </div>
      </div>

      {/* Просроченные напоминания */}
      {overdueReminders.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Просроченные</h3>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/40"
              >
                <p className="text-sm text-white">{reminder.message}</p>
                <p className="text-xs text-red-400 mt-1">
                  {new Date(reminder.triggerAt).toLocaleString("ru-RU")}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => completeReminder(reminder.id)}
                    className="text-xs px-2 py-1 rounded bg-[#4CAF50] text-white hover:bg-[#45a049]"
                  >
                    Выполнено
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Предстоящие напоминания */}
      {loading ? (
        <div className="text-[#cccccc]">Загрузка...</div>
      ) : upcomingReminders.length === 0 ? (
        <div className="text-[#cccccc]">Нет напоминаний</div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-[#4CAF50] mb-2">Предстоящие</h3>
          <div className="space-y-2">
            {upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#333] border border-[#4CAF50]/20"
              >
                <div>
                  <p className="text-sm text-white">{reminder.message}</p>
                  <p className="text-xs text-[#cccccc] mt-1">
                    {new Date(reminder.triggerAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="text-[#cccccc] hover:text-red-400 transition-colors"
                  aria-label="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

