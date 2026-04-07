# Seedance 2.0 Web

> 基于字节跳动即梦平台 Seedance 2.0 模型的 AI 视频生成前端应用

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)

---

## 项目简介

Seedance 2.0 Web 是一个面向内容创作者的 AI 视频生成前端应用。通过简洁的 Web 界面，用户可以：

- 输入自然语言提示词生成视频（文生视频）
- 上传图片作为首帧或首尾帧参考
- 上传 1-9 张图片作为风格参考
- 上传音频或视频作为参考素材
- 实时查看生成进度
- 管理生成历史和参考素材

### 技术栈

| 技术 | 版本 | 用途 |
| :--- | :--- | :--- |
| React | 19.0.0 | 前端框架 |
| TypeScript | 5.6.0 | 类型系统 |
| Vite | 6.0.0 | 构建工具 |
| React Router | 6.22.0 | 路由管理 |
| Tailwind CSS | 3.4.0 | 样式方案 |

---

## 功能特性

### 核心功能

- **4 种视频生成模式**：
  - **文生视频**：纯文本生成视频
  - **图生视频-首帧**：1 张图片作为首帧
  - **图生视频-首尾帧**：2 张图片控制首尾
  - **图生视频-参考图**：1-9 张图片作为风格参考

- **4 种 AI 模型**：
  - Seedance 2.0（全能普通）
  - Seedance 2.0 VIP（全能 720p）
  - Seedance 2.0 Fast（快速普通）
  - Seedance 2.0 Fast VIP（快速 720p）

- **多媒体支持**：
  - **图片**：JPG、PNG、GIF、WebP、BMP 等
  - **音频**：MP3、WAV、AAC、OGG、M4A、FLAC 等
  - **视频**：MP4、MOV、AVI、MKV、WebM、FLV 等

- **多种上传方式**：
  - 本地文件上传
  - 图片 URL 输入
  - 云托管上传

- **参数配置**：
  - 画面比例（7 种预设，含自适应）
  - 视频时长（4-15 秒可选）
  - 拖拽排序媒体文件

- **任务管理**：
  - 实时进度追踪
  - 生成历史记录
  - 视频预览与下载

### 页面结构

```
/                    # 主页
/generate            # 视频生成
/tasks               # 任务列表
/config              # API 配置
/settings            # 系统设置
/images              # 参考素材管理
/test                # API 测试
```

---

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问：<http://localhost:3000>

### 生产构建

```bash
npm run build
```

构建输出在 `dist/` 目录。

---

## 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```env
# Mock API 模式（开发测试用，不需要后端）
VITE_MOCK_API=false

# 后端 API 地址（连接真实后端时使用）
# VITE_API_BASE_URL=http://localhost:8000
```

### Mock API 模式

设置 `VITE_MOCK_API=true` 可启用 Mock 模式，无需后端即可测试界面：

```bash
# Windows
set VITE_MOCK_API=true && npm run dev

