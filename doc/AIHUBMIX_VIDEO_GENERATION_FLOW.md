# Aihubmix 视频生成流程文档

**文档版本**: v2.0
**创建日期**: 2026-04-06
**官方文档**: https://docs.aihubmix.com
**参考来源**: `src/services/providers/aihubmixProvider.ts`

---

## API 端点

| 操作 | 方法 | 端点 | 说明 |
|------|------|------|------|
| 创建视频 | POST | `/v1/videos` | 提交视频生成任务 |
| 查询状态 | GET | `/v1/videos/{video_id}` | 查询任务状态与进度 |
| 下载视频 | GET | `/v1/videos/{video_id}/content` | 下载生成的 MP4 视频 |

**Base URL**: `https://aihubmix.com` (可配置)

**认证方式**: `Authorization: Bearer $API_KEY`

---

## 概述

本文档描述 Aihubmix API 的视频生成流程，仅关注流程步骤，不涉及具体的 Request Body 格式。

---

## 视频生成流程

### 1. 前置检查阶段

```
开始
  ↓
获取 API 配置 (getApiConfig)
  ↓
检查 Aihubmix API Key 是否存在
  ↓
[否] → 返回错误: "未配置Aihubmix API Key"
[是] → 继续
```

### 2. 请求准备阶段

```
获取模型ID映射
  ↓
构建 Content 数组（参考火山引擎方式）
  ├─ 添加文本提示词 (type: 'text')
  └─ 处理媒体文件 (图片/音频/视频)
      ├─ 文件转 Base64
      ├─ 检测文件类型
      └─ 根据 referenceMode 设置 role
  ↓
确定请求参数
  ├─ model: 模型ID映射
  ├─ prompt: 提示词
  ├─ seconds: 时长 (string类型)
  └─ size: 宽高比 (使用ratio)
  ↓
处理媒体文件
  ├─ 单个文件 → input_reference
  └─ 多个文件 → content 数组
```

### 3. API 调用阶段

```
构建 API URL
  endpoint + "/v1/videos"
  ↓
发送 POST 请求
  ├─ Headers:
  │   ├─ Authorization: Bearer ${apiKey}
  │   └─ Content-Type: application/json
  └─ Body: JSON 格式的 payload
  ↓
处理响应
  ├─ [失败] → 抛出异常
  └─ [成功] → 解析响应数据
```

### 4. 响应处理阶段

```
解析响应数据
  ↓
提取结果
  ├─ success: true
  ├─ taskId: data.id (即 video_id)
  └─ videoUrl: data.url
  ↓
返回结果对象
```

---

## 任务状态查询流程

### 1. 前置检查

```
开始
  ↓
获取 API 配置
  ↓
检查 Aihubmix API Key 是否存在
  ↓
[否] → 抛出异常
[是] → 继续
```

### 2. 查询请求

```
构建查询 URL
  endpoint + "/v1/videos/" + video_id
  ↓
发送 GET 请求
  ├─ Headers:
  │   └─ Authorization: Bearer ${apiKey}
  ↓
处理响应
  ├─ [失败] → 抛出异常
  └─ [成功] → 解析状态数据
```

### 3. 状态映射

```
返回状态映射
  ├─ queued/in_progress → processing (生成中)
  ├─ completed → completed (生成完成，可以下载)
  ├─ failed → failed (生成失败)
  ├─ videoUrl: data.url
  └─ error: data.error?.message
```

## 视频下载流程

### 下载端点

```
GET /v1/videos/{video_id}/content
  ↓
返回视频二进制流
  Content-Type: video/mp4
```

### 代码示例

```typescript
// 获取下载URL
const downloadUrl = provider.getDownloadUrl(videoId);
// https://aihubmix.com/v1/videos/{video_id}/content

// 或直接下载
const blob = await provider.downloadVideo(videoId);
```

---

## 虚函数接口定义

基于上述流程，项目已实现供应商抽象接口，位于 `src/services/videoProvider.ts` 和 `src/services/providers/` 目录。

### 架构设计

```
src/services/
├── videoProvider.ts          # 抽象基类和接口定义
├── providers/
│   ├── index.ts              # 模块导出
│   ├── providerFactory.ts    # 供应商工厂
│   ├── aihubmixProvider.ts   # Aihubmix 实现
│   └── volcengineProvider.ts # Volcengine 实现
```

