import { createBrowserRouter } from "react-router-dom";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { DiscoveryPage } from "@/pages/DiscoveryPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { JobsPage } from "@/pages/JobsPage";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RecommendationPage } from "@/pages/RecommendationPage";
import { ReportDetailPage } from "@/pages/ReportDetailPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { ResumeDetailPage } from "@/pages/ResumeDetailPage";
import { ResumesPage } from "@/pages/ResumesPage";
import { RewritePage } from "@/pages/RewritePage";

// React Router basename must not have a trailing slash ("/foo/" -> "/foo").
const basename = (import.meta.env.VITE_BASE_PATH ?? "/").replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: (
        <AuthGuard>
          <AppLayout />
        </AuthGuard>
      ),
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "resumes", element: <ResumesPage /> },
        { path: "resumes/:resumeId", element: <ResumeDetailPage /> },
        { path: "jobs", element: <JobsPage /> },
        { path: "jobs/discovery", element: <DiscoveryPage /> },
        { path: "jobs/:jobId", element: <JobDetailPage /> },
        { path: "recommendations/:recommendationId", element: <RecommendationPage /> },
        { path: "reports", element: <ReportsPage /> },
        { path: "reports/:reportId", element: <ReportDetailPage /> },
        { path: "resume-rewrites/:rewriteTaskId", element: <RewritePage /> },
        { path: "applications", element: <PlaceholderPage title="投递跟踪" /> },
        { path: "settings", element: <PlaceholderPage title="系统设置" /> },
        { path: "*", element: <PlaceholderPage title="页面不存在" /> },
      ],
    },
  ],
  { basename },
);
