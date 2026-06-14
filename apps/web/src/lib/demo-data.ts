/**
 * Static demo data for guest-mode browsing.
 * IDs use a "demo-" prefix so pages can distinguish demo vs real data.
 */
import type {
  DimensionScore,
  EvidenceItem,
  GapItem,
  JobDetail,
  JobSummary,
  Profile,
  ReportDetail,
  ReportSummary,
  ResumeDetail,
  ResumeSummary,
  ResumeVersion,
  Suggestion,
} from "@/lib/api/types";

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

const DEMO_RESUME_VERSION: ResumeVersion = {
  id: "demo-version-1",
  versionNo: 1,
  sourceReportId: null,
  structuredData: {
    experiences: [
      {
        company: "字节跳动",
        role: "数据分析实习生",
        period: "2025.06 – 2025.09",
        highlights: [
          "使用 SQL 与 Python 完成 DAU/MAU 趋势分析，产出周报被业务线采纳",
          "搭建 A/B 测试分析看板，覆盖 3 条产品线日均 500 万 UV",
          "优化数据 ETL 流程，将每日报表产出时间缩短 40%",
        ],
      },
      {
        company: "美团",
        role: "商业分析实习生",
        period: "2024.07 – 2024.10",
        highlights: [
          "分析外卖品类用户画像，输出竞品分析报告并推动运营策略调整",
          "利用 Tableau 搭建区域销售看板，服务 5 个城市运营团队",
        ],
      },
    ],
    projects: [
      {
        name: "校园电商用户行为分析",
        period: "2024.03 – 2024.06",
        highlights: [
          "爬取校园二手交易平台数据 10 万条，完成用户分群与流失预测",
          "使用 XGBoost 建立预测模型，AUC 达 0.87",
        ],
      },
    ],
    education: [
      {
        school: "上海交通大学",
        degree: "硕士",
        major: "应用统计学",
        period: "2024.09 – 2026.06",
      },
      {
        school: "南京大学",
        degree: "本科",
        major: "统计学",
        period: "2020.09 – 2024.06",
      },
    ],
    awards: ["全国大学生数学建模竞赛一等奖", "校级优秀毕业论文"],
  },
  skillTags: ["SQL", "Python", "Tableau", "Excel", "A/B测试", "XGBoost", "ETL", "数据可视化"],
  summary:
    "上海交通大学应用统计学硕士，具备字节跳动与美团的数据分析实习经验，擅长 SQL、Python 与数据可视化。",
  createdAt: "2025-11-15T10:00:00Z",
};

const DEMO_RESUME: ResumeDetail = {
  id: "demo-resume-1",
  title: "张明_数据分析_上海交大硕士",
  fileName: "张明_简历_2025.pdf",
  status: "parsed",
  isDefault: true,
  createdAt: "2025-11-15T10:00:00Z",
  latestVersion: DEMO_RESUME_VERSION,
};

export const DEMO_RESUME_SUMMARY: ResumeSummary = {
  id: DEMO_RESUME.id,
  title: DEMO_RESUME.title,
  fileName: DEMO_RESUME.fileName,
  status: DEMO_RESUME.status,
  isDefault: DEMO_RESUME.isDefault,
  createdAt: DEMO_RESUME.createdAt,
};

export function getDemoResume(): ResumeDetail {
  return DEMO_RESUME;
}

