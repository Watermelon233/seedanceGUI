# API与UI绑定关系详细说明

## 概述

本文档详细说明了Seedance 2.0项目中API端点与前端UI组件的绑定关系，包括：
- 具体的代码位置
- 数据流向
- 状态管理
- 错误处理

---

## 核心绑定关系图

```
┌─────────────────────────────────────────────────────────┐
│                    用户操作界面                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   前端Service层                          │
│  (authService.ts, projectService.ts, taskService.ts)      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   HTTP API调用                             │
│         (通过 X-API-Key 请求头认证)                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   后端Express服务                          │
│        (认证中间件 → 业务逻辑 → 供应商API)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              数据库 + 第三方API供应商                        │
└─────────────────────────────────────────────────────────┘
```

---

## 详细绑定关系

### 1. 用户认证流程

#### UI组件 → API绑定

**LoginPage.tsx**
```typescript
// 位置：src/pages/LoginPage.tsx:32
const handleLogin = async () => {
  try {
    const result = await login(formData);
    // 登录成功后跳转
    navigate('/');
  } catch (error) {
    // 显示错误信息
  }
};
```

**API调用**
```typescript
// 位置：src/services/authService.ts:94
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '登录失败');
  }

  if (data.data) {
    cacheUser(data.data.user);
  }

  return data.data;
}
```

**API端点**
```javascript
// 位置：server/index.js
app.post('/api/auth/login', async (req, res) => {
  // 业务逻辑...
});
```

#### 数据流详细说明

```
用户输入 (email, password)
    ↓
[组件状态] formData = { email, password }
    ↓
[Service层] login(formData)
    ↓
[HTTP] POST /api/auth/login
    ↓
[后端处理] authService.loginUser()
    ↓
[数据库] 查询用户信息
    ↓
[响应] { apiKey, user }
    ↓
[前端] cacheUser(user) → localStorage
    ↓
[路由] navigate('/')
```

### 2. API Key配置流程

#### UI组件 → API绑定

**Settings.tsx**
```typescript
// 位置：src/pages/Settings.tsx:89
const handleSaveApiKey = async () => {
  const apiKey = apiKeys[selectedProvider];

  // 验证格式
  if (!authService.validateApiKeyFormat(apiKey.trim())) {
    alert('API Key格式无效');
    return;
  }

  // 调用API保存
  await authService.saveApiKey(
    selectedProvider,
    apiKey.trim(),
    keyNames[selectedProvider]
  );

  alert('API Key保存成功');
};
```

**API调用**
```typescript
// 位置：src/services/authService.ts:189
export async function saveApiKey(
  provider: ApiProvider,
  apiKey: string,
  keyName: string = '默认API密钥'
): Promise<void> {
  const currentApiKey = getApiKey();

  if (!currentApiKey) {
    throw new Error('请先登录');
  }

  const response = await fetch(`${API_BASE}/user/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': currentApiKey,
    },
    body: JSON.stringify({ provider, apiKey, keyName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '保存API Key失败');
  }

  // 更新本地存储
  if (provider === getApiProvider()) {
    setApiKey(apiKey);
  }
}
```

**数据库存储**
```javascript
// 位置：server/database/schema.sql (新增字段)
ALTER TABLE users ADD COLUMN volcengine_api_key TEXT;
ALTER TABLE users ADD COLUMN aihubmix_api_key TEXT;
ALTER TABLE users ADD COLUMN api_key_name TEXT DEFAULT '默认API密钥';
```

#### 配置流程图
```
设置页面选择供应商
    ↓
用户输入API Key
    ↓
点击"保存API Key"
    ↓
[前端验证] validateApiKeyFormat(apiKey)
    ↓
[API调用] POST /api/user/api-key
    ↓
[后端处理] authService.saveUserApiKey()
    ↓
[数据库] UPDATE users SET volcengine_api_key = ?
    ↓
[响应] { success: true }
    ↓
[前端] 更新localStorage
    ↓
