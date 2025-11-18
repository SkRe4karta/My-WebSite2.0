import fs from "fs";
import path from "path";

const storageRoot = path.join(process.cwd(), "storage");
const uploadsDir = path.join(storageRoot, "uploads");
const vaultDir = path.join(storageRoot, "vault");

export function ensureStorage() {
  [storageRoot, uploadsDir, vaultDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function buildUserPath(userId: string, segments: string[] = [], vault = false) {
  ensureStorage();
  const safeSegments = segments.map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"));
  const base = vault ? vaultDir : uploadsDir;
  const dir = path.join(base, userId, ...safeSegments);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function writeFileFromBuffer(
  buffer: Buffer,
  options: { userId: string; filename: string; segments?: string[]; vault?: boolean },
) {
  const destDir = buildUserPath(options.userId, options.segments, options.vault);
  const filePath = path.join(destDir, options.filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function deleteIfExists(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

export function readFileToBuffer(filePath: string) {
  return fs.readFileSync(filePath);
}

export function toRelative(fullPath: string) {
  return path.relative(storageRoot, fullPath);
}

export function resolveRelative(relativePath: string) {
  return path.join(storageRoot, relativePath);
}

export { uploadsDir, vaultDir, storageRoot };
