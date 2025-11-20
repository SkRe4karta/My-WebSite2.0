/**
 * Утилиты для экспорта заметок в Markdown
 */

export interface NoteExportData {
  title: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export function exportNoteToMarkdown(data: NoteExportData): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push("---");
  lines.push(`title: ${data.title}`);
  lines.push(`created: ${data.createdAt.toISOString()}`);
  lines.push(`updated: ${data.updatedAt.toISOString()}`);
  if (data.tags && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (data.metadata) {
    lines.push(`metadata: ${JSON.stringify(data.metadata)}`);
  }
  lines.push("---");
  lines.push("");

  // Заголовок
  lines.push(`# ${data.title}`);
  lines.push("");

  // Содержимое
  lines.push(data.content);

  return lines.join("\n");
}

export function exportNotesToMarkdown(notes: NoteExportData[]): string {
  const lines: string[] = [];

  lines.push("# Экспорт заметок");
  lines.push("");
  lines.push(`Экспортировано: ${new Date().toISOString()}`);
  lines.push(`Количество заметок: ${notes.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  notes.forEach((note, index) => {
    lines.push(`## ${index + 1}. ${note.title}`);
    lines.push("");
    lines.push(`**Создано:** ${note.createdAt.toLocaleString("ru-RU")}`);
    lines.push(`**Обновлено:** ${note.updatedAt.toLocaleString("ru-RU")}`);
    if (note.tags && note.tags.length > 0) {
      lines.push(`**Теги:** ${note.tags.join(", ")}`);
    }
    lines.push("");
    lines.push(note.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

