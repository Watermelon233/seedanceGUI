# 🎯 参考图模式功能说明

**功能状态**: ✅ 已完成实现  
**最后更新**: 2026年4月6日  
**支持版本**: Seedance GUI 2.0+

---

## 📋 功能概述

参考图模式是Seedance GUI的高级功能，允许用户在提示词中使用占位符（如`[图1]`、`[图2]`）来精准引用特定的参考图片，实现更加精确的图生视频效果。

### 🔥 核心特性

1. **占位符支持**: 在提示词中使用`[图1]`、`[图2]`等占位符
2. **混合输入**: 支持同时使用图片URL和本地文件上传
3. **自动映射**: 按顺序将占位符映射到对应的图片
4. **实时预览**: 生成API请求体预览，方便调试
5. **灵活配置**: 支持多种模型、分辨率和时长参数

---

## 🚀 使用方法

### 1. 访问参考图模式页面

访问路径: `http://localhost:5173/reference`

**注意**: 需要先配置API Key才能访问此页面

### 2. 编写包含占位符的提示词

在提示词输入框中，使用`[图1]`、`[图2]`等占位符来引用图片：

```
[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格
```

系统会自动检测占位符并显示需要上传的图片数量。

### 3. 添加参考图片

支持两种方式添加图片：

#### 方式1: 添加图片URL
1. 点击"+ URL"按钮
2. 输入图片的URL地址
3. 系统会自动按顺序分配给占位符

#### 方式2: 上传本地文件
1. 点击"+ 文件"按钮
2. 选择一张或多张本地图片
3. 系统会自动按顺序分配给占位符

**混合使用**: 可以同时使用URL和文件，系统会按照添加顺序统一编号。

### 4. 预览和生成

1. **生成预览**: 点击"生成预览"按钮查看API请求体
2. **确认无误**: 检查生成的content数组是否正确
3. **开始生成**: 点击"开始生成"按钮提交任务

---

## 📊 API调用示例

### 输入数据

**提示词**:
```
[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格
```

**图片配置**:
- 图1: `https://example.com/person.png`
- 图2: 本地上传文件
- 图3: `https://example.com/lawn.png`

### 生成的API请求体

```json
{
  "model": "doubao-seedance-1-0-lite-i2v-250428",
  "content": [
    {
      "type": "text",
      "text": "[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/person.png"
      },
      "role": "reference_image"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/png;base64,iVBORw0KGgoAAAANS..."
      },
      "role": "reference_image"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/lawn.png"
      },
      "role": "reference_image"
    }
  ],
  "ratio": "16:9",
  "duration": 5
}
```

---

## 🎨 使用场景

### 1. 角色组合场景
```
[图1]的宇航员和[图2]的外星人在[图3]的星球表面握手，科幻风格
```

### 2. 风格迁移场景
```
将[图1]的照片转换为[图2]的水彩画风格
```

### 3. 场景合成场景
```
[图1]的古建筑在[图2]的夕阳下，呈现[图3]的金色光芒
```

### 4. 角色动作场景
```
[图1]的角色穿着[图2]的衣服，做出[图3]的姿势
```

---

## ⚙️ 技术实现

### 后端实现 (`directApiService.ts`)

```typescript
async function buildContentArray(
  prompt: string,
  imageFiles?: File[],
  imageUrls?: string[],
  referenceMode?: string
): Promise<Array<any>> {
  const content: Array<any> = [];

  // 准备图片数据：支持文件和URL混合
  const imageData: Array<{ url: string; index: number }> = [];

  // 处理上传的文件
  if (imageFiles && imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      const base64 = await fileToBase64(imageFiles[i]);
      imageData.push({ url: base64, index: i + 1 });
    }
  }

  // 处理图片URL
  if (imageUrls && imageUrls.length > 0) {
    const startIndex = imageData.length + 1;
    for (let i = 0; i < imageUrls.length; i++) {
      imageData.push({ url: imageUrls[i], index: startIndex + i });
    }
  }

  // 检测是否为参考图模式（包含占位符）
  const hasPlaceholders = /\[图\d+\]/.test(prompt);

  if (hasPlaceholders) {
    // 参考图模式：保持占位符，按顺序添加图片
    content.push({
      type: 'text',
      text: prompt // 保持原始占位符格式
    });

    // 添加所有图片，使用 reference_image 角色
    for (const image of imageData) {
      content.push({
        type: 'image_url',
        image_url: {
          url: image.url
        },
        role: 'reference_image'
      });
    }
  } else {
    // 传统模式：直接添加提示词和图片
    // ... (原有的逻辑)
  }

  return content;
}
```

