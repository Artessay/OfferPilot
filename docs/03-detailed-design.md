# 「Offer 捕手」系统详细设计说明书

## 1. 文档概述

### 1.1 设计范围

本文档在需求分析和概要设计基础上，细化「Offer 捕手」网页端 MVP 的页面结构、后端服务、数据模型、核心算法、AI 编排、接口字段、异常处理、安全策略、测试方案和实施计划。设计目标是让后续开发可以按模块拆分任务并逐步实现。

### 1.2 MVP 功能闭环

MVP 以“目标岗位匹配分析”为主线：

1. 学生进入系统并创建试用或登录会话。
2. 学生填写求职画像。
3. 学生上传简历，系统解析简历。
4. 学生粘贴 JD，系统解析岗位要求。
5. 学生发起匹配任务，系统生成匹配报告。
6. 学生查看优化建议并标记采纳情况。
7. 学生查看历史报告和简历版本。

## 2. 前端详细设计

### 2.1 页面结构

| 页面 | 路由 | 核心功能 |
| --- | --- | --- |
| 工作台 | / | 展示最近报告、默认简历、快速导入 JD 入口、任务状态 |
| 求职画像 | /profile | 编辑目标岗位、城市、行业、技能、求职阶段 |
| 简历列表 | /resumes | 查看简历、上传简历、设置默认简历 |
| 简历详情 | /resumes/:resumeId | 查看解析结果、简历版本、结构化字段 |
| 岗位列表 | /jobs | 查看已导入岗位、搜索岗位、创建岗位 |
| 岗位详情 | /jobs/:jobId | 查看 JD 解析结果、发起匹配 |
| 新建匹配 | /matches/new | 选择简历版本和岗位，确认创建匹配任务 |
| 报告详情 | /reports/:reportId | 展示总分、维度分、优势、差距、优化建议 |
| 历史报告 | /reports | 按岗位、简历、时间筛选历史报告 |
| 投递记录 | /applications | 记录投递状态，MVP 可作为弱功能或后续扩展 |
| 管理后台 | /admin | 岗位库、提示词、评分规则管理，MVP 可仅预留 |

### 2.2 核心组件

| 组件 | 说明 | 关键属性 |
| --- | --- | --- |
| ResumeUploader | 简历上传组件 | accept、maxSize、onUploadSuccess、onUploadError |
| JDTextEditor | JD 粘贴与编辑组件 | value、onChange、minLength、metadata |
| SkillTagEditor | 技能标签编辑器 | selectedSkills、suggestedSkills、onAdd、onRemove |
| TaskProgress | 异步任务进度展示 | status、progress、estimatedSeconds、error |
| ScoreOverview | 匹配总览 | overallScore、level、summary |
| DimensionScoreList | 维度评分列表 | dimensionScores、evidenceRefs |
| EvidencePanel | 证据引用面板 | resumeEvidence、jobRequirement、confidence |
| GapAnalysisList | 差距分析列表 | gaps、severity、category |
| SuggestionCard | 优化建议卡片 | suggestion、priority、status、onUpdate |
| ReportExportButton | 报告导出入口 | reportId、format |

### 2.3 前端状态管理

| 状态类型 | 管理方式 | 示例 |
| --- | --- | --- |
| 服务端数据 | TanStack Query | 简历列表、岗位详情、报告详情 |
| 表单状态 | React Hook Form 或本地状态 | 画像表单、JD 表单 |
| 会话状态 | Context/Zustand | 当前用户、Token、角色 |
| UI 状态 | 组件本地状态 | 弹窗、展开折叠、当前 Tab |
| 任务状态 | 轮询或 Server-Sent Events | 解析任务、匹配任务 |

### 2.4 前端交互规则

