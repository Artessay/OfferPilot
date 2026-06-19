/**
 * First-run seed for the local data mode. Gives a fresh local user a realistic,
 * fully editable starting point (profile + one parsed resume + a small job
 * library) so the app is immediately usable. Everything is generated through
 * the ported AI so matches/reports/recommendations work against it.
 */
import { buildJobAnalysisData, buildResumeVersionData } from "@/lib/api/local/compute";
import { getDb, SEED_RESUME_FILE_NAME } from "@/lib/api/local/db";
import { nowIso, uuid } from "@/lib/api/local/helpers";
import type { JobDetail } from "@/lib/api/types";
import { DEMO_JOB_SUMMARIES, DEMO_PROFILE, getDemoJob } from "@/lib/demo-data";

const SEED_RESUME_TEXT = `教育背景
北京大学 应用统计学 硕士 2024.09 - 2026.06
浙江大学 统计学 本科 2020.09 - 2024.06

实习经历
字节跳动 数据分析实习生 2025.06 - 2025.09
负责使用 SQL 与 Python 完成 DAU/MAU 趋势分析，周报被业务线采纳
搭建 A/B 测试分析看板，覆盖 3 条产品线日均 500 万 UV
优化数据 ETL 流程，将每日报表产出时间缩短 40%
美团 商业分析实习生 2024.07 - 2024.10
分析外卖品类用户画像，输出竞品分析报告并推动运营策略调整
使用 Tableau 搭建区域销售看板，服务 5 个城市运营团队

项目经历
校园电商用户行为分析 2024.03 - 2024.06
爬取校园二手交易平台数据 10 万条，完成用户分群与流失预测
使用 XGBoost 建立预测模型，AUC 达 0.87

技能
SQL、Python、Tableau、Excel、A/B 测试、数据分析、统计分析、数据可视化

获奖
全国大学生数学建模竞赛一等奖
校级优秀毕业论文`;

/** Build a JD with proper section headers so the parser extracts structure. */
function buildJdText(detail: JobDetail): string {
  const analysis = detail.analysis;
  if (!analysis) return detail.jdText;
  const lines: string[] = ["岗位职责"];
  for (const r of analysis.responsibilities) lines.push(`- ${r}`);
  lines.push("任职要求");
  for (const r of analysis.requirements) lines.push(`- ${r}`);
  if (analysis.bonusPoints.length) {
    lines.push("加分项");
    for (const b of analysis.bonusPoints) lines.push(`- ${b}`);
  }
  return lines.join("\n");
}

export async function seedInitialData(userId: string): Promise<void> {
  const db = await getDb();
  const ts = nowIso();

  await db.put("profiles", {
    id: uuid(),
    userId,
    educationLevel: DEMO_PROFILE.educationLevel,
    school: DEMO_PROFILE.school,
    major: DEMO_PROFILE.major,
    graduationYear: DEMO_PROFILE.graduationYear,
    targetRoles: [...DEMO_PROFILE.targetRoles],
    targetCities: [...DEMO_PROFILE.targetCities],
    industries: [...DEMO_PROFILE.industries],
    skills: [...DEMO_PROFILE.skills],
    careerInterests: [...DEMO_PROFILE.careerInterests],
    updatedAt: ts,
  });

  const resumeId = uuid();
  await db.put("resumes", {
    id: resumeId,
    userId,
    title: "秋西_数据分析_北京大学硕士",
    fileName: SEED_RESUME_FILE_NAME,
    status: "parsed",
    isDefault: true,
    createdAt: ts,
    fileType: "txt",
    isSeed: true,
  });
  const version = buildResumeVersionData(SEED_RESUME_TEXT);
  await db.put("resume_versions", {
    id: uuid(),
    resumeId,
    versionNo: 1,
    sourceReportId: null,
    rawText: SEED_RESUME_TEXT,
    structuredData: version.structuredData,
    skillTags: version.skillTags,
    embedding: version.embedding,
    summary: version.summary,
    createdAt: ts,
  });

  for (const summary of DEMO_JOB_SUMMARIES) {
    const detail = getDemoJob(summary.id);
    if (!detail) continue;
    const jobId = uuid();
    const jdText = buildJdText(detail);
    await db.put("jobs", {
      id: jobId,
      userId,
      title: detail.title,
      company: detail.company,
      city: detail.city,
      sourceType: "manual",
      status: "parsed",
      jdText,
      createdAt: ts,
    });
    const analysis = buildJobAnalysisData(detail.title, detail.company, jdText);
    await db.put("job_analyses", {
      id: uuid(),
      jobId,
      responsibilities: analysis.responsibilities,
      requirements: analysis.requirements,
      hardSkills: analysis.hardSkills,
      softSkills: analysis.softSkills,
      keywords: analysis.keywords,
      bonusPoints: analysis.bonusPoints,
      seniorityLevel: analysis.seniorityLevel,
      embedding: analysis.embedding,
    });
  }
}
