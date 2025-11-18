import crypto from "crypto";

function getKey() {
  const base = process.env.VAULT_ENCRYPTION_KEY;
  if (!base) {
    throw new Error("VAULT_ENCRYPTION_KEY is not configured");
  }
  const salt = process.env.ENCRYPTED_STORAGE_SALT ?? "";
  return crypto.createHash("sha256").update(base + salt).digest();
}

export function encryptBuffer(buffer: Buffer) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encrypted, iv, authTag };
}

export function decryptBuffer(encrypted: Buffer, iv: Buffer, authTag: Buffer) {
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptString(value: string) {
  const { encrypted, iv, authTag } = encryptBuffer(Buffer.from(value, "utf8"));
  return {
    payload: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
  };
}

export function decryptString(payload: string, iv: string, tag: string) {
  const buffer = Buffer.from(payload, "base64");
  const ivBuf = Buffer.from(iv, "base64");
  const tagBuf = Buffer.from(tag, "base64");
  return decryptBuffer(buffer, ivBuf, tagBuf).toString("utf8");
}
