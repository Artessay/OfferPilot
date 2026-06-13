# OfferPilot 文档目录

本目录保存「Offer 捕手」学生求职匹配智能体的需求与设计文档。

## 文档索引

| 文档 | 说明 |
| --- | --- |
| [task.md](task.md) | 原始任务说明，定义产品背景、目标和交付形式 |
| [01-requirements-analysis.md](01-requirements-analysis.md) | 需求分析报告，覆盖业务模型、系统概念模型、目标用户、功能与非功能需求 |
| [02-system-architecture-design.md](02-system-architecture-design.md) | 系统概要设计说明书，覆盖总体架构、技术方案、模块划分与外部接口 |
| [03-detailed-design.md](03-detailed-design.md) | 系统详细设计说明书，覆盖页面流程、数据模型、算法、Prompt、异常与测试设计 |

## 第一阶段设计口径

第一阶段以网页端 MVP 为目标：前端静态资源可部署到 GitHub Pages，后端 API、AI 编排、数据库、文件解析和对象存储由独立服务承担。岗位数据优先支持用户粘贴/导入 JD 与后台岗位库维护，第三方招聘 API、网页采集、微信小程序和手机 App 作为后续扩展。
