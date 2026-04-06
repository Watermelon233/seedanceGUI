# Seedance 2.0 官方API案例参考 - 4种视频生成模式

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | Seedance 2.0 官方API案例参考 |
| 文档版本 | v1.0.0 |
| 创建日期 | 2026-04-06 |
| 文档状态 | 官方样例整理 |

---

## 目录

1. [概述](#概述)
2. [模式1：文生视频](#模式1文生视频)
3. [模式2：图生视频-首帧](#模式2图生视频-首帧)
4. [模式3：图生视频-首尾帧](#模式3图生视频-首尾帧)
5. [模式4：图生视频-参考图](#模式4图生视频-参考图)
6. [模式对比总结](#模式对比总结)

---

## 概述

本文档整理了 Seedance 2.0 官方提供的4种视频生成模式的API请求样例，用于开发参考和技术实现。

**4种模式：**

1. **文生视频** - 纯文本生成视频
2. **图生视频-首帧** - 单张图片作为首帧参考
3. **图生视频-首尾帧** - 两张图片控制首尾帧
4. **图生视频-参考图** - 多张图片作为风格参考

---

## 模式1：文生视频

### 特征

- **图片数量**: 0张
- **适用场景**: 纯创意生成，无参考图
- **ratio**: 可选任意值（如 `16:9`）
- **role**: 无

### 官方样例

```json
{
  "query": {},
  "body": {
    "model": "doubao-seedance-1-0-pro-250528",
    "content": [
      {
        "type": "text",
        "text": "写实风格，晴朗的蓝天之下，一大片白色的雏菊花田，镜头逐渐拉近，最终定格在一朵雏菊花的特写上，花瓣上有几颗晶莹的露珠"
      }
    ],
    "ratio": "16:9",
    "duration": 5
  }
}
```

### 关键字段

| 字段 | 值 | 说明 |
|------|-----|------|
| model | `doubao-seedance-1-0-pro-250528` | 模型ID |
| content | `[{"type": "text"}]` | 仅包含文本 |
| ratio | `"16:9"` | 宽高比 |
| duration | `5` | 视频时长（秒） |

---

## 模式2：图生视频-首帧

### 特征

- **图片数量**: 1张
- **适用场景**: 单张图片作为首帧参考
- **ratio**: 固定使用 `"adaptive"`
- **role**: ⚠️ **不设置 role 字段**（重要！）

### 官方样例

```json
{
  "query": {},
  "body": {
    "model": "doubao-seedance-1-0-pro-fast-251015",
    "content": [
      {
        "type": "text",
        "text": "女孩抱着狐狸，女孩睁开眼，温柔地看向镜头，狐狸友善地抱着，镜头缓缓拉出，女孩的头发被风吹动"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/i2v_foxrgirl.png"
        }
      }
    ],
    "ratio": "adaptive",
    "duration": 5
  }
}
```

### 关键字段

| 字段 | 值 | 说明 |
|------|-----|------|
| model | `doubao-seedance-1-0-pro-fast-251015` | 快速模型 |
| content | `[text, image_url]` | 文本 + 图片 |
| image_url.role | **(不设置)** | ⚠️ 关键：不设置role |
| ratio | `"adaptive"` | 自适应比例 |

### ⚠️ 重要注意

**常见错误：** 为图片设置 `role: "first_frame"`

```json
// ❌ 错误示例
{
  "type": "image_url",
  "image_url": {
    "url": "https://..."
  },
  "role": "first_frame"  // ❌ 首帧模式不应该有role
}
```

**正确做法：** 图片不设置任何 role 字段

```json
// ✅ 正确示例
{
  "type": "image_url",
  "image_url": {
    "url": "https://..."
  }
  // 不包含 role 字段
}
```

---

## 模式3：图生视频-首尾帧

### 特征

- **图片数量**: 2张（恰好2张）
- **适用场景**: 控制视频的首帧和尾帧
- **ratio**: 固定使用 `"adaptive"`
- **role**: 第1张设置 `"first_frame"`，第2张设置 `"last_frame"`

### 官方样例

```json
{
  "query": {},
  "body": {
    "model": "doubao-seedance-1-0-pro-250528",
    "content": [
      {
        "type": "text",
        "text": "360度环绕运镜"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seepro_first_frame.jpeg"
        },
        "role": "first_frame"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seepro_last_frame.jpeg"
        },
        "role": "last_frame"
      }
    ],
    "duration": 5,
    "ratio": "adaptive"
  }
}
```

### 关键字段

| 字段 | 值 | 说明 |
|------|-----|------|
| content[0] | `text` | 文本描述 |
| content[1] | `image_url` + `role: "first_frame"` | 首帧图片 |
| content[2] | `image_url` + `role: "last_frame"` | 尾帧图片 |
| ratio | `"adaptive"` | 自适应比例 |

### 图片顺序

```javascript
// 第1张图片
{
  "type": "image_url",
  "role": "first_frame",  // 首帧
  "image_url": { "url": "..." }
}

// 第2张图片
{
  "type": "image_url",
  "role": "last_frame",   // 尾帧
  "image_url": { "url": "..." }
}
```

---

## 模式4：图生视频-参考图

### 特征

- **图片数量**: 1-9张
- **适用场景**: 多张图片作为风格参考
- **ratio**: 可选任意值（如 `16:9`）
- **role**: 所有图片设置 `"reference_image"`

### 官方样例

```json
{
  "query": {},
  "body": {
    "model": "doubao-seedance-1-0-lite-i2v-250428",
    "content": [
      {
        "type": "text",
        "text": "[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seelite_ref_1.png"
        },
        "role": "reference_image"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seelite_ref_2.png"
        },
        "role": "reference_image"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seelite_ref_3.png"
        },
        "role": "reference_image"
      }
    ],
    "ratio": "16:9",
    "duration": 5
  }
}
```

### 关键字段

| 字段 | 值 | 说明 |
|------|-----|------|
| model | `doubao-seedance-1-0-lite-i2v-250428` | Lite模型 |
| text | `"[图1]...[图2]...[图3]..."` | 使用占位符引用图片 |
| 所有图片 role | `"reference_image"` | 统一设置为参考图 |

### 提示词占位符语法

```javascript
// 在提示词中使用 [图N] 引用对应图片
"[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上"

// 对应关系：
// [图1] → content[1] (第1张图片)
// [图2] → content[2] (第2张图片)
// [图3] → content[3] (第3张图片)
```

---

## 模式对比总结

### 快速对比表

| 模式 | 图片数量 | ratio | role字段 | 适用场景 |
|------|---------|-------|----------|----------|
| **文生视频** | 0张 | 任意 | 无 | 纯创意生成 |
| **图生视频-首帧** | 1张 | `adaptive` | **不设置** | 单图首帧参考 |
| **图生视频-首尾帧** | 2张 | `adaptive` | `first_frame`, `last_frame` | 控制首尾帧 |
| **图生视频-参考图** | 1-9张 | 任意 | `reference_image` | 多图风格参考 |

### 关键差异

#### 1. role 字段使用

```javascript
// 模式1：文生视频
// ❌ 无图片，无需role

// 模式2：首帧 (⚠️ 重点)
{
  "type": "image_url",
  "image_url": { "url": "..." }
  // ❌ 不设置 role

// 模式3：首尾帧
{
  "type": "image_url",
  "role": "first_frame",  // ✅ 第1张
  "image_url": { "url": "..." }
}
{
  "type": "image_url",
  "role": "last_frame",   // ✅ 第2张
  "image_url": { "url": "..." }
}

// 模式4：参考图
{
  "type": "image_url",
  "role": "reference_image",  // ✅ 所有图片
  "image_url": { "url": "..." }
}
```

#### 2. ratio 参数

```javascript
// 模式1、4：可自定义
"ratio": "16:9"  // 或 "9:16", "1:1", "4:3" 等

// 模式2、3：固定使用
"ratio": "adaptive"  // ⚠️ 必须使用 "adaptive"
```

#### 3. 图片数量限制

```javascript
// 模式1：0张
// 模式2：恰好1张
// 模式3：恰好2张
// 模式4：1-9张
```

---

## 常见错误

### 错误1：模式2错误设置role

```json
// ❌ 错误
{
  "type": "image_url",
  "role": "first_frame",  // 模式2不应该有role
  "image_url": { "url": "..." }
}

// ✅ 正确
{
  "type": "image_url",
  "image_url": { "url": "..." }
  // 不包含 role
}
```

### 错误2：模式3图片数量错误

```json
// ❌ 错误：只有1张图片
{
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image_url", "role": "first_frame", ... }
    // 缺少 last_frame
  ]
}

// ✅ 正确：恰好2张
{
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image_url", "role": "first_frame", ... },
    { "type": "image_url", "role": "last_frame", ... }
  ]
}
```

### 错误3：模式2/3使用错误的ratio

```json
// ❌ 错误
{
  "ratio": "16:9"  // 模式2/3必须使用 adaptive
}

// ✅ 正确
{
  "ratio": "adaptive"
}
```

---

## 模型ID映射

### 当前项目使用的模型

| 前端 modelKey | 官方 model_req_key | 说明 |
|---------------|-------------------|------|
| `seedance-2.0` | `doubao-seedance-2-0-260128` | 全能模型 |
| `seedance-2.0-vip` | `doubao-seedance-2-0-260128` | 全能模型 VIP |
| `seedance-2.0-fast` | `doubao-seedance-2-0-fast-260128` | 快速模型 |
| `seedance-2.0-fast-vip` | `doubao-seedance-2-0-fast-260128` | 快速模型 VIP |

### 官方样例使用的模型

| 样例 | 模型ID | 类型 |
|------|--------|------|
| 文生视频 | `doubao-seedance-1-0-pro-250528` | Pro模型 |
| 首帧 | `doubao-seedance-1-0-pro-fast-251015` | Pro快速 |
| 首尾帧 | `doubao-seedance-1-0-pro-250528` | Pro模型 |
| 参考图 | `doubao-seedance-1-0-lite-i2v-250428` | Lite模型 |

---

## API端点

### 提交视频生成任务

```
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
```

### 请求格式

```http
Content-Type: application/json

{
  "body": {
    "model": "...",
    "content": [...],
    "ratio": "...",
    "duration": 5
  }
}
```

---

## 参考资料

- **文档版本**: v1.0.0
- **最后更新**: 2026-04-06
- **维护者**: Seedance开发团队
- **官方文档**: [豆包方舟API文档](https://www.volcengine.com/docs/)

---

## 变更历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-04-06 | v1.0.0 | 初始版本，整理4种官方模式样例 |
