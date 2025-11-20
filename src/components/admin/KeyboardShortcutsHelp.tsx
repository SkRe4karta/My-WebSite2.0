"use client";

import { useState } from "react";

const shortcuts = [
  { keys: ["Ctrl", "K"], description: "Открыть поиск" },
  { keys: ["Ctrl", "N"], description: "Новая заметка" },
  { keys: ["Ctrl", "S"], description: "Сохранить" },
  { keys: ["Esc"], description: "Закрыть/Отменить" },
  { keys: ["Delete"], description: "Удалить выбранное" },
  { keys: ["Ctrl", "F"], description: "Найти на странице" },
];

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-[#4CAF50] text-white shadow-lg hover:bg-[#45a049] transition-colors"
        title="Горячие клавиши"
        aria-label="Показать горячие клавиши"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="glass-panel border border-[#4CAF50]/40 p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#4CAF50]">Горячие клавиши</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#cccccc] hover:text-white transition-colors"
            aria-label="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-[#333] border border-[#4CAF50]/20">
              <span className="text-[#cccccc]">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-2 py-1 text-xs font-semibold text-[#4CAF50] bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-[#cccccc]">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full rounded-xl bg-[#4CAF50] py-3 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

