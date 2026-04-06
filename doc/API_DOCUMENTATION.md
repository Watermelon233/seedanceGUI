# Seedance 2.0 API 文档与UI绑定关系

## 目录
1. [API概述](#api概述)
2. [认证机制](#认证机制)
3. [API端点详解](#api端点详解)
4. [前端UI组件绑定](#前端ui组件绑定)
5. [数据流和状态管理](#数据流和状态管理)
6. [维护指南](#维护指南)

---

## API概述

### 基础信息
- **Base URL**: `http://localhost:3001/api` (开发环境)
- **认证方式**: API Key (`X-API-Key` 请求头)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 响应格式规范
```typescript
// 成功响应
{
  "success": true,
  "data": { /* 业务数据 */ },
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": "错误信息",
  "message": "详细描述"
}
```

---

## 认证机制

### API Key 认证
所有需要认证的API都使用 `X-API-Key` 请求头：

```http
GET /api/protected-resource
HTTP/1.1
Host: localhost:3001
X-API-Key: sk_your_api_key_here
```

### 获取API Key
1. 用户注册/登录后获得基础账户
2. 在设置页面配置API Key
3. API Key存储在服务端数据库中
4. 前端通过localStorage保存当前使用的API Key

### 认证流程图
```
用户注册/登录
    ↓
配置API Key（设置页面）
    ↓
保存到数据库
    ↓
前端存储API Key到localStorage
    ↓
后续请求自动携带 X-API-Key
    ↓
后端验证并处理请求
```

---

## API端点详解

### 1. 用户认证相关

#### 1.1 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "emailCode": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "apiKey": null,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user",
      "status": "active",
      "credits": 10,
      "apiProvider": "volcengine"
    }
  }
}
```

**UI绑定**: `src/pages/RegisterPage.tsx` → 注册按钮点击

#### 1.2 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**: 同注册响应

**UI绑定**: `src/pages/LoginPage.tsx` → 登录按钮点击

#### 1.3 获取当前用户信息
```http
GET /api/auth/me
X-API-Key: sk_user_api_key
```

**UI绑定**: `src/App.tsx` → 应用初始化时调用

### 2. API Key 管理

#### 2.1 保存API Key
```http
POST /api/user/api-key
X-API-Key: sk_current_api_key
Content-Type: application/json

{
  "provider": "volcengine",
  "apiKey": "sk_new_api_key",
  "keyName": "我的API密钥"
}
```

**UI绑定**: `src/pages/Settings.tsx` → 保存API Key按钮

#### 2.2 获取API Key配置
```http
GET /api/user/api-keys
X-API-Key: sk_current_api_key
```

**响应**:
```json
{
  "success": true,
  "data": {
    "defaultProvider": "volcengine",
    "volcengine": {
      "hasKey": true,
      "keyName": "火山方舟API密钥"
    },
    "aihubmix": {
      "hasKey": false,
      "keyName": null
    }
  }
}
```

**UI绑定**: `src/pages/Settings.tsx` → 页面加载时调用

#### 2.3 设置默认供应商
```http
POST /api/user/default-provider
X-API-Key: sk_current_api_key
Content-Type: application/json

{
  "provider": "volcengine"
}
```

**UI绑定**: `src/pages/Settings.tsx` → 切换默认供应商按钮

### 3. 视频生成相关

#### 3.1 创建视频生成任务
```http
POST /api/generate-video
X-API-Key: sk_user_api_key
Content-Type: multipart/form-data

prompt: "小猫对着镜头打哈欠"
model: "seedance-2.0-fast"
ratio: "16:9"
duration: "5"
files: [File, File]  // 图片文件
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_1_1234567890",
    "provider": "volcengine"
  }
}
```

**UI绑定**: `src/pages/SingleTaskPage.tsx` → 生成按钮点击

**数据流**:
```
用户输入 → SingleTaskPage
    ↓
generateVideo() 函数
    ↓
FormData提交到 /api/generate-video
    ↓
后端调用供应商API
    ↓
返回 taskId 给前端
```

#### 3.2 查询任务状态
```http
GET /api/task/:taskId
```

**响应**:
```json
{
  "status": "processing",
  "progress": "正在生成中...",
  "elapsed": 15
}

// 完成时:
{
  "status": "done",
  "result": {
    "data": [{
      "url": "https://video-url.mp4",
      "revised_prompt": "优化后的提示词"
    }]
  }
}
```

**UI绑定**: `src/services/videoService.ts` → 自动轮询

**轮询机制**:
```typescript
// 前端每3秒轮询一次
while (generating) {
  const result = await fetch(`/api/task/${taskId}`);
  if (result.status === 'done') break;
  await sleep(3000);
}
```

### 4. 项目管理相关

#### 4.1 获取项目列表
```http
GET /api/projects
X-API-Key: sk_user_api_key
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "我的项目",
      "description": "测试项目",
      "created_at": "2026-04-06T10:00:00Z"
    }
  ]
}
```

**UI绑定**: `src/pages/BatchManagement.tsx` → 项目下拉选择

#### 4.2 创建项目
```http
POST /api/projects
X-API-Key: sk_user_api_key
Content-Type: application/json

