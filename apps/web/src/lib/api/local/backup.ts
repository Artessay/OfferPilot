/**
 * Local data export / import / reset. Lets a user back up their in-browser data
 * to a JSON file and restore it on another device or browser — the manual
 * cross-device story for the static (GitHub Pages) deployment.
 */
import { ALL_STORES, getDb } from "@/lib/api/local/db";

export interface BackupFile {
  app: "offerpilot";
  version: number;
  exportedAt: string;
  stores: Record<string, unknown[]>;
}

export async function exportAllData(): Promise<BackupFile> {
  const db = await getDb();
  const stores: Record<string, unknown[]> = {};
  for (const name of ALL_STORES) stores[name] = await db.getAll(name);
  return {
    app: "offerpilot",
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
  };
}

export async function importAllData(backup: BackupFile): Promise<void> {
  if (!backup || backup.app !== "offerpilot" || typeof backup.stores !== "object") {
    throw new Error("备份文件格式不正确。");
  }
  const db = await getDb();
  const tx = db.transaction(ALL_STORES, "readwrite");
  for (const name of ALL_STORES) {
    const store = tx.objectStore(name);
    await store.clear();
    for (const row of backup.stores[name] ?? []) await store.put(row as never);
  }
  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(ALL_STORES, "readwrite");
  for (const name of ALL_STORES) await tx.objectStore(name).clear();
  await tx.done;
}

/** Trigger a browser download of the current data as a JSON backup file. */
export async function downloadBackup(): Promise<void> {
  const backup = await exportAllData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `offerpilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
