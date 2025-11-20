/**
 * Утилиты для экспорта заметок в PDF
 * 
 * Примечание: Для полноценной работы требуется установка puppeteer:
 * npm install puppeteer
 * 
 * Или использование библиотеки jsPDF для более легкого решения
 */

export interface NoteExportData {
  title: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Экспорт заметки в PDF (требует puppeteer)
 */
export async function exportNoteToPDF(data: NoteExportData): Promise<Buffer> {
  // Для реализации требуется puppeteer
  // Это заглушка, реальная реализация будет использовать puppeteer для генерации PDF
  
  throw new Error(
    "PDF export requires puppeteer. Install it with: npm install puppeteer"
  );
}

/**
 * Альтернативная реализация с использованием jsPDF (легче, но менее гибкая)
 */
export async function exportNoteToPDFSimple(data: NoteExportData): Promise<Buffer> {
  // Для реализации требуется jsPDF
  // Это заглушка, реальная реализация будет использовать jsPDF
  
  throw new Error(
    "PDF export requires jsPDF. Install it with: npm install jspdf"
  );
}

/**
 * Конвертация Markdown в HTML для последующего экспорта в PDF
 */
export function markdownToHTML(markdown: string): string {
  // Простая конвертация (для полноценной работы нужна библиотека типа marked)
  let html = markdown
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`(.*?)`/gim, "<code>$1</code>")
    .replace(/\n/gim, "<br>");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1, h2, h3 { color: #333; }
          code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

