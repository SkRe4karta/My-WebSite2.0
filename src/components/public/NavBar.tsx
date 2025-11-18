"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { useState } from "react";

const links = [
  { href: "/", label: "Главная" },
  { href: "/projects", label: "Проекты" },
  { href: "/about", label: "Обо мне" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#333] bg-[#333]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
        <Link href="/" className="text-base sm:text-lg font-bold text-[#4CAF50] transition-all duration-300 hover:text-[#45a049] hover:drop-shadow-[0_0_10px_rgba(76,175,80,0.4)]">
          zelyonkin.ru
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden p-2 rounded-lg text-[#4CAF50] hover:bg-[#444] transition-colors"
          aria-label="Меню"
        >
          {isMobileOpen ? "✕" : "☰"}
        </button>
        <nav className={`absolute lg:static top-full left-0 right-0 lg:flex flex-col lg:flex-row gap-2 text-sm sm:text-base font-bold bg-[#333] lg:bg-transparent border-t lg:border-t-0 border-[#333] lg:border-0 ${
          isMobileOpen ? "flex" : "hidden lg:flex"
        }`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className={clsx(
                "px-4 sm:px-5 py-2.5 rounded-[5px] transition-all duration-300",
                pathname === link.href
                  ? "bg-[#4CAF50] text-white shadow-[0_0_15px_rgba(76,175,80,0.35)]"
                  : "text-[#cccccc] hover:bg-[#444] hover:text-[#4CAF50] hover:shadow-[0_0_10px_rgba(76,175,80,0.2)]",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={session ? "/admin" : "/login"}
            onClick={() => setIsMobileOpen(false)}
            className={clsx(
              "px-4 sm:px-5 py-2.5 rounded-[5px] transition-all duration-300",
              pathname?.startsWith("/admin") || pathname === "/login"
                ? "bg-[#4CAF50] text-white shadow-[0_0_15px_rgba(76,175,80,0.35)]"
                : "text-[#cccccc] hover:bg-[#444] hover:text-[#4CAF50] hover:shadow-[0_0_10px_rgba(76,175,80,0.2)]",
            )}
          >
            Админка
          </Link>
        </nav>
      </div>
    </header>
  );
}
