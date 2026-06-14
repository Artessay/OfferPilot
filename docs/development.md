# 开发环境构建指南（Development Guide）

本指南说明如何在**开发机**上构建「Offer 捕手 / OfferPilot」的完整本地环境，并解释
环境隔离策略。目标是：开发机与线上部署机彻底解耦，任何人都能用一致的步骤复现环境。

> 设计原则：**开发机用 conda + nvm 做语言级隔离，部署机用 Docker 做交付级隔离。**
> 两套环境互不污染，且都可被一条命令复现。

---

## 1. 环境隔离总览

| 关注点       | 工具                 | 说明                                                                 |
| ------------ | -------------------- | -------------------------------------------------------------------- |
| Python 后端  | **conda 环境** `offerpilot` | 独立 Python 3.12 解释器，与系统 Python / 其它 conda 环境完全隔离。`environment.yml` 声明式定义。 |
| Node 前端    | **nvm** + Node 22    | 独立 Node 版本，由 `.nvmrc` 锁定，不依赖系统 Node。pnpm 经 corepack 提供。 |
| 依赖管理     | **uv**（后端）/ **pnpm**（前端） | 快速、可复现；锁定文件入库。                                          |
| 交付 / 部署  | **Docker + compose** | 后端镜像、worker 镜像、前端静态镜像；与开发机解耦，直接搬到线上机运行。 |

为什么这样分层：

- 开发时需要热重载、断点调试、快速改包，conda/nvm 比容器更顺手。
- 部署时需要不可变、可移植、无「在我机器上能跑」问题，Docker 镜像最稳妥。
- 后端依赖唯一真源是 `services/api/pyproject.toml`；conda 只负责解释器，避免 conda/pip 双重管理。

---

## 2. 前置条件（开发机已需具备）

| 软件            | 版本（建议）        | 检查命令                  |
| --------------- | ------------------- | ------------------------- |
| conda/miniconda | ≥ 24                | `conda --version`         |
| git             | ≥ 2.30              | `git --version`           |
| Docker          | ≥ 24（含 compose v2）| `docker compose version`  |
| curl            | 任意                | `curl --version`          |

> nvm、Node、pnpm、uv 会在下面的步骤中安装，无需提前准备。
> （若系统已全局安装 uv 亦可直接复用。）

---

## 3. 一次性环境搭建

```bash
git clone <repo-url> OfferPilot
cd OfferPilot
```

### 3.1 一键搭建（推荐）

```bash
make setup        # = setup-api + setup-web
```

`make setup` 会：

1. `setup-api`：若 `offerpilot` conda 环境不存在则 `conda env create -f environment.yml`
   创建；随后在该环境内用 uv 安装后端依赖（含 dev 工具）。
2. `setup-web`：加载 nvm（按 `.nvmrc` 选择 Node 22），启用 corepack，`pnpm install`。

> 前提：nvm 已安装。若尚未安装，先执行 3.3 的 nvm 安装步骤一次。

### 3.2 后端环境（手动等价步骤）

```bash
# 1) 创建隔离的 conda 环境（声明式，可复现）
conda env create -f environment.yml      # 生成名为 offerpilot 的环境（Python 3.12 + uv）
conda activate offerpilot

# 2) 安装后端依赖（唯一真源：services/api/pyproject.toml）
cd services/api
uv pip install -e ".[dev]"               # 运行期 + 开发工具
cd ../..
```

### 3.3 前端环境（手动等价步骤）

```bash
# 1) 安装 nvm（仅首次；官方脚本）
export NVM_DIR="$HOME/.nvm"
curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# 重新打开终端，或：
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 2) 安装并选用 .nvmrc 指定的 Node 版本（22）
nvm install           # 读取 .nvmrc
nvm use

# 3) 启用 pnpm（通过 corepack）并安装依赖
corepack enable
cd apps/web
pnpm install
cd ../..
```

---

## 4. 本地运行

### 方式 A：完整 Docker 栈（最接近线上）

```bash
make docker-up        # 构建并启动 db(pgvector) + redis + api + worker + web
# 访问：
#   API   http://localhost:8000/docs
#   Web   http://localhost:8080
make docker-logs      # 跟踪日志
make docker-down      # 停止
```

### 方式 B：数据存储用 Docker，应用跑在宿主机（开发最常用）

```bash
# 1) 仅启动数据库与缓存
cd infra && docker compose up -d db redis && cd ..

# 2) 三个终端分别运行（均使用隔离环境）
make dev-api          # FastAPI 热重载 → http://localhost:8000
make dev-worker       # Arq 后台 worker
make dev-web          # Vite 开发服务器 → http://localhost:5173
```