{
  "name": "新项目",
  "description": "项目描述"
}
```

**UI绑定**: `src/pages/BatchManagement.tsx` → 创建项目按钮

### 5. 任务管理相关

#### 5.1 获取项目任务列表
```http
GET /api/projects/:projectId/tasks
X-API-Key: sk_user_api_key
```

**UI绑定**: `src/pages/BatchManagement.tsx` → 项目选择后自动加载

#### 5.2 创建任务
```http
POST /api/projects/:projectId/tasks
X-API-Key: sk_user_api_key
Content-Type: application/json

{
  "prompt": "生成视频的提示词",
  "task_kind": "output"
}
```

**UI绑定**: `src/pages/BatchManagement.tsx` → 添加任务按钮

#### 5.3 批量生成
```http
POST /api/batch/generate
X-API-Key: sk_user_api_key
Content-Type: application/json

{
  "projectId": 1,
  "taskIds": [1, 2, 3],
  "concurrentCount": 3
}
```

**UI绑定**: `src/pages/BatchManagement.tsx` → 开始生成按钮

### 6. 下载管理相关

#### 6.1 获取下载任务列表
```http
GET /api/download/tasks
X-API-Key: sk_user_api_key
?status=done
&page=1
&pageSize=20
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {...}
  }
}
```

**UI绑定**: `src/pages/DownloadManagement.tsx` → 页面加载时调用

#### 6.2 下载视频
```http
POST /api/download/tasks/:id/download
X-API-Key: sk_user_api_key
```

**响应**:
```json
{
  "success": true,
  "data": {
    "path": "/path/to/video.mp4"
  }
}
```

**UI绑定**: `src/pages/DownloadManagement.tsx` → 下载按钮点击

---

## 前端UI组件绑定

### 1. 认证相关组件

#### LoginPage.tsx
**绑定的API**:
- `POST /api/auth/login` - 登录
- `POST /api/auth/email-code` - 发送验证码
- `POST /api/auth/email-status` - 检查邮箱状态

**数据流**:
```
用户输入 → 组件状态
    ↓
login() 函数
    ↓
POST /api/auth/login
    ↓
缓存用户信息到localStorage
    ↓