export function getDemoResumeVersion(): ResumeVersion {
  return DEMO_RESUME_VERSION;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const DEMO_JOBS: JobDetail[] = [
  {
    id: "demo-job-1",
    title: "数据分析师（用户增长方向）",
    company: "字节跳动",
    city: "上海",
    sourceType: "manual",
    status: "parsed",
    createdAt: "2025-11-16T08:00:00Z",
    jdText:
      "负责核心业务增长数据分析，搭建用户增长模型；通过 A/B 测试驱动产品迭代；熟练使用 SQL、Python、Hive，有 Tableau/PowerBI 经验优先。",
    analysis: {
      id: "demo-analysis-1",
      responsibilities: [
        "负责核心业务增长数据分析，输出周/月度数据报告",
        "搭建用户增长模型，定位增长瓶颈并推动优化",
        "设计并分析 A/B 测试，驱动产品迭代",
      ],
      requirements: [
        "本科及以上学历，统计学/数学/计算机相关专业",
        "熟练使用 SQL、Python 进行数据处理与分析",
        "有 Tableau/PowerBI 等可视化工具经验",
        "良好的逻辑思维与业务理解能力",
      ],
      hardSkills: ["SQL", "Python", "Hive", "Tableau", "A/B测试", "数据建模"],
      softSkills: ["逻辑思维", "沟通协作", "业务理解"],
      keywords: ["用户增长", "数据分析", "A/B测试", "增长模型"],
      bonusPoints: ["有大厂实习经验", "有数据仓库经验"],
      seniorityLevel: "junior",
    },
    isFavorite: false,
  },
  {
    id: "demo-job-2",
    title: "商业分析师",
    company: "阿里巴巴",
    city: "杭州",
    sourceType: "manual",
    status: "parsed",
    createdAt: "2025-11-17T08:00:00Z",
    jdText:
      "支持业务团队进行商业决策分析，挖掘业务增长机会；定期输出行业分析报告；要求统计/经济/管理类专业硕士，熟练使用 Excel、SQL。",
    analysis: {
      id: "demo-analysis-2",
      responsibilities: [
        "支持业务团队进行商业决策分析",
        "挖掘业务增长机会，输出可行性建议",
        "定期输出行业分析报告与竞品分析",
      ],
      requirements: [
        "硕士及以上学历，统计/经济/管理类专业",
        "熟练使用 Excel、SQL",
        "有咨询或分析类实习经验优先",
      ],
      hardSkills: ["Excel", "SQL", "数据分析", "行业研究"],
      softSkills: ["商业洞察", "演示汇报", "项目管理"],
      keywords: ["商业分析", "行业研究", "商业决策"],
      bonusPoints: ["有咨询公司实习经验"],
      seniorityLevel: "junior",
    },
    isFavorite: true,
  },
  {
    id: "demo-job-3",
    title: "市场营销数据分析实习生",
    company: "拼多多",
    city: "上海",
    sourceType: "manual",
    status: "parsed",
    createdAt: "2025-11-18T08:00:00Z",
    jdText:
      "协助营销团队完成活动数据分析与效果评估；使用 Python 进行用户行为分析；本科及以上在读，每周至少 4 天。",
    analysis: {
      id: "demo-analysis-3",
      responsibilities: [
        "协助营销团队完成活动数据分析与效果评估",
        "使用 Python 进行用户行为分析",
        "整理分析结论并输出报告",
      ],
      requirements: [
        "本科及以上在读，统计/数学/计算机相关专业",
        "熟悉 Python 或 R 语言",
        "每周至少 4 天到岗",
      ],
      hardSkills: ["Python", "R", "数据分析", "Excel"],
      softSkills: ["细心", "主动性"],
      keywords: ["市场营销", "用户行为分析", "活动效果评估"],
      bonusPoints: [],
      seniorityLevel: "intern",
    },
    isFavorite: false,
  },
];

export const DEMO_JOB_SUMMARIES: JobSummary[] = DEMO_JOBS.map(
  ({ id, title, company, city, sourceType, status, createdAt }) => ({
    id,
    title,
    company,
    city,
    sourceType,
    status,
    createdAt,
  }),
);

export function getDemoJob(jobId: string): JobDetail | undefined {
  return DEMO_JOBS.find((j) => j.id === jobId);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const DEMO_DIMENSIONS: DimensionScore[] = [
  { code: "hard_skills", name: "硬技能匹配", score: 85, weight: 0.3 },
  { code: "experience", name: "经验匹配", score: 78, weight: 0.25 },
  { code: "education", name: "学历匹配", score: 92, weight: 0.2 },
  { code: "soft_skills", name: "软技能匹配", score: 70, weight: 0.15 },
  { code: "industry", name: "行业契合度", score: 80, weight: 0.1 },
];

const DEMO_EVIDENCE: EvidenceItem[] = [
  { id: "e1", type: "matched_reason", text: "候选人在字节跳动有 A/B 测试与数据分析实习经验，与岗位要求高度匹配" },
  { id: "e2", type: "matched_reason", text: "熟练掌握 SQL、Python、Tableau，覆盖岗位所有硬技能要求" },
  { id: "e3", type: "matched_reason", text: "上海交通大学应用统计学硕士，学历背景优秀" },
  { id: "e4", type: "missing_reason", text: "缺少 Hive 大数据平台实际操作经验" },
  { id: "e5", type: "missing_reason", text: "简历中未体现用户增长建模的实际产出" },
];

const DEMO_GAPS: GapItem[] = [
  { severity: "medium", description: "缺少 Hive/Spark 等大数据平台操作经验，建议补充相关项目" },
  { severity: "low", description: "简历中未突出用户增长方向的分析经验，建议优化描述" },
];

const DEMO_SUGGESTIONS: Suggestion[] = [
  {
    id: "demo-sug-1",
    category: "experience",
    priority: "high",
    problem: "简历中 A/B 测试经验描述较笼统，未量化业务影响",
    reason: "岗位明确要求通过 A/B 测试驱动产品迭代，需要展示具体成果",
    suggestion: "在字节跳动实习经历中补充 A/B 测试的具体指标提升数据，如转化率提升百分比",
    example: "设计并执行 12 组 A/B 测试，推动首页推荐算法迭代，点击率提升 15%",
    evidenceRefs: ["e1"],
    rewritable: true,
    status: "pending",
  },
  {
    id: "demo-sug-2",
    category: "skills",
    priority: "medium",
    problem: "缺少 Hive 相关经验",
    reason: "岗位要求熟练使用 Hive，简历中未提及",
    suggestion: "如有 Hive 使用经验，请补充到技能标签或项目描述中",
    example: null,
    evidenceRefs: ["e4"],
    rewritable: false,
    status: "pending",
  },
  {
    id: "demo-sug-3",
    category: "expression",
    priority: "medium",
    problem: "ETL 优化成果可以更突出",
    reason: "该成果体现了候选人的工程能力，是加分项",
    suggestion: "将 ETL 优化描述改为 STAR 格式，突出技术方案与量化成果",
    example: "重构 ETL 管道（Airflow + Python），将报表产出时间从 4 小时压缩至 2.4 小时（↓40%），消除 3 个手动环节",
    evidenceRefs: ["e2"],
    rewritable: true,
    status: "pending",
  },
];

const DEMO_REPORT: ReportDetail = {
  id: "demo-report-1",
  job: { jobId: "demo-job-1", title: "数据分析师（用户增长方向）", company: "字节跳动" },
  resumeVersionId: "demo-version-1",
  overallScore: 82,
  matchLevel: "good",
  dimensionScores: DEMO_DIMENSIONS,
  strengths: [
    { title: "技能覆盖度高", description: "SQL、Python、Tableau 三项核心技能完全匹配" },
    { title: "实习经验对口", description: "字节跳动数据分析实习与目标岗位高度对口" },
  ],
  gaps: DEMO_GAPS,
  risks: [{ title: "竞争激烈", description: "该岗位属于热门方向，建议尽早投递" }],
  evidence: DEMO_EVIDENCE,
  summary:
    "候选人综合匹配度 82 分（良好）。硬技能覆盖全面，字节跳动实习经验高度对口。建议优化 A/B 测试成果描述、补充 Hive 经验以提升竞争力。",
  suggestions: DEMO_SUGGESTIONS,
  scoringVersion: "v2.0",
  createdAt: "2025-11-20T10:00:00Z",
};

export const DEMO_REPORT_SUMMARY: ReportSummary = {
  id: DEMO_REPORT.id,
  jobId: DEMO_REPORT.job.jobId,
  resumeVersionId: DEMO_REPORT.resumeVersionId,
  overallScore: DEMO_REPORT.overallScore,
  matchLevel: DEMO_REPORT.matchLevel,
  summary: DEMO_REPORT.summary,
  createdAt: DEMO_REPORT.createdAt,
};

export function getDemoReport(): ReportDetail {
  return DEMO_REPORT;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const DEMO_PROFILE: Profile = {
  id: "demo-profile-1",
  educationLevel: "硕士",
  school: "上海交通大学",
  major: "应用统计学",
  graduationYear: 2026,
  targetRoles: ["数据分析师", "商业分析师"],
  targetCities: ["上海", "杭州"],
  industries: ["互联网", "金融科技"],
  skills: ["SQL", "Python", "Tableau", "Excel", "A/B测试"],
  careerInterests: ["用户增长", "商业智能"],
  updatedAt: "2025-11-15T10:00:00Z",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether an ID represents demo data. */
export function isDemoId(id: string | undefined): boolean {
  return !!id && id.startsWith("demo-");
}