1. 上传简历后立即展示解析任务进度，解析完成后跳转或刷新简历详情。
2. JD 输入少于 80 个中文字符或缺少职责/要求时，提示用户补充，不直接创建匹配任务。
3. 匹配报告生成中允许用户离开页面，回到工作台可继续查看任务状态。
4. 分数展示必须同时展示维度解释和证据，不单独突出总分。
5. 优化建议默认按优先级排序，用户可标记为“待处理、已采纳、暂不采纳”。
6. 删除简历、岗位或报告时需要二次确认，并说明可能影响历史报告追溯。

## 3. 后端详细设计

### 3.1 服务包结构建议

```text
app/
  api/
    v1/
      auth.py
      profiles.py
      resumes.py
      jobs.py
      matches.py
      reports.py
      applications.py
      admin.py
  core/
    config.py
    security.py
    errors.py
    logging.py
  models/
    user.py
    profile.py
    resume.py
    job.py
    match.py
    report.py
    application.py
  schemas/
    auth.py
    profile.py
    resume.py
    job.py
    match.py
    report.py
  services/
    auth_service.py
    profile_service.py
    resume_service.py
    job_service.py
    match_service.py
    report_service.py
    ai_orchestration_service.py
    storage_service.py
  ai/
    providers/
      base.py
      openai_compatible.py
    prompts/
      resume_parse.py
      job_parse.py
      match_report.py
      suggestions.py
    scoring.py
    validators.py
  workers/
    tasks.py
  db/
    session.py
    migrations/
```

### 3.2 领域服务职责

| 服务 | 公开方法 | 职责 |
| --- | --- | --- |
| AuthService | register、login、create_guest、get_current_user | 用户认证、Token 签发、匿名会话 |
| ProfileService | get_profile、update_profile、suggest_skills | 画像维护、技能标签建议 |
| ResumeService | upload_resume、parse_resume、create_version、delete_resume | 文件上传、解析任务、版本管理 |
| JobService | create_job、parse_job、update_job、delete_job | JD 导入、岗位解析、岗位维护 |
| MatchService | create_match_task、run_match、get_task_status | 匹配任务和评分流程 |
| ReportService | get_report、list_reports、update_suggestion_status | 报告查询、建议状态管理 |
| AIOrchestrationService | parse_resume、parse_job、score_match、generate_report、generate_suggestions | LLM 和规则评分编排 |
| StorageService | save_file、get_file、delete_file、generate_download_url | 对象存储适配 |

## 4. 数据库详细设计

### 4.1 表设计

#### users

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| email | varchar | 邮箱，可为空，匿名用户为空 |
| password_hash | varchar | 密码哈希 |
| nickname | varchar | 昵称 |
| role | varchar | student、admin |
| account_type | varchar | registered、guest |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |
| deleted_at | timestamp | 删除时间 |

#### profiles

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| education_level | varchar | 学历 |
| school | varchar | 学校 |
| major | varchar | 专业 |
| graduation_year | int | 毕业年份 |
| target_roles | jsonb | 目标岗位 |
| target_cities | jsonb | 目标城市 |
| industries | jsonb | 目标行业 |
| skills | jsonb | 技能标签 |
| career_interests | jsonb | 职业兴趣 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### resumes

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| title | varchar | 简历标题 |
| file_key | varchar | 对象存储路径 |
| file_name | varchar | 原始文件名 |
| file_type | varchar | 文件类型 |
| file_size | int | 文件大小 |
| status | varchar | uploaded、parsing、parsed、failed、deleted |
| is_default | boolean | 是否默认简历 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |
| deleted_at | timestamp | 删除时间 |

#### resume_versions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| resume_id | uuid | 简历 ID |
| version_no | int | 版本号 |
| source_report_id | uuid | 来源报告，可为空 |
| raw_text | text | 简历解析文本 |
| structured_data | jsonb | 教育、经历、项目、技能等结构化信息 |
| skill_tags | jsonb | 技能标签 |
| summary | text | 版本摘要 |
| created_at | timestamp | 创建时间 |