跳转到主页
```

#### RegisterPage.tsx
**绑定的API**:
- `POST /api/auth/register` - 注册
- `POST /api/auth/verify-email-code` - 验证邮箱验证码

### 2. 核心功能组件

#### SingleTaskPage.tsx (单任务生成)
**绑定的API**:
- `POST /api/generate-video` - 创建生成任务
- `GET /api/task/:taskId` - 查询任务状态

**状态管理**:
```typescript
const [generation, setGeneration] = useState<GenerationState>({
  status: 'idle',      // idle, generating, success, error
  progress?: string,  // "正在提交...", "已提交，等待生成..."
  result?: VideoGenerationResponse,
  error?: string
});
```

**完整流程**:
```
1. 用户输入提示词、选择模型
2. 上传参考图片
3. 点击生成按钮
4. 调用 generateVideo()
5. 显示进度条
6. 轮询任务状态
7. 显示结果或错误
```

#### BatchManagement.tsx (批量管理)
**绑定的API**:
- `GET /api/projects` - 获取项目列表
- `GET /api/projects/:id/tasks` - 获取项目任务
- `POST /api/batch/generate` - 批量生成
- `GET /api/batch/:batchId/status` - 查询批量状态

**数据流**:
```
1. 选择项目 → 加载任务列表
2. 选择任务 → 准备批量生成
3. 设置参数 → 开始生成
4. 实时显示进度
5. 完成后显示结果
```

#### DownloadManagement.tsx (下载管理)
**绑定的API**:
- `GET /api/download/tasks` - 获取下载任务
- `POST /api/download/tasks/:id/download` - 下载视频
- `DELETE /api/download/tasks/:id` - 删除任务

**状态跟踪**:
```
pending → downloading → done
    ↓              ↓
待下载      下载中     已完成
```

#### Settings.tsx (设置页面)
**绑定的API**:
- `GET /api/user/api-keys` - 获取API配置
- `POST /api/user/api-key` - 保存API Key
- `POST /api/user/default-provider` - 设置默认供应商
- `POST /api/generate-video` - 测试连接（内部）

**API供应商切换**:
```typescript
const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('volcengine');

// 供应商切换逻辑
const handleSwitchProvider = async (provider: ApiProvider) => {
  await setDefaultProvider(provider);
  setSelectedProvider(provider);
  // 更新UI显示
};
```

---

## 数据流和状态管理

### AppContext 全局状态

```typescript
interface AppState {
  projects: Project[];           // 用户项目列表
  currentProject: Project | null;   // 当前项目
  tasks: Task[];                  // 任务列表
  currentTask: Task | null;         // 当前任务
  settings: Settings;              // 全局设置
  loading: boolean;                // 加载状态
  error: string | null;             // 错误信息
}
```

### 状态更新机制

#### 项目选择更新
```typescript
// 用户选择项目
<select onChange={handleProjectChange}>
  {projects.map(project => (
    <option value={project.id}>{project.name}</option>
  ))}
</select>

