# ADR 0001：架构与工具链选型

- 状态：已接受（Accepted）
- 日期：2026-06-13
- 适用范围：OfferPilot 第一阶段（MVP + V1.1）工程基线

## 背景

「Offer 捕手 / OfferPilot」需从一份完善的需求与设计文档（docs/01–04）落地为
**面向大规模用户、可实际运行**的全栈系统：前后端分离、可演进为微服务、高复用、
高可维护、完善测试、可在开发机构建并部署到独立线上机。

本 ADR 记录工程基线（P0）阶段的关键决策，供后续维护者理解「为什么是这样」。

## 决策

### 1. 仓库结构：Monorepo

`apps/web`（前端）、`services/api`（后端）、`infra`、`docs` 同仓。
- 理由：前后端契约共享、原子提交、统一 CI；规模可控时优于多仓协调成本。

### 2. 后端架构：模块化单体（Modular Monolith，可演进为微服务）

按领域纵切：`app/modules/<domain>/{router,service,repository,models,schemas}`。
共享内核 `app/shared` 仅放跨域基础设施；依赖方向恒为 `modules -> shared`，
模块间只经 service 接口协作，不互相 import 对方 repository。
- 理由：绿地项目过早微服务会引入服务发现、分布式事务、多套部署等高额复杂度；
  模块化单体先保证交付速度，又把「未来按 `modules/<domain>` 整体迁出为独立服务」的
  边界预留好。属业界 Monolith-First 最佳实践。

### 3. 环境隔离：开发机 conda + nvm，部署机 Docker

- Python 后端：独立 conda 环境 `offerpilot`（`environment.yml` 声明），解释器与系统/
  其它环境隔离；依赖真源为 `pyproject.toml`，由 **uv** 安装（快、可复现）。
- Node 前端：**nvm** + `.nvmrc` 锁定 Node 22，pnpm 经 corepack 提供。
- 交付：**Docker + compose**，镜像可直接搬到线上机，消除「在我机器上能跑」问题。
- 理由：开发态要热重载/调试（conda/nvm 更顺手），交付态要不可变/可移植（容器最稳）。
  两套隔离互不污染，且都能一条命令复现。

### 4. 后端技术栈

FastAPI + Pydantic v2 + SQLAlchemy 2（async）+ Alembic + PostgreSQL/pgvector +
Redis + Arq（异步任务）+ structlog（结构化日志）。
- 理由：契合 Python AI 生态；类型友好；与设计文档（docs/02–03）一致。

### 5. 前端技术栈

React 18 + Vite 6 + TypeScript + React Router 6 + TanStack Query 5 +
Tailwind CSS 3 + shadcn/ui 风格组件（含 cva）。
- 理由：用户选定 Tailwind + shadcn；设计 token 直接落 `tailwind.config.ts`，
  精确对齐设计文档 §7.2 配色（`#003F88` 等）。

### 6. AI 接入：Provider 适配层 + 确定性 Mock

`app/ai/providers/{base,openai_compatible,fake}`；默认 `AI_PROVIDER=fake`。
- 理由：无外部 Key 即可端到端跑通与做 CI/测试；真实供应商可热切换，避免厂商绑定（NFR03）。

### 7. 统一契约：响应/错误信封 + requestId

成功 `{"data","requestId","timestamp"}`；错误 `{"error":{code,message,requestId,details}}`；
错误码集中在 `app/shared/errors.py`（对齐设计文档 §8.1）。
- 理由：前后端一致、可观测、可解释。

## 工具链版本（基线）

| 项目        | 版本                         |
| ----------- | ---------------------------- |
| Python      | 3.12（conda env `offerpilot`） |
| uv          | 0.10.x                       |
| Node        | 22（`.nvmrc`）               |
| pnpm        | 9.15.x（corepack）           |
| FastAPI     | 0.136.x（Starlette 1.x）     |
| React/Vite  | 18 / 6                       |
| Vitest      | 3.x                          |

> 备注：Starlette 1.x 弃用了 `HTTP_422_UNPROCESSABLE_ENTITY`；代码改用数字常量
> `422` 以跨版本兼容（见 `app/shared/errors.py`）。

## 后果

- 正面：交付快、边界清晰、测试/CI 在无外部依赖下绿灯、可平滑扩容与拆分。
- 代价：模块化单体在超大团队/超高负载下最终仍需拆分（已预留边界）；conda+nvm+docker
  三套环境对新人有一次性学习成本（已在 development.md 给出一键脚本与说明）。

## 备选方案（已否决）

- 真·微服务起步：复杂度与运维成本过高，绿地阶段不划算。
- 仅用 uv venv（不用 conda）：用户主用 conda，且要求显式的环境隔离，故 conda 优先。
- Tailwind v4 / 纯组件库（AntD/MUI）：偏离用户选型与「克制工作台」视觉定位。
