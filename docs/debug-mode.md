# 轻量级 Debug 模式（SQLite，免 Docker）

> 面向**概念验证 / 快速交付**：不依赖 Postgres、Redis、Docker，`make debug` 一条命令即可
> 起一个可用的后端（自动建表 + 演示数据）。**不用于生产**——海量并发、向量检索性能、
> 多进程后台任务等仍应走 Postgres 部署（见 [deployment.md](deployment.md)）。

---

## 1. 为什么能这么简单

经核查，后端本来就高度数据库无关，Debug 模式只是把这些既有能力「打包成一键」：

- 数据访问层（`app/db/session.py`）早已内建 SQLite 支持（`StaticPool`、`check_same_thread`、
  `PRAGMA foreign_keys=ON`），测试套件本身就跑在 SQLite 上。
- `JSONB` 字段在 `app/db/types.py` 已用 `.with_variant()` 在非 Postgres 上自动降级为 `JSON`；
  UUID 主键与时间戳由应用层生成，与具体数据库无关。
- 向量相似度在 **Python** 中计算（`app/ai/embedding.py`、`app/ai/scoring/engine.py`），
  **不依赖 pgvector**，因此 SQLite 完全够用。
- `AI_PROVIDER=fake` 是确定性的离线实现，解析 / 匹配 / 报告 / 改写全链路无需任何外部 Key。
- 后台任务（Arq/Redis）当前**不在请求主链路上**，简历 / JD 解析在请求内同步完成，
  所以 Debug 模式无需启动 worker 或 Redis。

---

## 2. 快速开始

```bash
make setup-api     # 一次性：在现有 offerpilot conda 环境内安装后端依赖
make debug         # 起后端（自动建表 + 演示数据）→ http://localhost:8000/docs
```

辅助命令：

| 命令              | 作用                                                         |
| ----------------- | ------------------------------------------------------------ |
| `make debug`      | 灌入演示数据后，热重载启动 API（`:8000`）                    |
| `make seed-debug` | 只灌演示数据（幂等，已存在则跳过），不启动服务               |
| `make reset-debug`| 删除 SQLite 文件与本地存储 `storage_data/`，恢复到空白状态   |

> 这些命令都通过 `conda run -n offerpilot` 执行，沿用你现有的 conda 环境，无需额外安装。

### 演示账号

| 字段 | 值 |
| ---- | -- |
| 邮箱 | `demo@example.com` |
| 密码 | `Demo1234!` |

登录后即可看到：一份中文样例简历、一份求职偏好（数据分析 / 上海）、三个样例岗位，
可直接体验岗位发现与分层推荐。

### 前端

前端部署在 GitHub Pages，本模式**不涉及前端改动**。本地联调时，照常 `make dev-web`
（Vite，`:5173`）即可，其 `VITE_API_BASE_URL` 默认指向 `http://localhost:8000/api/v1`。

---

## 3. 本次为支持 Debug 模式所做的修改

| 文件 | 改动 | 说明 |
| ---- | ---- | ---- |
| `services/api/app/shared/config.py` | 新增设置 `auto_create_db: bool = False` | 开关：是否在启动时按 ORM 元数据建表（替代 Alembic）。默认关，Postgres/生产不受影响。 |
| `services/api/app/main.py` | `lifespan` 启动钩子在 `auto_create_db` 为真时 `Base.metadata.create_all` | 让 SQLite 模式零迁移、零手动步骤即可建好全部表；`create_all` 幂等。 |
| `services/api/pyproject.toml` | 将 `aiosqlite` 从 `[dev]` 提升为运行时依赖 | SQLite 异步驱动，运行 Debug 模式必需。 |
| `services/api/app/scripts/seed_demo.py`（新增） | 幂等的演示数据脚本 | 经进程内 ASGI 调用公共 API 注册演示用户、上传样例简历、设置偏好、创建样例岗位。 |
| `services/api/app/scripts/__init__.py`（新增） | 脚本包标记 | 支持 `python -m app.scripts.seed_demo`。 |
| `services/api/.env.debug`（新增） | Debug 模式环境变量模板 | 也可 `cp .env.debug .env` 后手动 `uvicorn`。 |
| `Makefile` | 新增 `debug` / `seed-debug` / `reset-debug` 目标 | 一键启动 / 灌数据 / 重置。 |
| `.gitignore` | 忽略 `offerpilot_debug.db*`，放行 `.env.debug` | 不提交本地数据库，保留模板入库。 |
| `docs/development.md` | 新增「方式 C」小节 | 指向本文。 |

> 注：`Numeric(4,3)` / `Numeric(10,6)`、`JSONB` 等并非阻塞项——测试早已在 SQLite 上覆盖，
> 故**未改动任何数据模型**。

---

## 4. 工作原理

`make debug` 通过内联环境变量启动（不会改动你的 `.env`，也不会连任何 Postgres）：

```
DATABASE_URL=sqlite+aiosqlite:///./offerpilot_debug.db   # services/api/ 下的单文件
AUTO_CREATE_DB=true                                       # 启动时按 ORM 建表
AI_PROVIDER=fake                                          # 离线确定性 AI
ENVIRONMENT=local
LOG_JSON=false                                            # 人类可读日志
```

启动顺序：`python -m app.scripts.seed_demo`（建表 + 幂等灌数据）→ `uvicorn app.main:app --reload`。
数据持久化在 `services/api/offerpilot_debug.db`，重启后数据仍在；`make reset-debug` 可清空。

---

## 5. 局限与何时切回 Postgres

| 维度 | Debug（SQLite） | 生产（Postgres） |
| ---- | --------------- | ---------------- |
| 并发 | 单文件、写串行，适合演示 / 单人 | 高并发读写 |
| 向量检索 | Python 计算，数据量大时变慢 | pgvector 索引加速 |
| 后台任务 | 同步内联，无 Arq worker | Redis + Arq 异步 |
| 迁移 | `create_all` 直接建表，无版本管理 | Alembic 版本化迁移 |
| 部署 | 一条命令，免 Docker | Docker Compose 全栈 |

需要上述任一生产能力时，按 [deployment.md](deployment.md) 切回 Postgres：不设
`AUTO_CREATE_DB`、把 `DATABASE_URL` 指向 Postgres、`make migrate` 执行迁移即可。代码无需改动。

---

## 6. 常见问题

| 现象 | 处理 |
| ---- | ---- |
| 想换演示数据 / 账号 | 编辑 `services/api/app/scripts/seed_demo.py` 顶部常量后 `make reset-debug && make seed-debug`。 |
| 端口 8000 被占用 | 停掉占用进程，或自行 `cp .env.debug .env` 改 `PORT` 后手动 `uvicorn`。 |
| 想要纯净环境重来 | `make reset-debug` 删除 SQLite 与本地存储。 |
| 接真实大模型 | 在环境变量中设 `AI_PROVIDER=openai_compatible` 及 `AI_API_BASE` / `AI_API_KEY`（见部署指南）。 |