### 前端实现 (`ReferenceImagePage.tsx`)

**核心功能**:
1. **占位符检测**: 使用正则表达式 `/\[图\d+\]/g` 检测占位符
2. **图片管理**: 支持URL和文件的混合管理
3. **实时预览**: 实时生成API请求体预览
4. **验证检查**: 确保占位符数量与图片数量匹配

---

## 🔍 与传统模式的区别

### 传统模式
```json
{
  "content": [
    {
      "type": "text", 
      "text": "一只可爱的小猫在草地上玩耍"
    },
    {
      "type": "image_url",
      "image_url": { "url": "base64..." },
      "role": "reference_image"
    }
  ]
}
```

### 参考图模式
```json
{
  "content": [
    {
      "type": "text",
      "text": "[图1]的小猫和[图2]的草地，阳光明媚"
    },
    {
      "type": "image_url",
      "image_url": { "url": "图片1" },
      "role": "reference_image"
    },
    {
      "type": "image_url", 
      "image_url": { "url": "图片2" },
      "role": "reference_image"
    }
  ]
}
```

**核心差异**:
- 传统模式：图片作为整体参考，不区分具体引用
- 参考图模式：通过占位符精准引用每张图片的具体作用

---

## ⚠️ 使用注意事项

### 1. 占位符格式要求
- ✅ 正确格式: `[图1]`, `[图2]`, `[图3]`
- ❌ 错误格式: `图1`, `[图 1]`, `[图片1]`

### 2. 图片数量要求
- 占位符数量必须与上传图片数量一致
- 例如：使用`[图1][图2][图3]`需要上传3张图片

### 3. 图片顺序要求
- 图片按照添加顺序映射到占位符
- 第1张图片 → `[图1]`
- 第2张图片 → `[图2]`
- 依此类推...

### 4. 模型兼容性
- 推荐使用: `doubao-seedance-1-0-lite-i2v-250428`
- 其他Seedance模型也支持参考图模式

---

## 🧪 测试建议

### 1. 基础功能测试
```
提示词: [图1]的风景，黄昏时分
图片: 1张风景照片
```

### 2. 多图组合测试
```
提示词: [图1]的人物和[图2]的背景，融合风格
图片: 2张相关图片
```

### 3. 复杂场景测试
```
提示词: [图1]的主角穿着[图2]的衣服，站在[图3]的场景中，[图4]的光照效果
图片: 4张相关图片
```

### 4. 混合输入测试
```
提示词: [图1]的网络图片和[图2]的本地上传
图片: 1个URL + 1个本地文件
```

---

## 📈 后续优化计划

### 短期优化
1. **拖拽排序**: 支持拖拽调整图片顺序
2. **批量导入**: 支持从URL列表批量导入
3. **模板保存**: 保存常用的提示词模板

### 长期优化
1. **智能推荐**: 根据提示词智能推荐参考图片
2. **预览生成**: 生成本地预览效果
3. **历史记录**: 保存历史使用记录

---

## 🎉 总结

参考图模式是Seedance GUI的强大功能，通过占位符机制实现了对参考图片的精准控制，大大提升了图生视频的效果和可控性。

**适用人群**: 需要精确控制视频生成效果的专业用户  
**学习难度**: 中等  
**功能价值**: ⭐⭐⭐⭐⭐

---

**文档更新**: 2026年4月6日  
**版本**: 1.0.0  
**维护者**: Seedance GUI开发团队