import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { ResumeUploader } from "@/components/resume/ResumeUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingBlock } from "@/components/ui/spinner";
import { resumeApi } from "@/lib/api/resources";

export function ResumesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["resumes"], queryFn: () => resumeApi.list() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["resumes"] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file, file.name, !data?.items.length),
    onSuccess: invalidate,
  });
  const defaultMutation = useMutation({
    mutationFn: (id: string) => resumeApi.setDefault(id),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => resumeApi.remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">简历中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">上传简历后系统会自动解析为能力画像。</p>
      </div>

      <ResumeUploader
        onUpload={(file) => uploadMutation.mutateAsync(file).then(() => undefined)}
        uploading={uploadMutation.isPending}
      />

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">还没有简历，先上传一份吧。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/resumes/${resume.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {resume.title}
                    </Link>
                    {resume.isDefault ? <Badge tone="primary">默认</Badge> : null}
                    <Badge tone={resume.status === "parsed" ? "success" : "neutral"}>
                      {resume.status === "parsed" ? "已解析" : resume.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{resume.fileName}</span>
                </div>
                <div className="flex gap-2">
                  {!resume.isDefault ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => defaultMutation.mutate(resume.id)}
                    >
                      设为默认
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("删除后历史报告可能无法追溯，确认删除？")) {
                        deleteMutation.mutate(resume.id);
                      }
                    }}
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
