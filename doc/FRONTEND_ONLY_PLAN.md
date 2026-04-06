# 纯前端架构迁移方案

## 🎯 目标
将Seedance 2.0从前后端架构迁移到纯前端应用

## 📋 当前架构问题
1. **后端复杂**: 需要运行Node.js服务器
2. **依赖重**: SQLite、Express、CORS等
3. **部署难**: 无法托管到静态页面服务
4. **版本混乱**: 有两个版本（原版+简化版）

## 🏗️ 纯前端架构设计

### 技术栈
- **前端**: React + TypeScript + Vite + Tailwind CSS
- **存储**: localStorage + IndexedDB
- **API调用**: 直接调用第三方API（处理CORS）
- **部署**: 可托管到GitHub Pages、Netlify等

### 数据存储方案

#### 1. API Key存储 (localStorage)
```typescript
// localStorage存储API配置
interface ApiConfig {
  volcengineKey: string | null;
  aihubmixKey: string | null;
  defaultProvider: 'volcengine' | 'aihubmix';
}
```

#### 2. 任务数据存储 (IndexedDB)
```typescript
// IndexedDB存储任务记录
interface TaskRecord {
  id: string;
  prompt: string;
  model: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  videoUrl?: string;
}
```

### API调用方案

#### 方案A: 直接调用（需处理CORS）
```typescript
// 直接调用火山方舟API
const response = await fetch('https://ark.cn-beijing.volces.com/api/v1/video/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});
```

#### 方案B: 使用CORS代理
```typescript
// 使用CORS代理服务
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
const response = await fetch(proxyUrl, options);
```

## 🔄 迁移步骤

### 第1步: 修复前端显示问题 ⚠️ 紧急
- [ ] 确认基础React渲染
- [ ] 检查CSS加载
- [ ] 验证路由配置

### 第2步: 创建纯前端版本
- [ ] 移除所有后端API调用
- [ ] 创建localStorage存储服务
- [ ] 创建IndexedDB任务管理
- [ ] 实现直接API调用逻辑

### 第3步: 清理后端代码
- [ ] 删除server/目录
- [ ] 更新.gitignore
- [ ] 清理package.json脚本
- [ ] 更新文档

### 第4步: 测试和部署
- [ ] 功能测试
- [ ] 部署到静态托管
- [ ] 更新使用文档

## ⚠️ 潜在挑战

### CORS问题
第三方API可能有CORS限制，解决方案：
1. 使用CORS代理服务
2. 浏览器插件开发
3. 后端BFF（Backend For Frontend）模式

### API安全性
API Key存储在浏览器不够安全，但：
- 个人工具，风险可控
- 可提示用户注意安全
- 支持加密存储

## 📝 待确认事项
1. 第三方API的CORS政策
2. 是否需要浏览器版本
3. 数据迁移策略

---

**创建时间**: 2026年4月6日 21:50
**状态**: 规划中，等待前端问题修复后开始实施