### VideoProvider 接口

```typescript
// src/services/videoProvider.ts
interface VideoProvider {
  readonly name: string;
  createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  testConnection?(): Promise<boolean>;
}
```

### BaseVideoProvider 抽象基类

提供通用的辅助方法，子类可复用：

```typescript
abstract class BaseVideoProvider implements VideoProvider {
  // 虚函数 - 子类必须实现
  abstract readonly name: string;
  abstract createGenerationTask(...);
  abstract getTaskStatus(...);

  // 通用方法 - 子类可继承使用
  protected validateApiKey(): void;
  protected getAuthHeaders(): Record<string, string>;
  protected fetchWithProxy(url, options): Promise<Response>;
  protected fileToBase64(file): Promise<string>;
  protected detectMediaType(file): 'image' | 'audio' | 'video';
  protected buildContentArray(...): Promise<Array<any>>;
}
```

### AihubmixProvider 实现要点

```typescript
// src/services/providers/aihubmixProvider.ts
class AihubmixProvider extends BaseVideoProvider {
  readonly name = 'aihubmix';

  // 实现虚函数 - 创建视频生成任务
  async createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    // 1. 前置检查 - 验证API Key (继承自基类)
    this.validateApiKey();

    // 2. 模型映射 - 获取模型ID
    const modelId = MODEL_ID_MAPPING[request.model] || request.model;

    // 3. Content构建 - 处理提示词和媒体文件 (继承自基类)
    const content = await this.buildContentArray(...);

    // 4. 参数确定 - 设置分辨率、比例等
    const payload = { model, content, resolution, ratio, duration, ... };

    // 5. API调用 - POST到endpoint/v1/video/generate
    const response = await this.fetchWithProxy(apiUrl, { ... });

    // 6. 响应处理 - 返回taskId和videoUrl
    return { success: true, taskId: data.id, videoUrl: data.video_url };
  }

  // 实现虚函数 - 查询任务状态
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // 1. 前置检查
    this.validateApiKey();

    // 2. URL构建 - endpoint/v1/tasks/{taskId}
    const apiUrl = `${this.endpoint}/v1/tasks/${taskId}`;

    // 3. API调用 - GET请求
    const response = await this.fetchWithProxy(apiUrl, { ... });

    // 4. 状态映射 - 返回status, videoUrl, error
    return { status, videoUrl, error };
  }
}
```

### 使用示例

```typescript
import { getVideoProvider, getDefaultVideoProvider } from '@/services/providers';

// 方式1: 获取指定供应商
const aihubmix = getVideoProvider('aihubmix');
const result = await aihubmix.createGenerationTask(request);

// 方式2: 获取默认供应商
const provider = getDefaultVideoProvider();
const status = await provider.getTaskStatus(taskId);

// 方式3: 使用工厂类
import { ProviderFactory } from '@/services/providers';
const volcengine = ProviderFactory.getProvider('volcengine');
const connected = await ProviderFactory.testConnection('aihubmix');
```

---

## 与 Volcengine 流程对比

| 步骤 | Aihubmix | Volcengine |
|------|----------|------------|
| 创建端点 | `/v1/videos` | `/api/v3/contents/generations/tasks` |
| 查询端点 | `/v1/videos/{video_id}` | `/api/v3/contents/generations/tasks/{taskId}` |
| 下载端点 | `/v1/videos/{video_id}/content` | (通过响应中的url) |
| 时长参数 | `seconds` (string) | `duration` (number) |
| 分辨率参数 | `size` (ratio) | `ratio` + `resolution` |
| 参考图方式 | `input_reference` 或 `content` | `content` 数组 |
| 状态值 | `in_progress/completed/failed` | `queued/running/succeeded/failed` |
| 认证方式 | Bearer Token | Bearer Token |
| Content构建 | 参考火山引擎方式 | 原生方式 |

---

## 注意事项

1. **CORS 处理**: Aihubmix API 可能需要通过 CORS 代理访问
2. **错误处理**: 网络失败时需要尝试备用代理
3. **状态映射**: Aihubmix 的状态值可能与 Volcengine 不同，需要统一映射
4. **响应格式**: Aihubmix 可能直接返回 video_url，而 Volcengine 需要轮询获取

---

**维护者**: Seedance 开发团队
**最后更新**: 2026-04-06