> `make dev-*` 会自动加载对应的 conda / nvm 环境，无需手动 `conda activate` / `nvm use`。

### 方式 C：轻量级 Debug 模式（SQLite，免 Docker，单条命令）

概念验证 / 快速交付阶段，无需 Postgres、Redis、Docker：后端用一个 SQLite 文件存储，
AI 走确定性的离线 `fake` provider，启动时自动建表并注入演示数据。

```bash
make setup-api        # 一次性：复用现有 offerpilot conda 环境装好依赖
make debug            # 起后端 → http://localhost:8000/docs（含演示账号与样例数据）
```

演示账号：`demo@example.com` / `Demo1234!`。辅助命令：`make seed-debug`（仅灌数据）、
`make reset-debug`（清空 SQLite 与本地存储，从零开始）。前端仍按需用 `make dev-web` 或线上
GitHub Pages。完整说明见 [debug-mode.md](debug-mode.md)。

---

## 5. 质量门禁（提交前请跑通）

```bash
make lint             # 后端 ruff + 前端 eslint
make typecheck        # 后端 mypy + 前端 tsc
make test             # 后端 pytest + 前端 vitest
```

单独运行：

```bash
make lint-api     make test-api     make format
make lint-web     make test-web
```

CI（`.github/workflows/ci.yml`）会在 PR 上运行同样的门禁；CI 端使用 uv（无需 conda），
与本地从同一份 `pyproject.toml` 安装，结果一致。

---

## 6. 配置与环境变量

每个部分都有 `.env.example`，复制为 `.env` 即可：

```bash
cp services/api/.env.example services/api/.env
cp apps/web/.env.example     apps/web/.env
cp infra/.env.example        infra/.env
```

| 文件                      | 关键变量                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| `services/api/.env`       | `DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`、`AI_PROVIDER`（默认 `fake`） |
| `apps/web/.env`           | `VITE_API_BASE_URL`、`VITE_BASE_PATH`                            |
| `infra/.env`              | compose 用的 Postgres/Redis/端口/密钥                            |

> 默认 `AI_PROVIDER=fake`：系统无需任何外部 LLM Key 即可完整跑通解析、匹配、报告、改写
> 等链路（确定性假实现），便于开发与 CI。接入真实模型见部署指南。

---

## 7. 目录结构速览

```
OfferPilot/
├── apps/web/            # 前端（React + Vite + TS + Tailwind + shadcn 风格）
├── services/api/        # 后端（FastAPI 模块化单体 + Arq worker）
│   └── app/
│       ├── shared/      # 跨域内核：config/logging/errors/responses/context
│       ├── api/v1/      # HTTP 传输层（路由聚合 + 健康检查）
│       ├── modules/     # 领域纵切（auth/resume/job/match/report/...）
│       ├── ai/          # LLM/Embedding Provider、Prompt、评分、校验、编排
│       ├── workers/     # Arq 后台任务
│       └── db/          # SQLAlchemy 引擎/会话 + Alembic 迁移
├── infra/               # docker-compose、Dockerfile、pgvector 初始化
├── docs/                # 需求/设计/本指南/ADR
├── environment.yml      # conda 环境声明（后端解释器）
├── .nvmrc               # 前端 Node 版本锁定
└── Makefile             # 统一开发命令入口
```

---

## 8. 常见问题（Troubleshooting）

| 现象                                   | 处理                                                                 |
| -------------------------------------- | -------------------------------------------------------------------- |
| `conda: command not found`             | 安装 miniconda 并 `source ~/miniconda3/etc/profile.d/conda.sh`。     |
| `make dev-web` 报找不到 node/pnpm      | 先执行一次 3.3 的 nvm 安装；确认 `~/.nvm` 存在。                      |
| 端口被占用（8000/5173/5432/6379）      | 改 `.env` 中对应端口，或停掉占用进程。                               |
| Docker 构建慢                          | 首次拉取基础镜像较慢，后续有层缓存；依赖未变时不会重装。             |
| 后端导入报错 `app.xxx`                 | 确认已 `conda activate offerpilot` 且执行过 `uv pip install -e .`。  |

---

## 9. 下一步

- 部署到线上机器：见 [deployment.md](deployment.md)。
- 架构与选型决策：见 [adr/0001-architecture-and-tooling.md](adr/0001-architecture-and-tooling.md)。
- 业务实现按阶段推进（P1 数据与认证 → P2 简历/岗位/AI 基座 → …），每阶段自带测试与文档。
