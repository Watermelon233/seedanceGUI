# Mock API 使用指南

## 什么是 Mock API？

Mock API 是一个测试模式，用于在不调用真实视频生成接口的情况下测试 UI 流程。

## 如何启用

在项目根目录的 `.env` 文件中设置：

```bash
VITE_MOCK_API=true
```

然后重启开发服务器：

```bash
npm run dev:client
```

## 如何验证

1. 访问 http://localhost:5173/generate
2. 页面顶部应显示黄色横幅："🧪 测试模式 - 当前使用 Mock API，不会调用真实接口"
3. 右下角有 "🧪 Mock" 按钮，点击打开控制面板
4. 打开浏览器控制台，查看 `[MockProvider]` 日志

## 测试流程

1. 输入提示词（可选上传图片）
2. 点击"生成视频"
3. 等待约 3 秒
4. 查看测试视频播放

## 状态持久化

Mock 任务状态存储策略：
- 优先使用 localStorage（刷新页面后状态保留）
- localStorage 不可用时自动切换到内存模式
- 任务数据在 5 分钟后自动清理

## 清理 Mock 任务

点击右下角 Mock 控制面板中的"清理 Mock 任务"按钮，会清理：
- IndexedDB 中的 mock 任务记录
- localStorage/内存 中的 mock 任务状态

## 禁用 Mock

在 `.env` 中设置：

```bash
VITE_MOCK_API=false
```

或删除该行，然后重启开发服务器。

## 注意事项

- Mock 模式仅用于开发/测试，生产环境会强制禁用
- Mock 任务会标记 `isMock: true`，可与真实任务区分
- 状态存储有 5 分钟自动清理机制
- 隐私浏览模式下会自动使用内存模式
- 测试视频使用公开 URL，需要网络连接

## 生产环境保护

构建时会自动检查 Mock 模式：
```bash
npm run build
```

如果 `VITE_MOCK_API=true`，构建会失败并显示错误信息。

## 技术细节

### 测试视频

当前使用公开测试视频：
```
https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4
```

如需使用本地视频，参见 `public/assets/README.md`。

### 控制台输出

```
[ProviderFactory] 使用 Mock Provider
[MockProvider] 视频生成请求: {model: "seedance-2.0-fast", ratio: "16:9", duration: "5s", files: 0, prompt: "test"}
[MockProvider] 任务创建成功: mock-task-1743456789000
[MockProvider] 任务完成: mock-task-1743456789000
```

### 状态存储键值

- `localStorage`: `mock_tasks` - 任务状态数据
- `IndexedDB`: `tasks` 表中的 `isMock` 索引 - 任务记录

## 故障排查

### Mock 模式未生效

1. 确认 `.env` 文件中设置了 `VITE_MOCK_API=true`
2. 确认重启了开发服务器
3. 检查控制台是否有 `[ProviderFactory] 使用 Mock Provider` 日志

### 视频无法播放

1. 检查网络连接（测试视频来自互联网）
2. 检查浏览器控制台是否有 CORS 错误
3. 尝试使用本地视频（参见 `public/assets/README.md`）

### 任务状态丢失

1. 正常现象：刷新页面后内存模式会丢失状态
2. localStorage 模式会保留状态，但 5 分钟后自动清理
3. 隐私浏览模式使用内存模式，刷新会丢失
