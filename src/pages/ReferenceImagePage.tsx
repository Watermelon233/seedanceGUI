import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVideoWithVolcengine, generateVideoWithAihubmix } from '../services/directApiService';

interface ImageInput {
  id: string;
  type: 'url' | 'file';
  url?: string;
  file?: File;
  preview?: string;
}

export default function ReferenceImagePage() {
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('[图1]戴着眼镜穿着蓝色T恤的男生和[图2]的柯基小狗，坐在[图3]的草坪上，3D卡通风格');
  const [model, setModel] = useState('seedance-2.0');
  const [ratio, setRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  const [images, setImages] = useState<ImageInput[]>([]);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // 模型选项
  const modelOptions = [
    { value: 'doubao-seedance-1-0-lite-i2v-250428', label: 'Seedance 1.0 Lite (图生视频)' },
    { value: 'seedance-2.0', label: 'Seedance 2.0 (全能)' },
    { value: 'seedance-2.0-vip', label: 'Seedance 2.0 VIP (720p)' },
  ];

  // 检测占位符
  const placeholders = prompt.match(/\[图\d+\]/g) || [];
  const uniquePlaceholders = Array.from(new Set(placeholders));

  // 添加图片URL
  const addImageUrl = () => {
    const newImage: ImageInput = {
      id: Date.now().toString(),
      type: 'url',
      url: ''
    };
    setImages([...images, newImage]);
  };

  // 添加图片文件
  const addImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: ImageInput = {
        id: Date.now().toString(),
        type: 'file',
        file: file,
        preview: e.target?.result as string
      };
      setImages([...images, newImage]);
    };
    reader.readAsDataURL(file);
  };

  // 更新图片URL
  const updateImageUrl = (id: string, url: string) => {
    setImages(images.map(img =>
      img.id === id ? { ...img, url } : img
    ));
  };

  // 删除图片
  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  // 生成预览内容
  const generatePreview = async () => {
    setError('');
    setGeneratedContent(null);

    // 验证占位符数量
    if (uniquePlaceholders.length > images.length) {
      setError(`提示词包含 ${uniquePlaceholders.length} 个图片占位符，但只上传了 ${images.length} 张图片`);
      return;
    }

    try {
      // 构建content数组
      const content = [
        {
          type: 'text',
          text: prompt
        }
      ];

      // 添加图片
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        let imageUrl = '';

        if (image.type === 'url') {
          imageUrl = image.url || '';
        } else if (image.file) {
          // 转换文件为base64
          imageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(image.file!);
          });
        }

        content.push({
          type: 'image_url',
          image_url: {
            url: imageUrl
          },
          role: 'reference_image'
        });
      }

      // 构建完整请求体
      const requestBody = {
        model: model,
        content: content,
        ratio: ratio,
        duration: duration
      };

      setGeneratedContent(requestBody);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成预览失败');
    }
  };

  // 执行视频生成
  const handleGenerate = async () => {
    setError('');
    setIsGenerating(true);

    try {
      // 准备图片数据
      const imageUrls = images.filter(img => img.type === 'url').map(img => img.url!);
      const imageFiles = images.filter(img => img.type === 'file').map(img => img.file!);

      const request = {
        prompt,
        model,
        ratio,
        duration,
        imageUrls,
        imageFiles,
        referenceMode: '全能参考',
        generateAudio: true,
        resolution: '720p'
      };

      const result = await generateVideoWithVolcengine(request);

      if (result.success) {
        alert(`✅ 任务创建成功！\n任务ID: ${result.taskId}\n\n可以在任务管理页面查看进度`);
        navigate('/');
      } else {
        setError(result.error || '生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      padding: '6rem 2rem 2rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎯 参考图模式
          </h1>
          <p style={{ color: '#9ca3af' }}>
            支持[图1][图2]占位符，精准控制图片引用
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* 左侧：输入区域 */}
          <div>
            {/* 基础参数 */}
            <div style={{
              backgroundColor: '#1a1d2d',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                📝 基础参数
              </h3>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* 模型选择 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    模型
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#0f111a',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#e5e7eb',
                      fontSize: '0.875rem'
                    }}
                  >
                    {modelOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* 宽高比 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    宽高比
                  </label>
                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#0f111a',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#e5e7eb',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="16:9">16:9 (横屏)</option>
                    <option value="9:16">9:16 (竖屏)</option>
                    <option value="1:1">1:1 (方形)</option>
                    <option value="4:3">4:3 (标准)</option>
                  </select>
                </div>

                {/* 视频时长 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    视频时长 (秒)
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="15"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#0f111a',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#e5e7eb',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 提示词输入 */}
            <div style={{
              backgroundColor: '#1a1d2d',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              marginBottom: '1.5rem'
            }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                📄 提示词 (支持占位符)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="使用[图1]、[图2]等占位符引用图片..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#0f111a',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#e5e7eb',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              {/* 占位符提示 */}
              {uniquePlaceholders.length > 0 && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    🔍 检测到的占位符:
                  </div>
                  <div style={{ color: '#a855f7' }}>
                    {uniquePlaceholders.join(', ')}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                    需要上传 {uniquePlaceholders.length} 张图片
                  </div>
                </div>
              )}
            </div>

            {/* 图片管理 */}
            <div style={{
              backgroundColor: '#1a1d2d',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                  🖼️ 参考图片 ({images.length}/{uniquePlaceholders.length || 0})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={addImageUrl}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer'
                    }}
                  >
                    + URL
                  </button>
                  <label style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}>
                    + 文件
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          Array.from(e.target.files).forEach(addImageFile);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* 图片列表 */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#0f111a',
                      borderRadius: '0.5rem',
                      border: '1px solid #374151',
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center'
                    }}
                  >
                    {/* 序号 */}
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#a855f7',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>

                    {/* 图片预览或URL输入 */}
                    <div style={{ flex: 1 }}>
                      {image.type === 'url' ? (
                        <input
                          type="text"
                          value={image.url}
                          onChange={(e) => updateImageUrl(image.id, e.target.value)}
                          placeholder="输入图片URL..."
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: '#1a1d2d',
                            border: '1px solid #374151',
                            borderRadius: '0.25rem',
                            color: '#e5e7eb',
                            fontSize: '0.875rem'
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {image.preview && (
                            <img
                              src={image.preview}
                              alt={`图${index + 1}`}
                              style={{ width: '3rem', height: '3rem', objectFit: 'cover', borderRadius: '0.25rem' }}
                            />
                          )}
                          <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            {image.file?.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeImage(image.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}

                {images.length === 0 && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    border: '2px dashed #374151',
                    borderRadius: '0.5rem'
                  }}>
                    暂无图片，请添加图片URL或上传文件
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：预览和操作 */}
          <div>
            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                onClick={generatePreview}
                disabled={images.length === 0}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'linear-gradient(to right, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: images.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: images.length > 0 ? 1 : 0.5
                }}
              >
                🔍 生成预览
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || images.length === 0}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'linear-gradient(to right, #a855f7, #ec4899)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (!isGenerating && images.length > 0) ? 'pointer' : 'not-allowed',
                  opacity: (!isGenerating && images.length > 0) ? 1 : 0.5
                }}
              >
                {isGenerating ? '生成中...' : '🚀 开始生成'}
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '0.5rem',
                color: '#ef4444',
                marginBottom: '1.5rem'
              }}>
                {error}
              </div>
            )}

            {/* 生成的请求体预览 */}
            {generatedContent && (
              <div style={{
                backgroundColor: '#1a1d2d',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid #374151',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  ✅ 生成的API请求体
                </h3>
                <pre style={{
                  backgroundColor: '#0f111a',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  overflow: 'auto',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  color: '#22c55e'
                }}>
                  {JSON.stringify(generatedContent, null, 2)}
                </pre>

                {/* 复制按钮 */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedContent, null, 2));
                    alert('✅ 已复制到剪贴板');
                  }}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  📋 复制JSON
                </button>
              </div>
            )}

            {/* 使用说明 */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              backgroundColor: '#1a1d2d',
              borderRadius: '1rem',
              border: '1px solid #374151'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                📖 使用说明
              </h3>
              <ul style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
                <li>在提示词中使用 [图1], [图2] 等占位符</li>
                <li>上传或输入对应数量的图片</li>
                <li>图片按顺序映射到占位符</li>
                <li>支持混合使用图片URL和上传文件</li>
                <li>点击"生成预览"查看API请求体</li>
                <li>确认无误后点击"开始生成"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}