#### jobs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| user_id | uuid | 创建用户，后台岗位可为空或为管理员 |
| title | varchar | 岗位名称 |
| company | varchar | 公司 |
| city | varchar | 城市 |
| source_type | varchar | manual、file、admin、api |
| source_url | varchar | 来源链接，可为空 |
| jd_text | text | JD 原文 |
| status | varchar | created、parsing、parsed、failed、deleted |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |
| deleted_at | timestamp | 删除时间 |

#### job_analyses

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| job_id | uuid | 岗位 ID |
| responsibilities | jsonb | 岗位职责 |
| requirements | jsonb | 任职要求 |
| hard_skills | jsonb | 硬技能 |
| soft_skills | jsonb | 软技能 |
| keywords | jsonb | 关键词 |
| bonus_points | jsonb | 加分项 |
| seniority_level | varchar | 岗位级别 |
| model_version | varchar | 解析模型版本 |
| prompt_version | varchar | 提示词版本 |
| created_at | timestamp | 创建时间 |

#### match_tasks

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| resume_version_id | uuid | 简历版本 ID |
| job_id | uuid | 岗位 ID |
| status | varchar | queued、running、succeeded、failed、cancelled |
| progress | int | 0 到 100 |
| error_code | varchar | 失败错误码 |
| error_message | text | 失败说明 |
| started_at | timestamp | 开始时间 |
| finished_at | timestamp | 完成时间 |
| created_at | timestamp | 创建时间 |

#### match_reports

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| match_task_id | uuid | 匹配任务 ID |
| user_id | uuid | 用户 ID |
| overall_score | int | 总分，0 到 100 |
| match_level | varchar | low、medium、high、excellent |
| dimension_scores | jsonb | 维度分 |
| strengths | jsonb | 匹配优势 |
| gaps | jsonb | 差距分析 |
| risks | jsonb | 风险提示 |
| evidence | jsonb | 证据引用 |
| summary | text | 报告摘要 |
| scoring_version | varchar | 评分规则版本 |
| model_version | varchar | 模型版本 |
| prompt_version | varchar | 提示词版本 |
| created_at | timestamp | 创建时间 |

#### optimization_suggestions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| report_id | uuid | 报告 ID |
| category | varchar | keyword、experience、structure、impact、risk |
| priority | varchar | high、medium、low |
| problem | text | 当前问题 |
| reason | text | 建议理由 |
| suggestion | text | 修改建议 |
| example | text | 示例表达 |
| status | varchar | todo、accepted、dismissed |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### application_records

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| user_id | uuid | 用户 ID |
| job_id | uuid | 岗位 ID |
| report_id | uuid | 关联报告，可为空 |
| status | varchar | interested、applied、written_test、interview、offer、rejected、closed |
| applied_at | timestamp | 投递时间 |
| note | text | 备注 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 4.2 索引设计

| 表 | 索引 | 用途 |
| --- | --- | --- |
| resumes | user_id、status、created_at | 查询用户简历列表 |
| resume_versions | resume_id、version_no | 查询简历版本 |
| jobs | user_id、title、company、created_at | 岗位搜索和列表 |
| match_tasks | user_id、status、created_at | 工作台任务状态 |
| match_reports | user_id、job_id、created_at | 历史报告查询 |
| optimization_suggestions | report_id、status | 建议列表和状态筛选 |
| application_records | user_id、status、applied_at | 投递看板 |

## 5. 核心算法详细设计

### 5.1 简历解析算法

输入：简历文件或文本。

输出：结构化简历、技能标签、经历摘要、向量化片段。

处理步骤：

