/**
 * Цветовая палитра проекта
 * Все цвета определены здесь для единообразия
 */

export const colors = {
  // Фон
  background: "#1e1e1e",
  
  // Поверхности
  surface: "#333",
  surfaceMuted: "#444",
  card: "#333",
  
  // Зелёные акценты
  accent: "#4CAF50",
  accentBright: "#4CAF50",
  accentStrong: "#45a049",
  accentSoft: "rgba(76, 175, 80, 0.15)",
  accentGlow: "rgba(76, 175, 80, 0.25)",
  
  // Текст
  text: "#ffffff",
  textBright: "#ffffff",
  textMuted: "#cccccc",
  textDim: "#cccccc",
  
  // Границы
  border: "rgba(76, 175, 80, 0.3)",
  borderHover: "rgba(76, 175, 80, 0.5)",
  borderStrong: "rgba(76, 175, 80, 0.4)",
  
  // Тени
  shadowGlow: "0 20px 60px rgba(76, 175, 80, 0.2)",
  shadowGlowStrong: "0 10px 40px rgba(76, 175, 80, 0.3)",
  
  // Ошибки
  error: "#ef4444",
  errorBg: "rgba(239, 68, 68, 0.1)",
  
  // Успех
  success: "#4CAF50",
  successBg: "rgba(76, 175, 80, 0.1)",
} as const;

export type ColorKey = keyof typeof colors;

