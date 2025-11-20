"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "MEDIUM" as Task["priority"],
  });

  useEffect(() => {
    refreshTasks();
  }, [showCompleted]);

  const refreshTasks = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!showCompleted) params.append("completed", "false");
    const res = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    });

    setNewTask({ title: "", description: "", dueDate: "", priority: "MEDIUM" });
    refreshTasks();
  };

  const toggleTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    refreshTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Удалить задачу?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    refreshTasks();
  };

  const priorityColors = {
    LOW: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    HIGH: "bg-red-500/20 text-red-400 border-red-500/40",
  };

  return (
    <div className="glass-panel border border-[#4CAF50]/40 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#4CAF50]">Задачи</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="w-4 h-4 rounded border-[#4CAF50]/40 bg-[#333] text-[#4CAF50]"
          />
          <span className="text-sm text-[#cccccc]">Показать выполненные</span>
        </label>
      </div>

      {/* Форма создания задачи */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Название задачи"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && createTask()}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
          />
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })}
            className="rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2 text-white transition-all duration-300 hover:border-[#4CAF50]/60 focus:border-[#4CAF50] focus:outline-none"
          >
            <option value="LOW">Низкий</option>
            <option value="MEDIUM">Средний</option>
            <option value="HIGH">Высокий</option>
          </select>
        </div>
        <button
          onClick={createTask}
          className="w-full rounded-xl bg-[#4CAF50] py-2 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
        >
          Добавить задачу
        </button>
      </div>

      {/* Список задач */}
      {loading ? (
        <div className="text-[#cccccc]">Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div className="text-[#cccccc]">Нет задач</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                task.completed
                  ? "bg-[#333]/50 border-[#4CAF50]/20 opacity-60"
                  : "bg-[#333] border-[#4CAF50]/20 hover:border-[#4CAF50]/40"
              }`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 rounded border-[#4CAF50]/40 bg-[#333] text-[#4CAF50]"
              />
              <div className="flex-1">
                <p className={`font-medium ${task.completed ? "line-through text-[#888]" : "text-white"}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm text-[#cccccc]">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-[#888]">
                      {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
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
      )}
    </div>
  );
}

