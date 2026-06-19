/** Shared helpers for the local data-mode implementations. */
import { ApiError } from "@/lib/api/client";
import { getDb } from "@/lib/api/local/db";
import type { Page } from "@/lib/api/types";

/** Generate a RFC4122 UUID (available in all modern browsers + Node 19+). */
export function uuid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Throw an ApiError so pages handle local failures like remote ones. */
export function fail(message: string, status = 400, details?: unknown): never {
  throw new ApiError(message, status, details);
}

export function notFound(message: string): never {
  throw new ApiError(message, 404);
}

interface PageParams {
  page?: number;
  pageSize?: number;
}

/** Slice an in-memory array into a Page<T> envelope matching the backend. */
export function paginate<T>(items: T[], params?: PageParams): Page<T> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.pageSize ?? 20);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages },
  };
}

/** Sort rows by an ISO `createdAt` field, newest first. */
export function byCreatedDesc<T extends { createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const row = await (await getDb()).get("meta", key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put("meta", { key, value });
}

const CURRENT_USER_KEY = "currentUserId";

export async function setCurrentUserId(userId: string): Promise<void> {
  await setMeta(CURRENT_USER_KEY, userId);
}

export async function currentUserId(): Promise<string> {
  const id = await getMeta<string>(CURRENT_USER_KEY);
  if (!id) fail("本地用户尚未初始化，请刷新页面。", 401);
  return id;
}
