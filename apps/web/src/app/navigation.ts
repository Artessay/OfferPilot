import {
  Briefcase,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Layers,
  Send,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Primary workspace navigation (docs/04 §4.2). */
export const primaryNav: NavItem[] = [
  { to: "/app", label: "AI 工作台", icon: LayoutDashboard, end: true },
  { to: "/app/profile", label: "求职画像", icon: UserRound },
  { to: "/app/resumes", label: "简历中心", icon: FileText },
  { to: "/app/jobs", label: "岗位中心", icon: Briefcase },
  { to: "/app/jobs/discovery", label: "AI 岗位发现", icon: Layers },
  { to: "/app/reports", label: "匹配报告", icon: ClipboardCheck },
  { to: "/app/applications", label: "投递跟踪", icon: Send },
];

export const secondaryNav: NavItem[] = [
  { to: "/app/settings", label: "系统设置", icon: Settings },
];