# Linux/Mac
VITE_MOCK_API=true npm run dev
```

**注意**：生产构建时会自动禁用 Mock 模式。

### API Key 配置

在「API配置」页面配置 API 密钥：

- **Volcengine Key**：火山引擎 API 密钥（sk_开头）
- **Aihubmix Key**：Aihubmix API 密钥（sk_开头）
- **默认供应商**：选择使用的 API 提供商

---

## 项目结构

```
seedance-temp/
├── src/
│   ├── main.tsx                # 应用入口
│   ├── App.tsx                 # 根组件（路由配置）
│   ├── index.css               # 全局样式
│   ├── components/             # 公共组件
│   │   └── VideoPlayer.tsx     # 视频播放器
│   ├── context/                # React Context
│   ├── pages/                  # 页面组件
│   │   ├── ApiKeyPage.tsx      # API 配置页
│   │   ├── SingleTaskPage.tsx  # 视频生成页
│   │   ├── TaskListPage.tsx    # 任务列表页
│   │   ├── Settings.tsx        # 系统设置页
│   │   ├── ReferenceImagePage.tsx  # 参考图片管理
│   │   └── ApiTestPage.tsx     # API 测试页
│   ├── services/               # API 服务层
│   │   ├── apiService.ts       # API 调用封装
│   │   └── localStorageService.ts  # 本地存储
│   └── types/                  # TypeScript 类型定义
│       └── index.ts
├── doc/                       # 项目文档
├── public/                    # 静态资源
├── index.html                 # HTML 模板
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
├── tailwind.config.js         # Tailwind 配置
├── package.json               # 项目依赖
└── README.md                  # 项目说明（本文档）
```

---

## 使用指南

### 1. 配置 API

首次使用需要配置 API Key：

1. 访问「API配置」页面
2. 选择 API 提供商（Volcengine 或 Aihubmix）
3. 填写对应的 API Key（格式：sk_开头）
4. 点击「保存配置」

### 2. 生成视频

1. 访问「视频生成」页面

2. 选择生成模式：
   - **文生视频**：无需上传素材，直接输入提示词
   - **图生视频-首帧**：上传 1 张图片
   - **图生视频-首尾帧**：上传 2 张图片
   - **图生视频-参考图**：上传 1-9 张图片/音频/视频

3. 选择生成模型（推荐使用 Fast 模式快速生成）

4. 输入提示词（参考图模式可使用 `@1`、`@2` 引用素材）

5. 选择画面比例、视频时长

6. 点击「生成视频」

7. 等待生成完成，预览并下载

### 3. 管理任务

在「任务列表」页面可以：

- 查看所有生成任务
- 筛选任务状态
- 预览和下载视频
- 删除历史记录

### 4. 参考素材

在「参考素材」页面可以：

- 上传和管理图片、音频、视频素材
- 查看素材详情
- 复制素材 URL

---

## API 接口

本项目需要配合后端 API 使用。主要接口：

### 视频生成

```
POST /api/generate-video
Content-Type: multipart/form-data

{
  prompt: string
  model: string
  ratio: string
  duration: number
  reference_mode: string
  files: File[]
}

Response: {
  taskId: string
}
```

### 任务查询

```
GET /api/task/:taskId

Response: {
  status: 'pending' | 'generating' | 'done' | 'error'
  progress?: string
  result?: {
    url: string
    revised_prompt: string
  }
  error?: string
}
```

完整 API 文档请查看：[API_DOCUMENTATION.md](doc/API_DOCUMENTATION.md)

---

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 在 `src/App.tsx` 添加路由
3. 在导航菜单添加链接

### 类型定义

所有类型定义在 `src/types/index.ts`，添加新类型时请更新此文件。

### 样式规范

项目使用 Tailwind CSS，遵循以下规范：

- 优先使用 Tailwind 工具类
- 复杂组件使用内联样式
- 保持与现有设计风格一致

---

## 文档导航

### 用户文档

- [README.md](README.md) - 项目说明（本文档）

### 开发文档

- [开发快速参考](doc/开发快速参考.md) - 开发者索引
- [系统架构图](doc/系统架构图.md) - 架构可视化
- [CLAUDE.md](CLAUDE.md) - AI 开发指引

### 设计文档

- [概要设计](doc/概要设计.md) - 高层设计
- [详细设计](doc/详细设计.md) - 详细设计
- [数据字典](doc/数据字典.md) - 数据模型

### API 文档

- [API 文档](doc/API_DOCUMENTATION.md) - 接口文档
- [API 架构](doc/API_ARCHITECTURE.md) - 技术架构
- [API-UI 绑定](doc/API_UI_BINDING.md) - 组件绑定

### 运维文档

- [部署运维指南](doc/部署运维指南.md) - 部署与运维

### 产品文档

- [产品需求文档](doc/PRD.md) - PRD

---

## 常见问题

### Q: 如何启用 Mock 模式？

A: 设置环境变量 `VITE_MOCK_API=true` 后启动开发服务器。

### Q: 生产构建失败怎么办？

A: 确保没有在 `.env` 中设置 `VITE_MOCK_API=true`，生产环境不支持 Mock 模式。

### Q: 如何修改端口？

A: 编辑 `vite.config.ts`，修改 `server.port` 配置。

### Q: 视频生成失败怎么办？

A: 检查 API Key 是否有效（格式为 sk_开头），确认 API 提供商账号有足够额度。

---


---

## License

MIT License

---

**最后更新**: 2026-04-07
