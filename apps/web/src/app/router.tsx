import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

// React Router basename must not have a trailing slash ("/foo/" -> "/foo").
const basename = (import.meta.env.VITE_BASE_PATH ?? "/").replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "profile", element: <PlaceholderPage title="求职画像" /> },
        { path: "resumes", element: <PlaceholderPage title="简历中心" /> },
        { path: "jobs", element: <PlaceholderPage title="岗位中心" /> },
        {
          path: "recommendations",
          element: <PlaceholderPage title="分层推荐" />,
        },
        { path: "reports", element: <PlaceholderPage title="匹配报告" /> },
        { path: "applications", element: <PlaceholderPage title="投递跟踪" /> },
        { path: "settings", element: <PlaceholderPage title="系统设置" /> },
        { path: "*", element: <PlaceholderPage title="页面不存在" /> },
      ],
    },
  ],
  { basename },
);
