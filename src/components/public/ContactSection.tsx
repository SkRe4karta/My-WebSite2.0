const contacts = [
  { label: "Почта", value: "zelyonkin.d@gmail.com", href: "mailto:zelyonkin.d@gmail.com" },
  { label: "Telegram", value: "@skre4karta", href: "https://t.me/skre4karta" },
  { label: "VK", value: "vk.com/skre4karta", href: "https://vk.com/skre4karta" },
  { label: "GitHub", value: "github.com/SkRe4karta", href: "https://github.com/SkRe4karta" },
  { label: "LeetCode", value: "leetcode.com/u/skre4karta", href: "https://leetcode.com/u/skre4karta/" },
];

export default function ContactSection() {
  return (
    <section className="glass-panel grid gap-6 p-4 sm:p-6 md:p-8 text-white md:grid-cols-2 w-full">
      <div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#4CAF50] mb-4 sm:mb-5">Контакты</h2>
        <p className="mt-4 text-base sm:text-lg text-[#cccccc]">
         Мои username в различных сервисах.
        </p>
      </div>
      <ul className="space-y-4 text-base text-[#cccccc]">
        {contacts.map((item) => (
          <li key={item.label} className="flex flex-col rounded-2xl border border-[#4CAF50]/40 bg-[#333] p-4 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#444]">
            <span className="text-xs uppercase tracking-wide text-[#cccccc] mb-2 font-semibold">{item.label}</span>
            <a href={item.href} className="text-lg font-bold text-[#4CAF50] hover:text-[#45a049] transition-all duration-300 hover:gap-1">
              {item.value}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
