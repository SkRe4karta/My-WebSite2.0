import { z } from "zod";

export const notePayload = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  content: z.string().default(""),
  format: z.enum(["MARKDOWN", "PLAINTEXT"]).default("MARKDOWN"),
  tags: z.array(z.string()).default([]),
  folder: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
  attachments: z.array(z.string()).optional(),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).default("DRAFT"),
});

export const filePayload = z.object({
  parentId: z.string().nullable().optional(),
  isFolder: z.boolean().default(false),
  name: z.string().min(1),
});

export const vaultPayload = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  secretType: z.enum(["FILE", "PASSWORD", "NOTE"]).default("FILE"),
  metadata: z.object({ value: z.string().optional() }).passthrough().optional(),
});

export const ideaPayload = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  mood: z.string().optional(),
  category: z.string().optional(),
  tags: z.union([z.array(z.string()), z.record(z.string(), z.any())]).optional(),
  date: z.string(),
});