显示成功提示
```

### 3. 视频生成核心流程

#### UI组件 → API绑定

**SingleTaskPage.tsx**
```typescript
// 位置：src/pages/SingleTaskPage.tsx:69
const handleGenerate = useCallback(async () => {
  if (!prompt.trim() && images.length === 0) return;
  if (generation.status === 'generating') return;

  setGeneration({
    status: 'generating',
    progress: '正在提交视频生成请求...',
  });

  try {
    const result = await generateVideo(
      {
        prompt,
        model,
        ratio,
        duration,
        files: images.map((img) => img.file),
      },
      (progress) => {
        setGeneration((prev) => ({ ...prev, progress }));
      }
    );

    if (result.data && result.data.length > 0 && result.data[0].url) {
      setGeneration({ status: 'success', result });
    } else {
      setGeneration({
        status: 'error',
        error: '未获取到视频结果'
      });
    }
  } catch (error) {
    setGeneration({
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}, [prompt, images, model, ratio, duration, generation.status]);
```

**Service层处理**
```typescript
// 位置：src/services/videoService.ts:4
export async function generateVideo(
  request: GenerateVideoRequest,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  const formData = new FormData();
  formData.append('prompt', request.prompt);
  formData.append('model', request.model);
  formData.append('ratio', request.ratio);
  formData.append('duration', String(request.duration));

  for (const file of request.files) {
    formData.append('files', file);
  }

  // 提交任务
  onProgress?.('正在提交视频生成请求...');
  const submitRes = await fetch('/api/generate-video', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok) {
    throw new Error(submitData.error || `提交失败 (HTTP ${submitRes.status})`);
  }

  const { taskId } = submitData.data;
  if (!taskId) {
    throw new Error('服务器未返回任务ID');
  }

  // 轮询任务状态
  onProgress?.('已提交，等待AI生成视频...');

  const maxPollTime = 25 * 60 * 1000; // 25分钟
  const pollInterval = 3000; // 3秒
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollRes = await fetch(`/api/task/${taskId}`);
    const pollData = await pollRes.json();

    if (pollData.status === 'done') {
      const result = pollData.result;
      if (result?.data?.[0]?.url) {
        return result;
      }
      throw new Error('未获取到视频结果');
    }

    if (pollData.status === 'error') {
      throw new Error(pollData.error || '视频生成失败');
    }

    if (pollData.progress) {
      onProgress?.(pollData.progress);
    }
  }

  throw new Error('视频生成超时，请稍后重试');
}
```

**后端处理**
```javascript
// 位置：server/index.js
app.post('/api/generate-video', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const { prompt, model, ratio, duration } = req.body;
    const files = req.files;
    const userId = req.user.id;

    // 获取用户配置的供应商
    const provider = providerFactory.getProvider(req.user.api_provider || 'volcengine');
    const apiKey = await getUserApiKeyForProvider(userId, provider.getName());

    // 转换文件为Base64
    const filesWithDataUrls = await Promise.all(
      files.map(async (file) => ({
        dataUrl: await fileToBase64(file),
        name: file.originalname,
        type: file.mimetype
      }))
    );

    // 构建标准请求格式
    const standardRequest = {
      prompt,
      model,
      ratio,
      duration,
      files: filesWithDataUrls,
      referenceMode: '全能参考'
    };

    // 转换为供应商格式
    const transformedRequest = provider.transformRequest(standardRequest);

    // 创建任务
    const createResult = await provider.createTask(apiKey, transformedRequest);

    if (!createResult.success) {
      throw new Error(createResult.error);
    }

    res.json({
      success: true,
      data: {
        taskId: createResult.taskId,
        provider: provider.getName()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

#### 完整生成流程
```
[用户操作] 点击生成按钮
    ↓
[前端验证] 检查输入有效性
    ↓
[状态更新] setGeneration({ status: 'generating' })
    ↓
[Service调用] generateVideo()
    ↓
[FormData构建] 将用户输入转换为FormData
    ↓
[HTTP请求] POST /api/generate-video
    ↓
[认证中间件] 验证 X-API-Key
    ↓
[供应商抽象] providerFactory.getProvider()
    ↓
[API调用] provider.createTask(apiKey, request)
    ↓
[第三方API] 火山方舟/Aihubmix API
    ↓
[返回结果] { taskId, provider }
    ↓
[前端接收] 保存taskId
    ↓
[轮询开始] 每3秒查询一次状态
    ↓
[HTTP请求] GET /api/task/:taskId
    ↓
[状态检查] status === 'done'?
    ↓
    [结果处理] 提取video_url
    ↓
[状态更新] setGeneration({ status: 'success', result })
    ↓
[视频显示] VideoPlayer组件播放
```

### 4. 项目和批量管理

#### UI组件 → API绑定

**BatchManagement.tsx**
```typescript
// 获取项目列表
const projects = await getProjects();

// 选择项目
const handleProjectChange = async (projectId: number) => {
  setCurrentProject(projectId);
  const tasks = await getProjectTasks(projectId);
  setTasks(tasks);
};

// 开始批量生成
const handleStartBatch = async () => {
  const result = await startBatchGenerate(
    currentProject.id,
    selectedTaskIds,
    { concurrentCount: 3 }
  );
};
```

**API端点映射**
```typescript
// 项目管理
GET    /api/projects           → getProjects()
POST   /api/projects           → createProject()
GET    /api/projects/:id       → getProjectById()
PUT    /api/projects/:id       → updateProject()
DELETE /api/projects/:id       → deleteProject()

// 任务管理
GET    /api/projects/:id/tasks → getProjectTasks()
POST   /api/projects/:projectId/tasks → createTask()

// 批量管理
POST   /api/batch/generate     → startBatchGenerate()
GET    /api/batch/:batchId/status → getBatchStatus()
POST   /api/batch/:batchId/pause   → pauseBatch()
POST   /api/batch/:batchId/resume   → resumeBatch()
```

#### 批量生成状态跟踪
```typescript
// 批量状态枚举
type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 状态更新逻辑
const updateBatchStatus = async (batchId: string) => {
  const status = await getBatchStatus(batchId);

  setCurrentBatch({
    ...currentBatch,
    status: status.status,
    completedCount: status.completed_count,
    failedCount: status.failed_count
  });

  // 更新任务状态
  for (const task of status.tasks) {
    updateTaskStatus(task);
  }
};
```

---

## 状态管理详解

### AppContext 全局状态

```typescript
// 位置：src/context/AppContext.tsx
interface AppState {
  // 用户状态
  currentUser: User | null;

  // 项目状态
  projects: Project[];
  currentProject: Project | null;

  // 任务状态
  tasks: Task[];
  currentTask: Task | null;

  // 设置状态
  settings: Settings;

  // 系统状态
  loading: boolean;
  error: string | null;
}

// 状态更新函数
const updateSettingsAction = (newSettings: Partial<Settings>) => {
  dispatch({ type: 'SET_SETTINGS', payload: newSettings });
};
```

### 数据更新流程

#### 项目切换数据流
```
用户选择项目
    ↓
[UI事件] onChange={handleProjectChange}
    ↓
[Service调用] getProjectTasks(projectId)
    ↓
[HTTP请求] GET /api/projects/:projectId/tasks
    ↓
[后端处理] taskService.getProjectTasks()
    ↓
[数据库] SELECT * FROM tasks WHERE project_id = ?
    ↓
[响应] 返回任务列表
    ↓
[状态更新] dispatch({ type: 'SET_TASKS', payload: tasks })
    ↓
[UI更新] 任务列表自动刷新
```

#### 批量生成进度跟踪
```
点击"开始生成"按钮
    ↓
[API调用] POST /api/batch/generate
    ↓
[后端处理] 创建批量任务记录
    ↓
[轮询开始] 定期查询批量状态
    ↓
[状态更新] GET /api/batch/:batchId/status
    ↓
[数据处理] 计算完成进度
    ↓
[UI更新] 进度条实时更新
    ↓
[状态同步] 更新单个任务状态
    ↓
[完成检测] 全部完成后显示结果
```

---

## 错误处理机制

### 前端错误处理

#### 统一错误处理模式
```typescript
// 位置：多个Service文件
const handleApiCall = async (apiFunction: () => Promise<any>) => {
  try {
    const response = await apiFunction();
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    if (!data.success) {
      throw new Error(data.error || '操作失败');
    }

    return data.data;
  } catch (error) {
    // 统一错误提示
    const errorMessage = error instanceof Error
      ? error.message
      : '操作失败，请稍后重试';

    alert(errorMessage);
    throw error;
  }
};
```

#### API调用错误处理
```typescript
// 视频生成错误处理
try {
  const result = await generateVideo(request, onProgress);
} catch (error) {
  if (error.message.includes('API Key')) {
    setGeneration({
      status: 'error',
      error: '请先在设置页面配置API Key'
    });
  } else if (error.message.includes('credit')) {
    setGeneration({
      status: 'error',
      error: '积分不足，请充值或签到'
    });
  } else {
    setGeneration({
      status: 'error',
      error: error.message
    });
  }
}
```

### 后端错误处理

#### 认证中间件错误处理
```javascript
// 位置：server/index.js
const authenticate = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: '未配置API Key，请先在设置页面配置'
    });
  }

  try {
    const user = await authService.verifyApiKey(apiKey);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'API Key无效或已过期'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'API Key验证失败'
    });
  }
};
```

#### 业务逻辑错误处理
```javascript
// 视频生成错误处理
try {
  const result = await provider.createTask(apiKey, transformedRequest);

  if (!result.success) {
    // 根据错误类型返回不同HTTP状态码
    if (result.error.includes('API Key')) {
      return res.status(401).json({
        success: false,
        error: 'API Key配置错误'
      });
    } else if (result.error.includes('积分')) {
      return res.status(403).json({
        success: false,
        error: '积分不足'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  }

  res.json({ success: true, data: { taskId: result.taskId } });

} catch (error) {
  res.status(500).json({
    success: false,
    error: error.message || '视频生成失败'
  });
}
```

---

## 性能优化建议

### 1. 前端优化

#### 防抖和节流
```typescript
import { debounce, throttle } from 'lodash-es';

// 搜索输入防抖
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 500);

// 状态更新节流
const throttledUpdate = throttle((status: string) => {
  updateTaskStatus(status);
}, 1000);
```

#### 缓存策略
```typescript
// 项目列表缓存
const cachedProjects = useMemo(() => {
  return projects.map(project => ({
    ...project,
    taskCount: project.task_count || 0
  }));
}, [projects]);
```

#### 批量操作优化
```typescript
// 并发控制
const BATCH_SIZE = 5;
const MAX_CONCURRENT = 3;

async function processBatch(tasks: Task[]) {
  for (let i = 0; i < tasks.length; i += MAX_CONCURRENT) {
    const batch = tasks.slice(i, i + MAX_CONCURRENT);
    await Promise.all(
      batch.map(task => generateTask(task))
    );
  }
}
```

### 2. 后端优化

#### 数据库查询优化
```javascript
// 使用索引提升查询性能
CREATE INDEX idx_tasks_project_id_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at);

// 分页查询优化
const paginatedQuery = `
  SELECT * FROM tasks
  WHERE project_id = ? AND status = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`;
```

#### 连接池管理
```javascript
// HTTP连接复用
import fetch from 'node-fetch';
import { Agent } from 'https';

const agent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveTimeout: 60000
});

const fetchWithAgent = fetch;
fetchWithAgent(url, { agent });
```

#### 任务队列优化
```javascript
// 异步任务处理
const taskQueue = new PQueue({
  concurrency: 5,
  timeout: 5 * 60 * 1000
});

taskQueue.add(async () => {
  await processVideoGeneration(task);
});
```

---

## 监控和调试

### 前端监控

#### 关键指标收集
```typescript
// API调用性能监控
const monitorApiCall = async (apiName: string, apiFunction: () => Promise<any>) => {
  const startTime = Date.now();

  try {
    const result = await apiFunction();
    const duration = Date.now() - startTime;

    console.log(`[API监控] ${apiName} 成功 - 耗时: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API监控] ${apiName} 失败 - 耗时: ${duration}ms - 错误:`, error);

    // 发送错误到监控服务
    sendToMonitoring(apiName, false, duration, error);
    throw error;
  }
};
```

#### 用户行为追踪
```typescript
// 关键操作追踪
const trackUserAction = (action: string, metadata: Record<string, any>) => {
  console.log(`[用户行为] ${action}`, metadata);

  // 可选：发送到分析服务
  // analytics.track(action, metadata);
};

// 使用示例
trackUserAction('video_generate', {
  model: 'seedance-2.0-fast',
  duration: 5,
  hasImages: images.length > 0
});
```

### 后端监控

#### API性能监控
```javascript
// 中间件监控
const apiMonitor = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    if (statusCode >= 200 && statusCode < 400) {
      console.log(`[API监控] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`);
    } else {
      console.error(`[API监控] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`);
    }
  });

  next();
};
app.use(apiMonitor);
```

#### 错误日志记录
```javascript
// 统一错误日志
const logError = (error, context = {}) => {
  console.error('[错误日志]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });

// 使用示例
try {
  await riskyOperation();
} catch (error) {
  logError(error, { operation: 'video_generation', userId: user.id });
}
```

---

## 故障排查指南

### 常见问题诊断

#### 问题1: 登录后立即退出
**症状**: 用户登录成功但立即被登出
**可能原因**:
- localStorage未正确存储API Key
- API Key验证失败
- 用户状态异常

**排查步骤**:
```typescript
// 1. 检查localStorage
console.log('API Key:', localStorage.getItem('seedance_api_key'));
console.log('用户缓存:', localStorage.getItem('seedance_user_cache'));

// 2. 检查API Key验证
const user = await getCurrentUser();
console.log('当前用户:', user);

// 3. 检查用户状态
if (user && user.status !== 'active') {
  alert('账号已被禁用，请联系管理员');
}
```

#### 问题2: 视频生成卡住
**症状**: 点击生成后进度条不动
**可能原因**:
- API Key配置错误
- 第三方API服务异常
- 网络连接问题

**排查步骤**:
```typescript
// 1. 检查API Key配置
const apiConfig = await getApiKeys();
console.log('API配置:', apiConfig);

// 2. 测试API连接
const testResult = await authService.testApiKeyConnection('volcengine', apiKey);
console.log('连接测试结果:', testResult);

// 3. 检查任务状态
const status = await getTaskStatus(taskId);
console.log('任务状态:', status);
```

#### 问题3: 批量任务失败
**症状**: 批量生成时部分任务失败
**可能原因**:
- 部分任务prompt为空
- 图片素材缺失
- API配额限制

**排查步骤**:
```javascript
// 1. 检查任务配置
const tasks = await getProjectTasks(projectId);
tasks.forEach(task => {
  console.log('任务配置:', {
    prompt: task.prompt,
    hasAssets: task.asset_count > 0,
    taskKind: task.task_kind
  });
});

// 2. 检查批量状态
const batchStatus = await getBatchStatus(batchId);
console.log('批量状态:', batchStatus);

// 3. 检查用户积分
const user = await getCurrentUser();
console.log('用户积分:', user?.credits);
```

---

## 开发工具和技巧

### Chrome DevTools调试

#### 网络请求调试
```
1. 打开Chrome DevTools (F12)
2. 切换到 Network 标签
3. 筛选 X-API-Key 请求头
4. 查看请求和响应详情
5. 检查Response Headers中的数据
```

#### Console日志调试
```javascript
// 在代码中添加调试日志
console.log('[调试] 当前用户:', currentUser);
console.log('[调试] API Key:', apiKey?.substring(0, 10) + '...');
console.log('[调试] 任务状态:', generation);

// 开发环境下显示详细日志
if (process.env.NODE_ENV !== 'production') {
  console.log('[开发调试] 请求参数:', request);
  console.log('[开发调试] 响应数据:', response);
}
```

#### 断点调试
```typescript
// 在关键位置设置断点
const handleGenerate = async () => {
  debugger; // 设置断点

  const result = await generateVideo(request, onProgress);
  debugger; // 检查结果

  setGeneration({ status: 'success', result });
};
```

### API测试工具

#### curl命令测试
```bash
# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 测试API Key验证
curl -X GET http://localhost:3001/api/auth/me \
  -H "X-API-Key: sk_test_api_key"

# 测试视频生成
curl -X POST http://localhost:3001/api/generate-video \
  -H "X-API-Key: sk_test_api_key" \
  -F "prompt=test" \
  -F "model=seedance-2.0-fast" \
  -F "ratio=16:9" \
  -F "duration=5"
```

#### Postman测试集合
```json
{
  "name": "Seedance API测试",
  "item": [
    {
      "name": "用户登录",
      "request": {
        "method": "POST",
        "header": {
          "Content-Type": "application/json"
        },
        "body": {
          "email": "test@example.com",
          "password": "test123"
        },
        "url": "http://localhost:3001/api/auth/login"
      }
    },
    {
      "name": "获取项目列表",
      "request": {
        "method": "GET",
        "header": {
          "X-API-Key": "sk_test_api_key"
        },
        "url": "http://localhost:3001/api/projects"
      }
    }
  ]
}
```

---

## 版本更新和兼容性

### API版本管理

#### 版本化策略
```
当前版本: v2.0
API路径: /api/v2/*
向后兼容: 支持 v1.0 API路径（不推荐）
```

#### 废弃API列表
```typescript
// 已废弃的API（但仍支持）
DEPRECATED:
  - X-Session-ID 认证方式（v1.0）
  - /api/session/* 端点（v1.0）
  - 即梦Session账号相关API（v1.0）

// 推荐使用API（v2.0）
RECOMMENDED:
  - X-API-Key 认证方式
  - /api/user/api-key 端点
  - API供应商管理功能
```

#### 迁移指南
```typescript
// 从v1.0迁移到v2.0

// 1. 认证方式变更
// 旧版本
const sessionId = localStorage.getItem('seedance_session_id');
headers: { 'X-Session-ID': sessionId }

// 新版本
const apiKey = localStorage.getItem('seedance_api_key');
headers: { 'X-API-Key': apiKey }

// 2. Session账号管理功能移除
// 旧版本
import { JimengSessionAccount } from '../types';
const sessionAccounts = await getSessionAccounts();

// 新版本
import { ApiProvider } from '../types';
const apiConfig = await getApiKeys();

// 3. 设置页面功能变更
// 旧版本
<SessionAccountManager />

// 新版本
<ApiProviderSelector />
```

---

## 最佳实践

### 1. 代码组织

#### 按功能模块组织
```
src/
├── services/
│   ├── authService.ts        # 认证相关
│   ├── projectService.ts     # 项目管理
│   ├── taskService.ts        # 任务管理
│   ├── batchService.ts      # 批量管理
│   ├── downloadService.ts   # 下载管理
│   └── videoService.ts      # 视频生成
├── components/
│   ├── VideoPlayer.tsx
│   └── Icons.tsx
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── Settings.tsx
    └── ...
```

### 2. 命名规范

#### API端点命名
```
GET    /api/projects               # 获取列表（复数）
POST   /api/projects               # 创建资源
GET    /api/projects/:id           # 获取单个资源
PUT    /api/projects/:id           # 更新资源
DELETE /api/projects/:id           # 删除资源
GET    /api/projects/:id/tasks     # 获取子资源
```

#### 函数命名
```typescript
// Service层函数命名
export async function getProjects(): Promise<Project[]>
export async function createProject(data): Promise<Project>
export async function updateProject(id, data): Promise<void>

// 组件事件处理命名
const handleClick = () => { ... }
const handleSave = async () => { ... }
const handleInputChange = (e: ChangeEvent) => { ... }
```

### 3. 类型安全

#### 完整的类型定义
```typescript
// API请求类型
interface GenerateVideoRequest {
  prompt: string;
  model: ModelId;
  ratio: AspectRatio;
  duration: Duration;
  files: File[];
}

// API响应类型
interface VideoGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt: string;
  }>;
}

// 用户状态类型
interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  credits: number;
  apiProvider?: ApiProvider;
}
```

---

## 快速参考表

### 常用API端点速查

| 功能 | 端点 | 认证 | UI组件 |
|------|------|------|--------|
| 用户登录 | `POST /api/auth/login` | 否 | `LoginPage.tsx` |
| 获取用户信息 | `GET /api/auth/me` | 是 | `App.tsx` |
| 保存API Key | `POST /api/user/api-key` | 是 | `Settings.tsx` |
| 获取项目列表 | `GET /api/projects` | 是 | `BatchManagement.tsx` |
| 创建视频任务 | `POST /api/generate-video` | 是 | `SingleTaskPage.tsx` |
| 查询任务状态 | `GET /api/task/:taskId` | 否 | `videoService.ts` |
| 批量生成 | `POST /api/batch/generate` | 是 | `BatchManagement.tsx` |
| 下载视频 | `POST /api/download/tasks/:id/download` | 是 | `DownloadManagement.tsx` |

### 状态码速查

| 状态码 | 含义 | 处理方式 |
|--------|------|----------|
| 200 | 成功 | 正常处理响应 |
| 400 | 请求错误 | 检查参数格式 |
| 401 | 未认证 | 配置API Key |
| 403 | 权限不足 | 检查用户权限 |
| 404 | 资源不存在 | 检查资源ID |
| 500 | 服务器错误 | 联系管理员 |

### 错误消息速查

| 错误消息 | 原因 | 解决方法 |
|---------|------|----------|
| "未配置API Key" | 未设置API Key | 在设置页面配置API Key |
| "API Key无效" | API Key错误 | 重新配置或联系管理员 |
| "积分不足" | 积分不够 | 充值或签到获取积分 |
| "任务不存在" | 任务ID错误 | 检查任务ID是否正确 |
| "生成失败" | 第三方API错误 | 检查网络连接和API状态 |

---

**文档版本**: v2.0
**最后更新**: 2026-04-06
**维护者**: Seedance开发团队
**联系方式**: 详见项目README.md