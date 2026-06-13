# OfferPilot

「Offer 捕手」是面向学生求职场景的 AI 求职匹配智能体，目标是帮助学生从岗位信息中找到更匹配的机会，并针对目标岗位优化简历表达，提升简历初筛命中率。

## 技术栈

- **前端**：React 18 · Vite 6 · TypeScript · React Router · TanStack Query · Tailwind CSS · shadcn/ui 风格组件
- **后端**：FastAPI（模块化单体）· Pydantic v2 · SQLAlchemy 2 · Alembic · PostgreSQL/pgvector · Redis · Arq
- **AI**：Provider 适配层（OpenAI 兼容可替换）+ 确定性 Mock（默认，无需外部 Key）
- **工程**：Monorepo · conda（后端）+ nvm（前端）+ Docker（交付）· GitHub Actions CI

## 目录结构

```
apps/web/        前端 SPA（GitHub Pages 静态部署）
services/api/    后端 API + Arq worker（模块化单体，按领域纵切）
infra/           docker-compose、Dockerfile、pgvector 初始化
docs/            需求、设计、开发与部署文档、ADR
environment.yml  conda 环境声明（后端解释器隔离）
.nvmrc           前端 Node 版本锁定
Makefile         统一开发命令入口
```

## 快速开始

> 详细的环境隔离说明与逐步指引见 **[开发环境构建指南](docs/development.md)**。

```bash
# 1) 搭建隔离环境（conda 后端 + nvm 前端）
make setup

# 2) 本地运行（方式 B：数据存储用 Docker，应用跑宿主机）
cd infra && docker compose up -d db redis && cd ..
make dev-api      # http://localhost:8000/docs
make dev-web      # http://localhost:5173

# 或：一键完整 Docker 栈
make docker-up    # api+worker+web+db+redis
```

质量门禁：`make lint`、`make typecheck`、`make test`。

## 文档

- [任务说明](docs/task.md)
- [需求分析报告](docs/01-requirements-analysis.md)
- [系统概要设计说明书](docs/02-system-architecture-design.md)
- [系统详细设计说明书](docs/03-detailed-design.md)
- [AI 原生用户交互与界面设计方案](docs/04-ai-native-interaction-ui-design.md)
- [开发环境构建指南](docs/development.md)
- [部署指南](docs/deployment.md)
- [架构与工具链决策 ADR](docs/adr/0001-architecture-and-tooling.md)

## 第一阶段范围

第一阶段按网页端 MVP 设计：前端采用静态网页部署，可发布到 GitHub Pages；后端采用独立 API 服务承载简历解析、岗位解析、匹配评分、报告生成和 AI 编排能力。工程基线（P0）已完成；业务能力按阶段（P1 数据与认证 → P2 简历/岗位/AI 基座 → …）增量实现，每阶段自带测试与文档。