1. 文件类型校验：仅允许 PDF、DOCX、TXT，限制文件大小。
2. 文本提取：使用 PDF/DOCX 解析器提取纯文本。
3. 文本清洗：移除页眉页脚、重复空格、乱码和无效字符。
4. 分段识别：根据标题和语义识别教育经历、实习经历、项目经历、技能、证书等段落。
5. 规则抽取：提取学校、专业、时间、公司、岗位、项目名、技术关键词。
6. LLM 结构化补全：将清洗文本转换为 JSON 结构，并标记置信度。
7. 事实校验：结构化字段必须能在原文中找到证据，无法证明的字段标记为 inferred 或 discarded。
8. 向量化：对经历片段、技能段落、项目描述生成 Embedding。
9. 保存版本：生成 resume_version，并记录解析模型和提示词版本。

### 5.2 JD 解析算法

输入：岗位标题、公司、城市、JD 原文。

输出：职责、任职要求、技能、关键词、加分项、岗位级别。

处理步骤：

1. JD 有效性校验：检查文本长度、岗位职责和任职要求关键词。
2. 文本标准化：统一项目符号、段落和标点。
3. 结构化抽取：识别 responsibilities、requirements、hard_skills、soft_skills、bonus_points。
4. 技能归一化：将“Python 编程”“熟悉 Python”归一为 Python 等标准技能标签。
5. 要求分级：区分 must-have、should-have、nice-to-have。
6. 关键词权重：根据出现位置、频次和要求级别生成关键词权重。
7. 保存解析结果：写入 job_analyses。

### 5.3 匹配评分模型

匹配总分采用多维度加权评分，满分 100。MVP 默认权重如下：

| 维度 | 权重 | 说明 |
| --- | --- | --- |
| 硬技能匹配 | 25% | 编程语言、工具、专业技能、证书等 |
| 经历相关度 | 25% | 实习、项目、科研、竞赛与岗位职责的相关程度 |
| 关键词覆盖 | 15% | 简历是否覆盖 JD 中关键名词和能力表达 |
| 教育与基础条件 | 10% | 学历、专业、毕业时间、城市、实习时间等硬性条件 |
| 软技能与职业兴趣 | 10% | 沟通、协作、业务理解、职业兴趣匹配度 |
| 表达质量 | 10% | 简历是否量化结果、结构清晰、动词有力 |
| 风险扣分 | 5% | 明显缺失、虚假风险、目标不一致等扣分项 |

总分计算：

```text
overall_score = hard_skills * 0.25
              + experience * 0.25
              + keywords * 0.15
              + basic_conditions * 0.10
              + soft_skills_interest * 0.10
              + expression_quality * 0.10
              - risk_penalty * 0.05
```

评分等级：

| 分数 | 等级 | 解释 |
| --- | --- | --- |
| 85 到 100 | excellent | 高度匹配，可优先投递，重点优化表达细节 |
| 70 到 84 | high | 较匹配，有明确优势和少量差距 |
| 55 到 69 | medium | 部分匹配，需要补强关键词和经历表达 |
| 0 到 54 | low | 匹配不足，需谨慎投递或补齐关键能力 |

### 5.4 证据引用规则

每个维度分必须至少关联一条证据或缺口：

| 类型 | 示例 |
| --- | --- |
| resume_evidence | 简历中“使用 SQL 和 Python 完成用户留存分析项目” |
| job_requirement | JD 中“熟练使用 SQL/Python 进行数据分析” |
| matched_reason | 两者在技能和任务目标上高度一致 |
| missing_reason | JD 要求 A/B 实验，但简历未出现实验设计相关经历 |

LLM 生成解释时只能引用已提供的证据字段，不允许新增不存在的经历。

### 5.5 简历优化建议生成规则

建议类型：

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| keyword | 补充或调整关键词 | 将“数据处理”改为“使用 SQL 完成数据清洗和指标分析” |
| experience | 强化经历与 JD 职责的关联 | 将项目描述改写为岗位职责对应的任务和结果 |
| impact | 增加量化结果 | 补充提升效率、增长率、准确率、用户规模等数据 |
| structure | 调整简历结构 | 将目标岗位最相关项目前置 |
| risk | 风险提示 | 缺少真实经历支撑时建议补充学习或项目，而非编造 |

