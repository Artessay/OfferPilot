/**
 * Canonical skill taxonomy with synonyms — a faithful port of the backend
 * `app/ai/skills.py`. Maps a canonical skill label to lowercase aliases so
 * "熟悉 Python" / "python 编程" both normalise to `Python`.
 *
 * NOTE: object key insertion order is preserved (no integer-like keys), which
 * matches the deterministic ordering of the Python dicts.
 */

// canonical -> aliases (all matched case-insensitively)
export const HARD_SKILLS: Record<string, string[]> = {
  Python: ["python", "py"],
  Java: ["java"],
  "C++": ["c++", "cpp"],
  Go: ["golang", " go "],
  JavaScript: ["javascript", "js"],
  TypeScript: ["typescript", "ts"],
  SQL: ["sql", "mysql", "postgresql", "sql 查询", "数据库查询"],
  Excel: ["excel", "vlookup", "数据透视"],
  Tableau: ["tableau"],
  "Power BI": ["power bi", "powerbi"],
  Pandas: ["pandas"],
  NumPy: ["numpy"],
  PyTorch: ["pytorch"],
  TensorFlow: ["tensorflow"],
  机器学习: ["机器学习", "machine learning", "ml"],
  深度学习: ["深度学习", "deep learning"],
  数据分析: ["数据分析", "data analysis", "数据分析能力"],
  数据可视化: ["数据可视化", "data visualization"],
  "A/B 实验": ["a/b", "ab test", "ab 实验", "a/b 实验", "对照实验"],
  统计分析: ["统计分析", "统计学", "statistics"],
  Spark: ["spark", "pyspark"],
  Hadoop: ["hadoop"],
  Linux: ["linux", "shell"],
  Git: ["git", "github", "gitlab"],
  Docker: ["docker", "容器"],
  React: ["react"],
  Vue: ["vue"],
  FastAPI: ["fastapi"],
  Django: ["django"],
  Spring: ["spring", "spring boot"],
  产品设计: ["产品设计", "product design", "prd"],
  用户研究: ["用户研究", "user research", "用户调研"],
  数据建模: ["数据建模", "data modeling"],
};

export const SOFT_SKILLS: Record<string, string[]> = {
  沟通能力: ["沟通", "communication", "表达能力"],
  团队协作: ["团队协作", "协作", "teamwork", "团队合作"],
  业务理解: ["业务理解", "业务敏感", "business acumen", "业务洞察"],
  学习能力: ["学习能力", "快速学习", "learning"],
  抗压能力: ["抗压", "抗压能力", "结果导向"],
  项目管理: ["项目管理", "project management", "推进能力"],
  领导力: ["领导力", "leadership", "带领团队"],
};

function matchSkills(text: string, taxonomy: Record<string, string[]>): string[] {
  const lowered = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  for (const [canonical, aliases] of Object.entries(taxonomy)) {
    if (aliases.some((alias) => lowered.includes(alias.toLowerCase()))) found.push(canonical);
  }
  return found;
}

export function extractHardSkills(text: string): string[] {
  return matchSkills(text, HARD_SKILLS);
}

export function extractSoftSkills(text: string): string[] {
  return matchSkills(text, SOFT_SKILLS);
}

/** Resolve a raw skill string to its canonical form, if recognised. */
export function normalizeSkill(raw: string): string | null {
  const lowered = raw.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries({ ...HARD_SKILLS, ...SOFT_SKILLS })) {
    if (
      lowered === canonical.toLowerCase() ||
      aliases.some((alias) => lowered === alias.toLowerCase().trim())
    ) {
      return canonical;
    }
  }
  return null;
}
