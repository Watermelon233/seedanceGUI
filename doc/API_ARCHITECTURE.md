# Seedance 2.0 技术架构文档

## 项目概述

Seedance 2.0 是一个基于React + Express + SQLite的AI视频生成应用，支持多个API供应商的视频生成服务。

## 技术栈详解

### 前端技术栈
```
React 19.0.0          - 用户界面框架
TypeScript 5.6.0      - 类型安全
Vite 6.0.0            - 构建工具
Tailwind CSS 3.4.0    - 样式框架
React Router 6.22.0   - 路由管理
```

### 后端技术栈
```
Node.js 16+           - 运行环境
Express 4.21.0        - Web服务器框架
SQLite 3              - 数据库
better-sqlite3 11.8.1 - SQLite驱动
```

### 核心依赖
```json
{
  "dependencies": {
    "node-fetch": "^2.7.0",        // HTTP请求（新增）
    "better-sqlite3": "^11.8.1",   // 数据库
    "multer": "^1.4.5-lts.1",      // 文件上传
    "nodemailer": "^8.0.4",        // 邮件服务
    "node-cron": "^3.0.3"          // 定时任务
  }
}
```

## Server 架构需求

### 为什么需要这个Server？

#### 1. **API认证和安全**
- **用户认证**: 管理用户注册、登录、权限控制
- **API Key管理**: 安全存储用户的API密钥
- **请求验证**: 验证API请求的合法性和权限

#### 2. **数据持久化**
- **用户数据**: 账户信息、积分、设置
- **项目数据**: 视频项目组织和管理
- **任务数据**: 生成任务的状态跟踪
- **文件管理**: 素材、生成视频的存储

#### 3. **业务逻辑处理**
- **任务调度**: 批量任务并发控制
- **进度跟踪**: 实时查询API任务状态
- **数据隔离**: 用户数据隔离和权限控制
- **积分系统**: 用户积分管理和扣减

#### 4. **第三方API集成**
- **供应商抽象**: 统一的API供应商接口
- **请求转换**: 前端请求到供应商API的格式转换
- **错误处理**: 统一的错误处理和重试机制
- **性能优化**: 缓存、连接池等

### Server 的核心职责

#### 1. 用户认证服务
```javascript
// server/services/authService.js
- 用户注册/登录/登出
- API Key验证和管理
- 权限控制（管理员/普通用户）
- 密码加密和验证
```

#### 2. API供应商服务
```javascript
// server/services/videoApiProvider.js (抽象接口)
// server/services/providers/volcengineProvider.js (官方API)
// server/services/providers/aihubmixProvider.js (第三方API)
- 统一的API接口规范
- 请求格式转换
- 响应格式统一
- 错误处理和重试
```

#### 3. 视频生成服务
```javascript
// server/services/videoGenerator.js
- 接收前端生成请求
- 调用供应商API
- 任务状态跟踪
- 进度回调处理
```

#### 4. 数据管理服务
```javascript
// server/services/projectService.js
// server/services/taskService.js
// server/services/batchScheduler.js
// server/services/videoDownloader.js
- 项目和任务CRUD
- 批量任务调度
- 视频下载管理
```

### 为什么不能只用前端？

#### ❌ 仅前端的限制
1. **API Key安全**: 无法安全存储API密钥
2. **数据持久化**: 无法保存用户数据和任务历史
3. **权限控制**: 无法实现用户隔离和权限管理
4. **业务逻辑**: 无法处理复杂的业务流程
5. **第三方集成**: 无法安全调用第三方API

#### ✅ Server的优势
1. **安全性**: 服务端安全存储敏感信息
2. **数据持久化**: 完整的数据管理能力
3. **业务逻辑**: 复杂业务流程的实现
4. **扩展性**: 易于扩展新功能
5. **维护性**: 代码结构清晰，易于维护

## 部署架构

### 开发环境
```
前端 (Vite Dev Server)  :5173
    ↓ 代理
后端 (Express Server)  :3001
    ↓
数据库 (SQLite)        :data/database.sqlite
    ↓
第三方API (HTTP调用)
```

### 生产环境
```
用户 → Nginx/Apache
         ↓
    Node.js + Express (单进程)
         ↓
    SQLite数据库
         ↓
    第三方API
```

## Server 性能要求

### 最低配置
- **CPU**: 1核心
- **内存**: 512MB
- **存储**: 1GB SSD
- **网络**: 标准带宽

### 推荐配置
- **CPU**: 2核心+
- **内存**: 2GB+
- **存储**: 10GB+ SSD
- **网络**: 5Mbps+

### 扩展性考虑
- **并发用户**: 支持100+并发用户
- **任务处理**: 支持50+并发视频生成任务
- **数据存储**: 支持数万级用户和任务数据

## 启动和运行

### 启动命令
```bash
# 开发环境（同时启动前后端）
npm run dev

# 仅启动前端
npm run dev:client

# 仅启动后端
npm run dev:server

# 生产环境
npm start
```

### 环境要求
- Node.js 16+ 
- npm 或 yarn
- SQLite 3
- 现代浏览器（Chrome/Firefox/Edge）

## 总结

这个Server是项目的**核心业务层**，负责：
1. **用户管理和认证**
2. **API供应商集成**
3. **数据持久化和业务逻辑**
4. **安全和权限控制**

没有这个Server，应用只能是一个简单的API调用工具，无法成为一个完整的业务系统。