建议输出字段：

```json
{
  "category": "impact",
  "priority": "high",
  "problem": "项目描述只写了使用工具，缺少业务目标和结果。",
  "reason": "目标岗位强调数据驱动业务决策，需要看到分析结论和影响。",
  "suggestion": "补充分析目标、关键指标、你的动作和最终结果。",
  "example": "使用 SQL 和 Python 分析 10 万条用户行为数据，定位次日留存下降原因，并提出推送策略优化方案。",
  "evidenceRefs": ["resume_exp_03", "job_req_02"]
}
```

## 6. LLM Prompt 设计

### 6.1 通用约束

所有提示词必须包含以下约束：

1. 只基于输入的简历、JD 和画像内容分析。
2. 不得编造教育经历、实习经历、项目经历、奖项或技能。
3. 不确定的信息必须标记为 unknown 或 insufficient_evidence。
4. 输出必须符合指定 JSON Schema。
5. 对用户给出建议时，应区分“表达优化”和“真实能力补齐”。

### 6.2 简历解析 Prompt 输入

```json
{
  "resumeText": "...",
  "profileHint": {
    "targetRoles": ["数据分析师"],
    "educationLevel": "本科"
  },
  "schemaVersion": "resume_parse_v1"
}
```

### 6.3 JD 解析 Prompt 输入

```json
{
  "jobTitle": "数据分析实习生",
  "company": "示例公司",
  "jdText": "...",
  "schemaVersion": "job_parse_v1"
}
```

### 6.4 报告生成 Prompt 输入

```json
{
  "resumeAnalysis": {},
  "jobAnalysis": {},
  "dimensionScores": [],
  "evidence": [],
  "constraints": [
    "不得新增简历中不存在的经历",
    "每个结论必须关联证据或缺口",
    "建议应可执行"
  ]
}
```

### 6.5 LLM 成本与配额控制

| 控制点 | 设计 |
| --- | --- |
| Token 预算 | 按任务类型设置输入和输出 token 上限；简历解析、JD 解析、报告生成分别配置预算。 |
| 文本裁剪 | 进入模型前按段落优先级裁剪，保留教育、技能、目标岗位相关经历和 JD 核心要求。 |
| 结果缓存 | 以 file_hash、jd_hash、prompt_version、model_version 作为缓存键，避免重复解析同一简历或 JD。 |
| 模型分层 | 简历/JD 结构化抽取优先使用成本较低模型，最终报告解释可使用更强模型。 |
| 用户配额 | 匿名用户、注册用户、管理员演示账号配置不同日调用次数和批量岗位上限。 |
| 成本监控 | model_call_logs 记录模型、token 数、耗时、任务类型和估算成本，不记录完整敏感文本。 |
| 预算告警 | 当日成本、失败率或单用户调用量超过阈值时触发限流或降级。 |
| 降级策略 | 预算不足或模型不可用时，返回规则评分、关键词差距和稍后生成完整报告入口。 |

## 7. API 详细设计

### 7.1 创建岗位接口

POST /api/v1/jobs

请求：

```json
{
  "title": "数据分析实习生",
  "company": "示例科技",
  "city": "上海",
  "sourceType": "manual",
  "jdText": "岗位职责：... 任职要求：..."
}
```

响应：

```json
{
  "data": {
    "jobId": "job_001",
    "status": "created",
    "parseTaskId": "task_job_parse_001"
  },
  "requestId": "req_001",
  "timestamp": "2026-06-13T10:00:00Z"
}
```

### 7.2 创建匹配任务接口

POST /api/v1/matches

请求：

```json
{
  "resumeVersionId": "rv_001",
  "jobId": "job_001",
  "profileId": "profile_001"
}
```

响应：

