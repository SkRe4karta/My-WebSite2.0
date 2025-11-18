export const dynamic = "force-dynamic";
export const revalidate = 0;
import Sidebar from "@/components/admin/Sidebar";
import SearchBar from "@/components/admin/SearchBar";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen bg-[#1e1e1e] text-white flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="relative flex flex-1 flex-col overflow-hidden lg:ml-0">
          <div className="absolute inset-0 -z-10 bg-[#1e1e1e]" />
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#333] bg-[#333]/95 backdrop-blur-md px-4 sm:px-8 py-4 sm:py-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[#4CAF50]">Приватный кабинет</p>
              <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-white">Привет, {session?.user?.name ?? "admin"}</h1>
            </div>
            <div className="w-full sm:w-auto">
              <SearchBar />
            </div>
          </header>
          <section className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 bg-[#1e1e1e]">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

