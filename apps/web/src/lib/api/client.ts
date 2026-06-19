import type { Envelope } from "@/lib/api/types";
import { tokenStore } from "@/lib/auth/tokenStore";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;
type JsonBody = object | unknown[] | string | number | boolean | null;

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: BodyInit | JsonBody;
  query?: QueryParams;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return (configured || "/api/v1").replace(/\/+$/, "");
}

function appendQuery(params: URLSearchParams, key: string, value: QueryValue): void {
  if (value === null || value === undefined || value === "") return;
  params.append(key, String(value));
}

function buildUrl(path: string, query?: QueryParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl()}${normalizedPath}`;
  if (!query) return url;

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => appendQuery(params, key, item));
    else appendQuery(params, key, value);
  });

  const queryString = params.toString();
  return queryString ? `${url}${url.includes("?") ? "&" : "?"}${queryString}` : url;
}

function isFormBody(body: BodyInit | JsonBody): body is BodyInit {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function parseErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (typeof payload !== "object" || payload === null) return null;

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  if (Array.isArray(record.detail)) {
    const messages = record.detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "msg" in item) {
          const msg = (item as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
    if (messages.length) return messages.join("；");
  }
  return null;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as Envelope<T>).data;
  }
  return payload as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers: initHeaders, query, ...init } = options;
  const headers = new Headers(initHeaders);
  const token = tokenStore.getAccess();

  if (auth && token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormBody(body)) {
      requestBody = body;
    } else {
      headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers,
    body: requestBody,
  });

  if (response.status === 204) return undefined as T;

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new ApiError(
      parseErrorMessage(payload) ?? `请求失败：${response.status}`,
      response.status,
      payload,
    );
  }

  return unwrapEnvelope<T>(payload);
}

/** Download an attachment response, returning the blob and parsed filename. */
export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ blob: Blob; filename: string }> {
  const { auth = true, headers: initHeaders, query, method } = options;
  const headers = new Headers(initHeaders);
  const token = tokenStore.getAccess();
  if (auth && token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, query), { method: method ?? "GET", headers });
  if (!response.ok) {
    const payload = await readPayload(response);
    throw new ApiError(
      parseErrorMessage(payload) ?? `下载失败：${response.status}`,
      response.status,
      payload,
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  return { blob, filename: parseContentDispositionFilename(disposition) ?? "download" };
}

/** Extract a filename from a Content-Disposition header, preferring RFC 5987. */
function parseContentDispositionFilename(disposition: string): string | null {
  // RFC 5987 `filename*=UTF-8''...` carries percent-encoded non-ASCII names.
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Malformed encoding — fall back to the plain filename below.
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ?? null;
}