# Mock 测试资源说明

## 测试视频

Mock Provider 需要一个测试视频文件。以下是几种获取方式：

### 选项 1: 使用公开测试视频（推荐）

修改 `mockProvider.ts` 中的 `videoUrl` 使用公开视频：
```typescript
videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'
```

### 选项 2: 生成本地测试视频

使用 FFmpeg 生成一个最小的测试视频：
```bash
cd public/assets
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 \
  -vf "drawtext=text='MOCK VIDEO':fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -crf 23 \
  mock-video.mp4
```

### 选项 3: 下载示例视频

从以下地址下载测试视频：
- https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4

## Fallback 图片

已提供 `mock-fallback.svg` 作为视频加载失败时的占位图。

## 当前配置

MockProvider 当前使用本地路径：`/assets/mock-video.mp4`

请确保该文件存在，或修改为公开视频 URL。
