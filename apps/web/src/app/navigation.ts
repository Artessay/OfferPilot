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
  { to: "/", label: "AI 工作台", icon: LayoutDashboard, end: true },
  { to: "/profile", label: "求职画像", icon: UserRound },
  { to: "/resumes", label: "简历中心", icon: FileText },
  { to: "/jobs", label: "岗位中心", icon: Briefcase },
  { to: "/jobs/discovery", label: "AI 岗位发现", icon: Layers },
  { to: "/reports", label: "匹配报告", icon: ClipboardCheck },
  { to: "/applications", label: "投递跟踪", icon: Send },
];

export const secondaryNav: NavItem[] = [
  { to: "/settings", label: "系统设置", icon: Settings },
];
