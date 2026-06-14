"""Canonical skill taxonomy with synonyms for normalisation.

Maps a canonical skill label to the lowercase aliases that should resolve to
it. Used by resume/JD extraction so "熟悉 Python"/"python 编程" both normalise to
``Python``. Intentionally curated for common student job domains (data, algo,
product, backend, frontend) rather than exhaustive.
"""

from __future__ import annotations

# canonical -> aliases (all matched case-insensitively)
HARD_SKILLS: dict[str, list[str]] = {
    "Python": ["python", "py"],
    "Java": ["java"],
    "C++": ["c++", "cpp"],
    "Go": ["golang", " go "],
    "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript", "ts"],
    "SQL": ["sql", "mysql", "postgresql", "sql 查询", "数据库查询"],
    "Excel": ["excel", "vlookup", "数据透视"],
    "Tableau": ["tableau"],
    "Power BI": ["power bi", "powerbi"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "PyTorch": ["pytorch"],
    "TensorFlow": ["tensorflow"],
    "机器学习": ["机器学习", "machine learning", "ml"],
    "深度学习": ["深度学习", "deep learning"],
    "数据分析": ["数据分析", "data analysis", "数据分析能力"],
    "数据可视化": ["数据可视化", "data visualization"],
    "A/B 实验": ["a/b", "ab test", "ab 实验", "a/b 实验", "对照实验"],
    "统计分析": ["统计分析", "统计学", "statistics"],
    "Spark": ["spark", "pyspark"],
    "Hadoop": ["hadoop"],
    "Linux": ["linux", "shell"],
    "Git": ["git", "github", "gitlab"],
    "Docker": ["docker", "容器"],
    "React": ["react"],
    "Vue": ["vue"],
    "FastAPI": ["fastapi"],
    "Django": ["django"],
    "Spring": ["spring", "spring boot"],
    "产品设计": ["产品设计", "product design", "prd"],
    "用户研究": ["用户研究", "user research", "用户调研"],
    "数据建模": ["数据建模", "data modeling"],
}

SOFT_SKILLS: dict[str, list[str]] = {
    "沟通能力": ["沟通", "communication", "表达能力"],
    "团队协作": ["团队协作", "协作", "teamwork", "团队合作"],
    "业务理解": ["业务理解", "业务敏感", "business acumen", "业务洞察"],
    "学习能力": ["学习能力", "快速学习", "learning"],
    "抗压能力": ["抗压", "抗压能力", "结果导向"],
    "项目管理": ["项目管理", "project management", "推进能力"],
    "领导力": ["领导力", "leadership", "带领团队"],
}


def _match_skills(text: str, taxonomy: dict[str, list[str]]) -> list[str]:
    lowered = f" {text.lower()} "
    found: list[str] = []
    for canonical, aliases in taxonomy.items():
        if any(alias.lower() in lowered for alias in aliases):
            found.append(canonical)
    return found


def extract_hard_skills(text: str) -> list[str]:
    return _match_skills(text, HARD_SKILLS)


def extract_soft_skills(text: str) -> list[str]:
    return _match_skills(text, SOFT_SKILLS)


def normalize_skill(raw: str) -> str | None:
    """Resolve a raw skill string to its canonical form, if recognised."""
    lowered = raw.lower().strip()
    for canonical, aliases in {**HARD_SKILLS, **SOFT_SKILLS}.items():
        if lowered == canonical.lower() or any(lowered == a.lower().strip() for a in aliases):
            return canonical
    return None
