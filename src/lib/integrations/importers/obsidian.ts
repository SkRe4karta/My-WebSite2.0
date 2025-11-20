// Импорт заметок из Obsidian (Markdown файлы)

export type ObsidianNote = {
  title: string;
  content: string;
  path: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function importFromObsidian(files: File[]): Promise<ObsidianNote[]> {
  const notes: ObsidianNote[] = [];

  for (const file of files) {
    if (!file.name.endsWith(".md")) {
      continue;
    }

    const content = await file.text();
    const lines = content.split("\n");
    
    // Парсим frontmatter (если есть)
    let title = file.name.replace(".md", "");
    let tags: string[] = [];
    let contentStart = 0;

    if (lines[0] === "---") {
      const frontmatterEnd = lines.indexOf("---", 1);
      if (frontmatterEnd > 0) {
        const frontmatter = lines.slice(1, frontmatterEnd).join("\n");
        const titleMatch = frontmatter.match(/title:\s*(.+)/i);
        const tagsMatch = frontmatter.match(/tags:\s*\[(.+)\]/i);
        
        if (titleMatch) title = titleMatch[1].trim();
        if (tagsMatch) {
          tags = tagsMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
        }
        
        contentStart = frontmatterEnd + 1;
      }
    }

    const noteContent = lines.slice(contentStart).join("\n");

    notes.push({
      title,
      content: noteContent,
      path: file.name,
      tags,
      createdAt: new Date(file.lastModified),
      updatedAt: new Date(file.lastModified),
    });
  }

  return notes;
}

