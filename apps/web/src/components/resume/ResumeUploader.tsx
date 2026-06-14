import { type ChangeEvent, useRef, useState } from "react";

import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ResumeUploaderProps {
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
}

/** Resume upload control (PDF/DOCX/TXT), drag-or-click. */
export function ResumeUploader({ onUpload, uploading }: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-surface-subtle p-6">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UploadCloud className="h-5 w-5 text-assistant" aria-hidden />
        支持 PDF、DOCX、TXT，单文件 10MB 以内
      </div>
      <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Spinner className="text-white" /> : null}
        {uploading ? "解析中…" : "上传简历"}
      </Button>
      {error ? <p className="text-xs text-critical">{error}</p> : null}
    </div>
  );
}
