import { type ChangeEvent, useRef, useState } from "react";

import { Database, Download, Trash2, Upload } from "lucide-react";

import {
  type BackupFile,
  clearAllData,
  downloadBackup,
  importAllData,
} from "@/lib/api/local/backup";

/**
 * Local-mode data controls shown in the header in place of login/logout.
 * Lets the user back up, restore, or clear their in-browser data — the
 * persistence + manual cross-device story for the static (Pages) build.
 */
export function LocalModeControls({ nickname }: { nickname?: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    setBusy(true);
    try {
      await downloadBackup();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await file.text()) as BackupFile;
      await importAllData(backup);
      window.location.reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "导入失败，请检查备份文件。");
      setBusy(false);
      setOpen(false);
    }
  };

  const onClear = async () => {
    if (!window.confirm("确定清空本地所有数据？此操作不可撤销，建议先导出备份。")) return;
    setBusy(true);
    try {
      await clearAllData();
      window.location.reload();
    } catch {
      setBusy(false);
      setOpen(false);
    }
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-primary-light/60 disabled:opacity-50";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white"
      >
        <Database className="h-3.5 w-3.5" aria-hidden />
        本地数据
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="关闭菜单"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-border bg-surface p-1 shadow-lg">
            <p className="px-2 py-1 text-[11px] text-muted-foreground">
              {nickname ?? "本地用户"} · 数据仅存本机
            </p>
            <button type="button" className={itemClass} onClick={onExport} disabled={busy}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              导出备份
            </button>
            <button
              type="button"
              className={itemClass}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              导入备份
            </button>
            <button type="button" className={itemClass} onClick={onClear} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              清空数据
            </button>
          </div>
        </>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFile}
      />
    </div>
  );
}