// 触发状态更新
const handleProjectChange = async (projectId: number) => {
  const tasks = await getProjectTasks(projectId);
  dispatch({ 
    type: 'SET_CURRENT_PROJECT', 
    payload: project 
  });
  dispatch({ 
    type: 'SET_TASKS', 
    payload: tasks 
  });
};
```

#### 任务生成进度更新
```typescript
// 轮询任务状态
const pollTask = async (taskId: string) => {
  while (true) {
    const result = await getTaskStatus(taskId);
    
    if (result.status === 'done') {
      setGeneration({ 
        status: 'success', 
        result: result.data 
      });
      break;
    }
    
    if (result.status === 'error') {
      setGeneration({ 
        status: 'error', 
        error: result.error 
      });
      break;
    }
    
    // 更新进度
    if (result.progress) {
      setGeneration({ 
        status: 'generating',
        progress: result.progress 
      });
    }
    
    await sleep(3000);
  }
};
```

---

## 完整的API端点列表

### 认证相关
```
POST   /api/auth/register          # 用户注册
POST   /api/auth/login             # 用户登录
POST   /api/auth/logout            # 用户登出
GET    /api/auth/me                # 获取当前用户
PUT    /api/auth/password          # 修改密码
POST   /api/auth/email-code        # 发送邮箱验证码
POST   /api/auth/email-status      # 检查邮箱状态
POST   /api/auth/verify-email-code # 验证邮箱验证码
```

### API Key管理
```
GET    /api/user/api-keys          # 获取API Key配置
POST   /api/user/api-key           # 保存API Key
POST   /api/user/default-provider  # 设置默认供应商
```

### 项目管理
```
GET    /api/projects               # 获取项目列表
POST   /api/projects               # 创建项目
GET    /api/projects/:id           # 获取项目详情
PUT    /api/projects/:id           # 更新项目
DELETE /api/projects/:id           # 删除项目
GET    /api/projects/:id/tasks     # 获取项目任务
```

### 任务管理
```
GET    /api/tasks/:id              # 获取任务详情
POST   /api/projects/:projectId/tasks  # 创建任务
PUT    /api/tasks/:id              # 更新任务
DELETE /api/tasks/:id              # 删除任务
POST   /api/tasks/:id/assets       # 添加任务素材
GET    /api/tasks/:id/assets       # 获取任务素材
DELETE /api/tasks/assets/:assetId # 删除任务素材
POST   /api/tasks/:id/generate    # 单个任务生成
POST   /api/tasks/:id/cancel       # 取消任务
POST   /api/tasks/:id/collect     # 二次采集视频
```

### 批量管理
```
POST   /api/batch/generate         # 创建并启动批量任务
GET    /api/batch/:batchId/status   # 获取批量任务状态
POST   /api/batch/:batchId/pause    # 暂停批量任务
POST   /api/batch/:batchId/resume   # 恢复批量任务
POST   /api/batch/:batchId/cancel   # 取消批量任务
POST   /api/batch/:batchId/collect  # 批量二次采集
```

### 下载管理
```
GET    /api/download/tasks        # 获取下载任务列表
POST   /api/download/batch        # 批量下载视频
POST   /api/download/tasks/:id/download # 下载单个任务视频
POST   /api/download/tasks/:id/file-token # 创建下载token
GET    /api/download/file-by-token  # 通过token下载文件
POST   /api/download/refresh      # 刷新下载任务列表
POST   /api/download/sync-from-jimeng # 从即梦平台同步
POST   /api/download/tasks/:id/open # 打开视频文件夹
DELETE /api/download/tasks/:id     # 删除任务
```

### 视频生成
```
POST   /api/generate-video         # 提交视频生成任务
GET    /api/task/:taskId           # 查询任务状态（轮询）
GET    /api/video-proxy            # 视频代理播放
```

### 积分系统
```
POST   /api/credits/deduct         # 扣减积分
POST   /api/credits/add            # 充值积分
POST   /api/credits/checkin        # 每日签到
GET    /api/credits/checkin/status # 获取签到状态
```

### 管理员功能
```
GET    /api/admin/stats            # 获取系统统计
GET    /api/admin/users            # 获取用户列表
GET    /api/admin/users/:id        # 获取用户详情
PUT    /api/admin/users/:id/status # 更新用户状态
PUT    /api/admin/users/:id/credits # 修改用户积分
PUT    /api/admin/users/:id/password # 重置密码
GET    /api/admin/config           # 获取系统配置
POST   /api/admin/config           # 保存系统配置
```

---

## 维护指南

### 1. API端点维护

#### 添加新API端点
1. 在 `server/index.js` 中添加路由
2. 实现对应的业务逻辑
3. 更新此文档记录端点
4. 在前端service中添加调用函数

#### 示例：添加新的用户设置API
```javascript
// server/index.js
app.post('/api/user/theme', authenticate, (req, res) => {
  const { theme } = req.body;
  // 业务逻辑...
});

