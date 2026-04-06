import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VideoGenerationMode,
  MODE_OPTIONS,
  getModeConfig,
  validateImageCount,
  getImageRole
} from '../types';

export default function ApiTestPage() {
  const navigate = useNavigate();

  // 测试参数状态
  const [testParams, setTestParams] = useState({
    model: 'seedance-2.0',
    prompt: '一只可爱的小猫在草地上玩耍',
    ratio: '16:9',
    duration: 5,
    generateAudio: true,
    resolution: '720p',
    seed: -1,
    watermark: false,
  });

  // 新的模式选择状态
  const [selectedMode, setSelectedMode] = useState<VideoGenerationMode>(
    VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME
  );

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [generatedRequestBody, setGeneratedRequestBody] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 模型选项
  const modelOptions = [
    { value: 'seedance-2.0', label: 'Seedance 2.0 (全能)' },
    { value: 'seedance-2.0-vip', label: 'Seedance 2.0 VIP (720p)' },
    { value: 'seedance-2.0-fast', label: 'Seedance 2.0 Fast (快速)' },
    { value: 'seedance-2.0-fast-vip', label: 'Seedance 2.0 Fast VIP (快速720p)' },
  ];

  // 比例选项
  const ratioOptions = [
    { value: 'adaptive', label: '自适应 (首尾帧)' },
    { value: '16:9', label: '16:9 (横屏)' },
    { value: '9:16', label: '9:16 (竖屏)' },
    { value: '1:1', label: '1:1 (方形)' },
    { value: '4:3', label: '4:3 (标准)' },
    { value: '21:9', label: '21:9 (超宽)' },
    { value: '3:4', label: '3:4 (竖版标准)' },
  ];

  // 模型ID映射
  const MODEL_ID_MAPPING: Record<string, string> = {
    'seedance-2.0': 'doubao-seedance-2-0-260128',
    'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
    'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
    'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128',
  };

  // 模式切换处理函数
  const handleModeChange = (newMode: VideoGenerationMode) => {
    setSelectedMode(newMode);

    const config = getModeConfig(newMode);

    // 自动调整ratio为默认值
    setTestParams(prev => ({
      ...prev,
      ratio: config.defaultRatio
    }));

    // 智能处理图片（用户选择：保留图片，标记为无效）
    // 只在用户主动上传超过限制时才提示删除，切换模式时保留图片

    // 清空验证错误和请求体
    setValidationErrors([]);
    setGeneratedRequestBody(null);
  };

  // 验证参数（使用新的验证逻辑）
  const validateParams = (): string[] => {
    const errors: string[] = [];

    if (!testParams.prompt.trim()) {
      errors.push('❌ 提示词不能为空');
    }

    if (testParams.duration < 4 || testParams.duration > 15) {
      errors.push('❌ 视频时长必须在4-15秒之间');
    }

    // 使用新的验证函数
    const imageValidation = validateImageCount(selectedMode, imageFiles.length);
    if (!imageValidation.valid && imageValidation.error) {
      errors.push(imageValidation.error);
    }

    return errors;
  };

  // 文件转Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 构建请求体（修正Role逻辑）
  const buildRequestBody = async () => {
    const errors = validateParams();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      const config = getModeConfig(selectedMode);
      const content: any[] = [];

      // 添加文本提示词
      content.push({
        type: 'text',
        text: testParams.prompt.trim()
      });

      // 添加图片（修正role逻辑）
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const base64 = await fileToBase64(file);

          const imageItem: any = {
            type: 'image_url',
            image_url: {
              url: base64
            }
          };

          // ⚠️ 关键修正：根据配置决定是否添加role
          if (config.useRole) {
            const role = getImageRole(selectedMode, i);
            if (role) {
              imageItem.role = role;
            }
          }

          content.push(imageItem);
        }
      }

      // 确定分辨率
      let resolution = testParams.resolution;
      if (testParams.model.includes('vip')) {
        resolution = '720p';
      }

      // 构建完整请求体
      const requestBody = {
        model: MODEL_ID_MAPPING[testParams.model],
        content: content,
        resolution: resolution,
        ratio: testParams.ratio,
        duration: testParams.duration,
        generate_audio: testParams.generateAudio,
        seed: testParams.seed,
        watermark: testParams.watermark,
        camera_fixed: false
      };

      setGeneratedRequestBody(requestBody);
    } catch (error) {
      setValidationErrors([`❌ 构建请求体失败: ${error instanceof Error ? error.message : '未知错误'}`]);
    }
  };

  // 复制请求体
  const copyRequestBody = () => {
    if (generatedRequestBody) {
      navigator.clipboard.writeText(JSON.stringify(generatedRequestBody, null, 2));
      alert('✅ 请求体已复制到剪贴板');
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const config = getModeConfig(selectedMode);

      // 检查是否超过限制
      if (files.length > config.maxImages) {
        alert(`⚠️ 当前模式最多支持${config.maxImages}张图片，已自动截取前${config.maxImages}张`);
        setImageFiles(files.slice(0, config.maxImages));
      } else {
        setImageFiles(files);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      padding: '6rem 2rem 2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            🔧 API参数测试工具
          </h1>
          <p style={{ color: '#9ca3af' }}>
            根据官方文档验证视频生成请求体构建
          </p>
        </div>

        {/* 参数配置区域 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* 基础参数 */}
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #374151'
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
                  value={testParams.model}
                  onChange={(e) => setTestParams({ ...testParams, model: e.target.value })}
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
                  value={testParams.ratio}
                  onChange={(e) => setTestParams({ ...testParams, ratio: e.target.value })}
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
                  {ratioOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
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
                  value={testParams.duration}
                  onChange={(e) => setTestParams({ ...testParams, duration: parseInt(e.target.value) || 5 })}
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

              {/* 分辨率 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  分辨率
                </label>
                <select
                  value={testParams.resolution}
                  onChange={(e) => setTestParams({ ...testParams, resolution: e.target.value })}
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
                  <option value="480p">480p</option>
                  <option value="720p">720p (推荐)</option>
                  <option value="1080p">1080p</option>
                </select>
              </div>
            </div>
          </div>

          {/* 高级参数 */}
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #374151'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              ⚙️ 视频生成模式
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* 模式选择器 - 新的4种模式 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  🎬 生成模式
                </label>
                <select
                  value={selectedMode}
                  onChange={(e) => handleModeChange(e.target.value as VideoGenerationMode)}
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
                  {MODE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {getModeConfig(selectedMode).maxImages === 0
                    ? '✨ 此模式无需上传图片'
                    : `🖼️ 需要 ${getModeConfig(selectedMode).minImages}-${getModeConfig(selectedMode).maxImages} 张图片`
                  }
                </div>
              </div>

              {/* 生成音频 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>生成音频</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>是否生成同步音频</div>
                </div>
                <input
                  type="checkbox"
                  checked={testParams.generateAudio}
                  onChange={(e) => setTestParams({ ...testParams, generateAudio: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
              </div>

              {/* 水印 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>添加水印</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>是否在视频中添加水印</div>
                </div>
                <input
                  type="checkbox"
                  checked={testParams.watermark}
                  onChange={(e) => setTestParams({ ...testParams, watermark: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
              </div>

              {/* 参考图片上传 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  参考图片 {getModeConfig(selectedMode).maxImages === 0 ? '(文生视频无需图片)' : '(可选)'}
                </label>
                {getModeConfig(selectedMode).maxImages > 0 ? (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={getModeConfig(selectedMode).maxImages === 0}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#0f111a',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        color: '#e5e7eb',
                        fontSize: '0.875rem',
                        opacity: getModeConfig(selectedMode).maxImages === 0 ? 0.5 : 1
                      }}
                    />
                    {imageFiles.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                        已选择 {imageFiles.length} 张图片
                        {imageFiles.length > 0 && getModeConfig(selectedMode).useRole && (
                          <span style={{ marginLeft: '0.5rem', color: '#a855f7' }}>
                            ({imageFiles.length === 2 && getModeConfig(selectedMode).roleType === 'first_last'
                              ? '第1张=首帧, 第2张=尾帧'
                              : '所有图片=参考图'})
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#0f111a',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textAlign: 'center'
                  }}>
                    ✨ 文生视频模式，纯文本生成，无需上传图片
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 提示词输入 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid #374151',
          marginBottom: '2rem'
        }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            📄 提示词
          </label>
          <textarea
            value={testParams.prompt}
            onChange={(e) => setTestParams({ ...testParams, prompt: e.target.value })}
            placeholder={
              selectedMode === VideoGenerationMode.TEXT_TO_VIDEO
                ? '描述你想要生成的视频场景，例如：写实风格，晴朗的蓝天之下...'
                : selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME
                ? '描述视频动作，例如：女孩抱着狐狸，女孩睁开眼...'
                : selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST
                ? '描述运镜方式，例如：360度环绕运镜'
                : '描述场景，可以使用[图1]、[图2]引用图片...'
            }
            rows={4}
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
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={buildRequestBody}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(to right, #a855f7, #ec4899)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            🔨 生成请求体
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#1a1d2d',
              color: '#e5e7eb',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            ← 返回主页
          </button>
        </div>

        {/* 验证错误 */}
        {validationErrors.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            {validationErrors.map((error, index) => (
              <div key={index} style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                {error}
              </div>
            ))}
          </div>
        )}

        {/* 生成的请求体 */}
        {generatedRequestBody && (
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #374151'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                ✅ 生成的请求体
              </h3>
              <button
                onClick={copyRequestBody}
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
                📋 复制
              </button>
            </div>
            <pre style={{
              backgroundColor: '#0f111a',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: '#22c55e'
            }}>
              {JSON.stringify(generatedRequestBody, null, 2)}
            </pre>

            {/* 请求体说明 */}
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0f111a', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                📋 请求体说明
              </h4>
              <ul style={{ fontSize: '0.875rem', color: '#9ca3af', paddingLeft: '1.5rem' }}>
                <li><strong>模式</strong>: {MODE_OPTIONS.find(m => m.value === selectedMode)?.label}</li>
                <li><strong>model</strong>: {generatedRequestBody.model} (模型ID)</li>
                <li><strong>content</strong>: 包含 {generatedRequestBody.content.length} 个元素（文本+图片）</li>
                <li><strong>图片role</strong>: {getModeConfig(selectedMode).useRole ? '已设置' : '未设置（正确）'}</li>
                <li><strong>resolution</strong>: {generatedRequestBody.resolution} (视频分辨率)</li>
                <li><strong>ratio</strong>: {generatedRequestBody.ratio} (宽高比)</li>
                <li><strong>duration</strong>: {generatedRequestBody.duration}秒 (视频时长)</li>
                <li><strong>generate_audio</strong>: {generatedRequestBody.generate_audio ? '是' : '否'} (生成音频)</li>
                <li><strong>seed</strong>: {generatedRequestBody.seed} (随机种子)</li>
                <li><strong>watermark</strong>: {generatedRequestBody.watermark ? '是' : '否'} (水印)</li>
              </ul>
            </div>

            {/* API端点 */}
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                🚀 API端点
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#a855f7' }}>
                POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
