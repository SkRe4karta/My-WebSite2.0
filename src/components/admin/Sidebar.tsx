"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/notes", label: "Заметки" },
  { href: "/admin/files", label: "Файлы" },
  { href: "/admin/vault", label: "Важные" },
  { href: "/admin/journal", label: "Календарь" },
  { href: "/admin/audit", label: "Аудит" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  return (
    <>
      {/* Мобильная кнопка меню */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[#333] border border-[#4CAF50]/40 text-[#4CAF50]"
      >
        {isMobileOpen ? "✕" : "☰"}
      </button>
      
      {/* Overlay для мобильных */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-[#333] bg-[#333] px-3 py-6 w-48 lg:w-48 transform transition-transform duration-300 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#4CAF50]">Admin</p>
        <h2 className="mt-2 text-base font-semibold text-white">Рабочая панель</h2>
      </div>
      <nav className="mt-10 space-y-1 text-sm">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all duration-300 ${
                active
                  ? "bg-[#4CAF50] text-white shadow-[0_0_15px_rgba(76,175,80,0.35)]"
                  : "text-[#cccccc] hover:bg-[#444] hover:text-[#4CAF50] hover:shadow-[0_0_10px_rgba(76,175,80,0.2)]"
              }`}
            >
              <span>{link.label}</span>
              {active && <span className="text-xs">●</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 text-xs text-[#cccccc]">
        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-2.5 text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
        >
          <span>🌐</span>
          <span>На сайт</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full rounded-xl border border-[#4CAF50]/40 bg-[#333] px-4 py-3 text-left text-sm text-[#4CAF50] transition-all duration-300 hover:bg-[#4CAF50] hover:text-white hover:shadow-[0_0_10px_rgba(76,175,80,0.3)]"
        >
          Выйти
        </button>
        <p className="text-[0.7rem] leading-tight text-[#cccccc]/60">
          Все данные лежат локально: SQLite + storage/uploads + storage/vault.
        </p>
      </div>
    </aside>
    </>
  );
}
