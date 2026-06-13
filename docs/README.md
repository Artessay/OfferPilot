# OfferPilot 文档目录

本目录保存「Offer 捕手」学生求职匹配智能体的需求与设计文档。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [task.md](task.md) | 原始任务说明，定义产品背景、目标和交付形式 |
| [01-requirements-analysis.md](01-requirements-analysis.md) | 需求分析报告，覆盖业务模型、系统概念模型、目标用户、功能与非功能需求 |
| [02-system-architecture-design.md](02-system-architecture-design.md) | 系统概要设计说明书，覆盖总体架构、技术方案、模块划分与外部接口 |
| [03-detailed-design.md](03-detailed-design.md) | 系统详细设计说明书，覆盖页面流程、数据模型、算法、Prompt、异常与测试设计 |
| [04-ai-native-interaction-ui-design.md](04-ai-native-interaction-ui-design.md) | AI 原生用户交互与界面设计方案，覆盖用户旅程、核心页面、AI 交互组件、视觉风格和体验验收标准 |
| [development.md](development.md) | 开发环境构建指南，覆盖 conda/nvm/docker 隔离环境搭建、本地运行、质量门禁 |
| [deployment.md](deployment.md) | 部署指南，覆盖后端 Docker 部署、前端 GitHub Pages 发布、生产清单与演进路径 |
| [adr/0001-architecture-and-tooling.md](adr/0001-architecture-and-tooling.md) | 架构与工具链选型决策记录（Monorepo、模块化单体、环境隔离、技术栈） |

## 第一阶段设计口径

第一阶段以网页端 MVP 为目标：前端静态资源可部署到 GitHub Pages，后端 API、AI 编排、数据库、文件解析和对象存储由独立服务承担。岗位数据优先支持用户粘贴/导入 JD 与后台岗位库维护，第三方招聘 API、网页采集、微信小程序和手机 App 作为后续扩展。
