const FALLBACK_MESSAGE = "操作失败，请稍后重试。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function detailMessage(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (isRecord(item) && typeof item.msg === "string") return item.msg;
        return null;
      })
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.join("；") : null;
  }
  if (isRecord(detail) && typeof detail.message === "string") return detail.message;
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;

  if (isRecord(error)) {
    const message = detailMessage(error.detail) ?? detailMessage(error.message) ?? detailMessage(error.error);
    if (message) return message;
  }

  return FALLBACK_MESSAGE;
}