// src/services/userService.ts
export async function updateUserTheme(theme: string) {
  const response = await fetch('/api/user/theme', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ theme })
  });
  // ...
}
```

### 2. 前端组件维护

#### 修改组件API调用
1. 确认组件使用的API端点
2. 检查数据格式是否匹配
3. 更新状态管理逻辑
4. 测试用户交互流程

#### 示例：修改视频生成流程
```typescript
// 确认API调用正确
const response = await fetch('/api/generate-video', {
  method: 'POST',
  headers: getAuthHeaders(),  // 确保认证头正确
  body: formData
});

// 更新状态管理
setGeneration({ status: 'generating' });
```

### 3. 数据库维护

#### Schema变更流程
1. 创建新的迁移文件：`server/database/migrations/YYYYMMDD_description.sql`
2. 编写迁移SQL（CREATE TABLE, ALTER TABLE等）
3. 测试迁移脚本
4. 更新 `server/database/schema.sql`
5. 更新类型定义：`src/types/index.ts`

### 4. 错误处理

#### 统一错误处理模式
```typescript
try {
  const result = await apiCall();
  if (!result.success) {
    throw new Error(result.error);
  }
  // 处理成功结果
} catch (error) {
  // 统一错误提示
  alert(`操作失败: ${error.message}`);
}
```

#### API错误码规范
- `400` - 请求参数错误
- `401` - 未认证或API Key无效
- `403` - 权限不足
- `404` - 资源不存在
- `500` - 服务器内部错误

### 5. 性能优化

#### API调用优化
```typescript
// 防抖处理
const debouncedSearch = debounce(performSearch, 500);

// 节流处理
const throttledUpdate = throttle(updateStatus, 1000);

// 缓存策略
const cachedData = useMemo(() => expensiveCalculation(data), [data]);
```

#### 批量操作优化
```typescript
// 并发控制
const MAX_CONCURRENT = 5;
const queue = [];
let active = 0;

function processQueue() {
  while (queue.length > 0 && active < MAX_CONCURRENT) {
    const task = queue.shift();
    active++;
    task.finally(() => active--);
  }
}
```

### 6. 测试指南

#### API测试
```bash
# 使用curl测试API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 测试API Key认证
curl -X GET http://localhost:3001/api/auth/me \
  -H "X-API-Key: sk_test_api_key"
```

#### 前端组件测试
```typescript
// 测试API调用
describe('Video Generation API', () => {
  it('should create task successfully', async () => {
    const result = await generateVideo({
      prompt: 'test',
      model: 'seedance-2.0-fast',
      ratio: '16:9',
      duration: 5,
      files: []
    });
    expect(result.data).toBeDefined();
  });
});
```

---

## 快速参考

### API调用示例

#### 用户认证
```typescript
// 登录
const user = await login({
  email: 'user@example.com',
  password: 'password123'
});

// 获取当前用户
const currentUser = await getCurrentUser();

// 登出
await logout();
```

#### 视频生成
```typescript
// 生成视频
const result = await generateVideo(
  {
    prompt: '小猫打哈欠',
    model: 'seedance-2.0-fast',
    ratio: '16:9',
    duration: 5,
    files: [imageFile1, imageFile2]
  },
  (progress) => {
    console.log('进度:', progress);
  }
);
```

#### 项目管理
```typescript
// 获取项目列表
const projects = await getProjects();

// 创建项目
const newProject = await createProject({
  name: '我的项目',
  description: '项目描述'
});

// 获取项目任务
const tasks = await getProjectTasks(projectId);
```

### 常见问题解决

#### Q: API调用返回401错误
**A**: 检查localStorage中的API Key是否有效，或在设置页面重新配置

#### Q: 视频生成一直处于"处理中"状态
**A**: 检查供应商API Key是否有效，查看浏览器控制台错误信息

#### Q: 批量任务没有启动
**A**: 确认选择的任务有prompt，至少有一张图片，task_kind为'draft'

#### Q: 下载视频失败
**A**: 检查video_url是否有效，确认下载路径权限

---

**文档版本**: v2.0
**最后更新**: 2026-04-06
**维护者**: Seedance开发团队