import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ResumeDetailPage } from "@/pages/ResumeDetailPage";

describe("ResumeDetailPage", () => {
  it("renders structured demo resume object entries", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/app/resumes/demo-resume-1"]}>
          <Routes>
            <Route path="/app/resumes/:resumeId" element={<ResumeDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("秋西_数据分析_北京大学硕士")).toBeInTheDocument();
    expect(screen.getByText(/字节跳动/)).toBeInTheDocument();
    expect(screen.getByText("北京大学 · 硕士 · 应用统计学 · 2024.09 – 2027.06")).toBeInTheDocument();
  });
});