```json
{
  "data": {
    "matchTaskId": "mt_001",
    "status": "queued",
    "estimatedSeconds": 20
  },
  "requestId": "req_002",
  "timestamp": "2026-06-13T10:01:00Z"
}
```

### 7.3 查询报告详情接口

GET /api/v1/reports/{reportId}

响应：

```json
{
  "data": {
    "reportId": "rpt_001",
    "job": {
      "jobId": "job_001",
      "title": "数据分析实习生",
      "company": "示例科技"
    },
    "resumeVersionId": "rv_001",
    "overallScore": 82,
    "matchLevel": "high",
    "summary": "你的 SQL、Python 和用户分析项目与岗位核心要求匹配度较高。",
    "dimensionScores": [
      {
        "code": "hard_skills",
        "name": "硬技能匹配",
        "score": 86,
        "evidenceRefs": ["ev_001"]
      }
    ],
    "strengths": [
      {
        "title": "数据分析工具匹配",
        "description": "简历中的 SQL 和 Python 项目能覆盖岗位核心工具要求。",
        "evidenceRefs": ["ev_001"]
      }
    ],
    "gaps": [
      {
        "category": "experience",
        "severity": "medium",
        "description": "JD 提到 A/B 实验，但简历缺少相关经历。",
        "evidenceRefs": ["ev_002"]
      }
    ],
    "suggestions": [
      {
        "suggestionId": "sg_001",
        "category": "keyword",
        "priority": "high",
        "problem": "项目描述未突出 SQL。",
        "suggestion": "在项目经历中明确 SQL 的使用场景和结果。",
        "example": "使用 SQL 构建用户留存分析表，定位关键流失环节。",
        "status": "todo"
      }
    ]
  },
  "requestId": "req_003",
  "timestamp": "2026-06-13T10:02:00Z"
}
```

## 8. 异常处理设计

### 8.1 错误码

| 错误码 | HTTP 状态 | 说明 | 用户提示 |
| --- | --- | --- | --- |
| AUTH_REQUIRED | 401 | 未登录或 Token 失效 | 请重新登录后继续操作。 |
| PERMISSION_DENIED | 403 | 无权访问资源 | 你没有权限访问该内容。 |
| RESUME_FILE_INVALID | 400 | 文件类型或大小不符合要求 | 请上传 PDF、DOCX 或 TXT 格式简历。 |
| RESUME_PARSE_FAILED | 422 | 简历解析失败 | 请重新上传，或改用文本简历。 |
| JD_TEXT_TOO_SHORT | 400 | JD 内容过短 | 请补充完整岗位职责和任职要求。 |
| JOB_PARSE_FAILED | 422 | JD 解析失败 | 请检查岗位描述后重试。 |
| MATCH_INPUT_INCOMPLETE | 400 | 缺少简历或岗位解析结果 | 请先完成简历和岗位解析。 |
| LLM_PROVIDER_FAILED | 503 | 模型服务失败 | AI 服务暂时不可用，请稍后重试。 |
| TASK_NOT_FOUND | 404 | 任务不存在 | 未找到该任务。 |
| RATE_LIMITED | 429 | 请求过于频繁 | 操作过于频繁，请稍后再试。 |

### 8.2 重试与降级

| 场景 | 处理方式 |
| --- | --- |
| 文档解析失败 | 允许用户重新上传或粘贴纯文本 |
| LLM 调用超时 | 后台重试 2 次，仍失败则返回规则评分和稍后重试入口 |
| JSON Schema 校验失败 | 自动要求模型按 Schema 修复一次，仍失败则记录异常 |
| 向量检索不可用 | 降级为关键词和规则评分 |
| 队列积压 | 前端展示预计等待时间，后端限制新任务创建频率 |

## 9. 安全与隐私详细设计

### 9.1 数据最小化

1. 匹配任务只读取当前所需的简历版本和岗位版本。
2. LLM 输入不包含账号密码、Token、系统内部 ID 等无关字段。
3. 日志只记录 requestId、用户 ID 哈希、任务 ID、错误码和耗时。
4. 模型调用日志不保存完整简历文本，可保存脱敏摘要和 token 统计。

