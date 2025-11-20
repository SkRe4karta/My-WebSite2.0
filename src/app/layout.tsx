import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import Providers from "./providers";
import ConditionalLayout from "@/components/public/ConditionalLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "skre4karta",
  description:
    "Публичный сайт и приватный кабинет для управления заметками, файлами и идеями.",
  keywords: ["skre4karta", "zelyonkin", "портфолио", "Next.js"],
  authors: [{ name: "skre4karta" }],
  metadataBase: new URL("https://zelyonkin.ru"),
  openGraph: {
    title: "skre4karta",
    description:
      "Портфолио и рабочий кабинет. Проекты, контакт, доступ к админке.",
    url: "https://zelyonkin.ru",
    siteName: "skre4karta",
    locale: "ru_RU",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--text)] flex flex-col min-h-screen w-full overflow-x-hidden`}>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
