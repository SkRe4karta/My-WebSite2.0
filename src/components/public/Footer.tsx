export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-[#4CAF50]/30 bg-[#1e1e1e] py-8 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e] to-transparent opacity-50" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#4CAF50]/50" />
            <span className="text-sm font-semibold text-[#4CAF50] tracking-wider">
              skre4karta
            </span>
            <span className="text-xs text-[#cccccc]/60">©</span>
            <span className="text-sm text-[#cccccc]">2025</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#4CAF50]/50" />
          </div>
          <p className="text-xs text-[#cccccc]/50">
            Сделано с использованием Next.js и Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}