### 9.2 权限控制

| 资源 | 权限规则 |
| --- | --- |
| 简历 | 仅创建者可读写删除 |
| 岗位 | 用户创建岗位仅创建者可读写；后台岗位可公开读取 |
| 匹配报告 | 仅报告所属用户可读取 |
| 建议 | 仅报告所属用户可更新状态 |
| 管理配置 | 仅管理员角色可访问 |

### 9.3 删除流程

删除简历时：

1. 将 resumes.status 标记为 deleted。
2. 删除对象存储中的原文件或加入异步删除队列。
3. 删除或失效相关向量索引。
4. 历史报告默认保留摘要但隐藏原文证据；如果用户选择彻底删除，则级联删除报告和建议。
5. 记录脱敏审计日志。

## 10. 测试设计

### 10.1 测试类型

| 类型 | 覆盖内容 |
| --- | --- |
| 单元测试 | 评分函数、字段校验、权限判断、错误处理 |
| 接口测试 | 上传简历、创建岗位、创建匹配任务、查询报告 |
| 集成测试 | 简历解析到报告生成的完整链路 |
| Prompt 测试 | 解析输出 Schema、禁止编造、建议质量 |
| 前端测试 | 表单校验、任务状态、报告展示、建议状态更新 |
| 安全测试 | 越权访问、文件类型绕过、日志脱敏、删除流程 |

### 10.2 评测样例

| 样例 | 简历 | JD | 预期 |
| --- | --- | --- | --- |
| S01 | 数据分析项目简历 | 数据分析实习 JD | 高匹配，提示补充 A/B 实验 |
| S02 | 算法竞赛简历 | 机器学习实习 JD | 较高匹配，强调工程实践差距 |
| S03 | 产品社团经历简历 | 产品经理实习 JD | 中高匹配，建议量化用户研究结果 |
| S04 | 无相关经历简历 | 后端开发 JD | 低匹配，提示技能和项目缺口 |
| S05 | JD 内容过短 | 任意简历 | 阻止创建匹配，提示补充 JD |

## 11. 实施计划

### 11.1 开发里程碑

| 里程碑 | 内容 | 产出 |
| --- | --- | --- |
| M1 基础工程 | 前端、后端、数据库、部署脚手架 | 可运行的空白系统和健康检查 |
| M2 简历与岗位 | 简历上传解析、JD 创建解析 | 简历详情和岗位详情可用 |
| M3 匹配报告 | 匹配任务、评分模型、报告生成 | 报告详情页可用 |
| M4 优化建议 | 建议生成、建议状态、历史报告 | 核心 MVP 闭环完成 |
| M5 安全与部署 | 鉴权、限流、日志脱敏、GitHub Pages 与后端部署 | 可演示系统 |

### 11.2 推荐开发顺序

1. 定义 OpenAPI 契约和数据库迁移。
2. 实现简历、岗位、匹配任务、报告的基础 CRUD。
3. 接入文档解析和 LLM Provider Adapter。
4. 实现评分模型和报告生成流程。
5. 实现前端工作台、简历、岗位、报告页面。
6. 补充隐私删除、限流、日志、测试和部署配置。

## 12. 详细设计验收点

1. 数据表能覆盖需求分析中的核心业务对象。
2. 页面、接口、服务和数据模型命名保持一致。
3. 匹配评分有明确维度、权重、等级和证据规则。
4. Prompt 设计具备事实约束和 JSON Schema 输出要求。
5. 异常处理覆盖文件解析失败、JD 无效、LLM 不可用、越权访问和限流。
6. 安全隐私设计覆盖简历存储、日志脱敏、用户删除和第三方模型调用。
7. 实施计划能支持从空仓库逐步开发到可演示 MVP。
