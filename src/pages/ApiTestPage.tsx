import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VideoGenerationMode,
  MODE_OPTIONS,
  getModeConfig,
  validateImageCount,
  getImageRole
} from '../types';
import { getApiConfig } from '../services/localStorageService';

type ApiProvider = 'volcengine' | 'aihubmix';

export default function ApiTestPage() {
  const navigate = useNavigate();

  // 供应商选择
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('aihubmix');

  // 测试参数状态
  const [testParams, setTestParams] = useState({
    model: 'doubao-seedance-2-0-260128',
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
    VideoGenerationMode.TEXT_TO_VIDEO
  );

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [generatedRequestBody, setGeneratedRequestBody] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: any } | null>(null);
  const [testing, setTesting] = useState(false);

  // 加载配置
  useEffect(() => {
    const config = getApiConfig();
    if (config.defaultProvider) {
      setSelectedProvider(config.defaultProvider);
    }
    // 根据供应商设置默认模型
    if (config.defaultProvider === 'aihubmix') {
      setTestParams(prev => ({ ...prev, model: 'doubao-seedance-2-0-260128' }));
    }
  }, []);

  // 模型选项（根据供应商变化）
  const modelOptions = selectedProvider === 'aihubmix' ? [
    { value: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0 (全能模型)' },
    { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast (快速模型)' },
  ] : [
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

  // 获取API端点
  const getApiEndpoint = () => {
    const config = getApiConfig();
    const endpoint = selectedProvider === 'aihubmix'
      ? (config.aihubmixEndpoint || 'https://aihubmix.com')
      : 'https://ark.cn-beijing.volces.com';

    return selectedProvider === 'aihubmix'
      ? `${endpoint}/v1/videos`
      : `${endpoint}/api/v3/contents/generations/tasks`;
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

  // 构建请求体
  const buildRequestBody = async () => {
    const errors = validateParams();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      const config = getModeConfig(selectedMode);
      const content: any[] = [];

      // 转换@图标记为[图]标记（参考图模式专用）
      let processedPrompt = testParams.prompt.trim();
      if (selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE && imageFiles.length > 0) {
        // 将 @图1 @图2 转换为 [图1] [图2]
        processedPrompt = processedPrompt.replace(/@图(\d+)/g, '[图$1]');
      }

      // 添加文本提示词
      content.push({
        type: 'text',
        text: processedPrompt
      });

      // 添加图片
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

          // 根据配置决定是否添加role
          if (config.useRole) {
            const role = getImageRole(selectedMode, i);
            if (role) {
              imageItem.role = role;
            }
          }

          content.push(imageItem);
        }
      }

      let requestBody: any;

      // 统一使用火山引擎格式的参数
      let resolution = testParams.resolution;
      if (testParams.model.includes('vip')) {
        resolution = '720p';
      }

      requestBody = {
        model: testParams.model,
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

  // 获取供应商描述
  const getProviderDescription = () => {
    return selectedProvider === 'aihubmix'
      ? 'Aihubmix 聚合API - 支持多厂商模型，兼容 OpenAI Sora 格式'
      : '火山方舟官方API - 字节跳动视频生成服务';
  };

  // 测试 API 连接（使用 Chat Completions 接口）
  const testApiConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const config = getApiConfig();
      const apiKey = selectedProvider === 'aihubmix' ? config.aihubmixKey : config.volcengineKey;

      if (!apiKey) {
        setTestResult({
          success: false,
          message: '❌ 未配置 API Key，请先在设置页配置'
        });
        setTesting(false);
        return;
      }

      // 使用 Chat Completions 接口测试连接
      const endpoint = selectedProvider === 'aihubmix'
        ? 'https://aihubmix.com/v1/chat/completions'
        : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

      const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'What is the meaning of life?'
          }
        ]
      };

      console.log('🧪 [API测试] 发起请求...');
      console.log('端点:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      console.log('🧪 [API测试] 响应:', response.status, data);

      if (response.ok && data.choices) {
        setTestResult({
          success: true,
          message: '✅ API 连接成功！',
          response: {
            model: data.model,
            usage: data.usage,
            reply: data.choices[0]?.message?.content || 'N/A'
          }
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ API 请求失败: ${data.error?.message || response.statusText}`,
          response: data
        });
      }
    } catch (error) {
      console.error('🧪 [API测试] 错误:', error);
      setTestResult({
        success: false,
        message: `❌ 网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setTesting(false);
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

        {/* 供应商选择 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid #374151',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                🔌 API 供应商
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                {getProviderDescription()}
              </p>
            </div>
            <select
              value={selectedProvider}
              onChange={(e) => {
                const newProvider = e.target.value as ApiProvider;
                setSelectedProvider(newProvider);
                // 更新默认模型
                if (newProvider === 'aihubmix') {
                  setTestParams(prev => ({ ...prev, model: 'doubao-seedance-2-0-260128' }));
                } else {
                  setTestParams(prev => ({ ...prev, model: 'seedance-2.0' }));
                }
                // 清空已生成的请求体
                setGeneratedRequestBody(null);
                setValidationErrors([]);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0f111a',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#e5e7eb',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="aihubmix">Aihubmix (聚合API)</option>
              <option value="volcengine">火山方舟 (官方API)</option>
            </select>
          </div>

          {/* API 连接测试 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={testApiConnection}
              disabled={testing}
              style={{
                padding: '0.75rem 1.5rem',
                background: testing ? '#374151' : 'linear-gradient(to right, #22c55e, #16a34a)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: testing ? 'not-allowed' : 'pointer',
                opacity: testing ? 0.7 : 1
              }}
            >
              {testing ? '🔄 测试中...' : '🧪 测试 API 连接'}
            </button>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              使用 Chat Completions 快速验证 API Key
            </span>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                {testResult.message}
              </div>
              {testResult.response && (
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  <div>模型: {testResult.response.model}</div>
                  {testResult.response.usage && (
                    <div>Token: {testResult.response.usage.total_tokens || 'N/A'}</div>
                  )}
                  {testResult.response.reply && (
                    <div style={{ marginTop: '0.5rem', color: '#e5e7eb' }}>
                      回复: {testResult.response.reply}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
                  宽高比 (ratio)
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
                  视频时长 (duration)
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

              {/* 分辨率 - 仅火山方舟 */}
              {selectedProvider === 'volcengine' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    分辨率 (resolution)
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
              )}
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
              {/* 模式选择器 - 4种模式 */}
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
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>生成音频 (generate_audio)</div>
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
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>添加水印 (watermark)</div>
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
                      <div style={{ marginTop: '1rem' }}>
                        {/* 图片预览列表 */}
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {imageFiles.map((file, index) => {
                            const config = getModeConfig(selectedMode);
                            const role = config.useRole ? getImageRole(selectedMode, index) : null;
                            const fileSize = (file.size / 1024).toFixed(0);

                            return (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.75rem',
                                  backgroundColor: '#0f111a',
                                  border: '1px solid #374151',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {/* 序号 */}
                                <div style={{
                                  minWidth: '2.5rem',
                                  height: '2.5rem',
                                  borderRadius: '0.375rem',
                                  background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  color: 'white'
                                }}>
                                  图{index + 1}
                                </div>

                                {/* 缩略图 */}
                                <div style={{
                                  width: '3rem',
                                  height: '3rem',
                                  borderRadius: '0.375rem',
                                  overflow: 'hidden',
                                  backgroundColor: '#1a1d2d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`图${index + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>

                                {/* 文件信息 */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '500', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                    {fileSize} KB
                                  </div>
                                </div>

                                {/* Role标签 */}
                                {role && (
                                  <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    backgroundColor: role === 'first_frame' ? 'rgba(34, 197, 94, 0.1)' :
                                                      role === 'last_frame' ? 'rgba(239, 68, 68, 0.1)' :
                                                      'rgba(168, 85, 247, 0.1)',
                                    color: role === 'first_frame' ? '#22c55e' :
                                           role === 'last_frame' ? '#ef4444' :
                                           '#a855f7',
                                    border: `1px solid ${
                                      role === 'first_frame' ? 'rgba(34, 197, 94, 0.3)' :
                                        role === 'last_frame' ? 'rgba(239, 68, 68, 0.3)' :
                                        'rgba(168, 85, 247, 0.3)'
                                    }`
                                  }}>
                                    {role === 'first_frame' ? '🎬 首帧' :
                                     role === 'last_frame' ? '🎬 尾帧' :
                                     `🎨 图${index + 1}`}
                                  </div>
                                )}

                                {/* 删除按钮 */}
                                <button
                                  onClick={() => {
                                    const newFiles = imageFiles.filter((_, i) => i !== index);
                                    setImageFiles(newFiles);
                                  }}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* 提示信息 */}
                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                          {selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE && (
                            <span style={{ color: '#a855f7' }}>
                              💡 提示：在提示词中使用 @图1 @图2 @图3 引用图片，系统会自动转换为 [图1] [图2] [图3]
                            </span>
                          )}
                          {selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST && (
                            <span style={{ color: '#22c55e' }}>
                              💡 提示：第1张图片为起始帧，第2张图片为结束帧
                            </span>
                          )}
                        </div>
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
            📄 提示词 (prompt)
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
                : '描述场景，使用 @图1 @图2 @图3 引用图片，例如：@图1戴着眼镜的男生和@图2的柯基...'
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
            onClick={() => navigate('/generate')}
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
                <li><strong>供应商</strong>: {selectedProvider === 'aihubmix' ? 'Aihubmix (聚合API)' : '火山方舟 (官方API)'}</li>
                <li><strong>模式</strong>: {MODE_OPTIONS.find(m => m.value === selectedMode)?.label}</li>
                <li><strong>model</strong>: {generatedRequestBody.model}</li>
                <li><strong>content</strong>: 包含 {generatedRequestBody.content.length} 个元素（文本+图片）</li>
                <li><strong>图片role</strong>: {getModeConfig(selectedMode).useRole ? '已设置' : '未设置（正确）'}</li>
                <li><strong>resolution</strong>: {generatedRequestBody.resolution}</li>
                <li><strong>ratio</strong>: {generatedRequestBody.ratio}</li>
                <li><strong>duration</strong>: {generatedRequestBody.duration}秒</li>
                <li><strong>generate_audio</strong>: {generatedRequestBody.generate_audio ? '是' : '否'}</li>
                <li><strong>seed</strong>: {generatedRequestBody.seed}</li>
                <li><strong>watermark</strong>: {generatedRequestBody.watermark ? '是' : '否'}</li>
                <li><strong>camera_fixed</strong>: {generatedRequestBody.camera_fixed ? '是' : '否'}</li>
              </ul>
            </div>

            {/* API端点 */}
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                🚀 API端点
              </div>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: '#a855f7' }}>
                POST {getApiEndpoint()}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                认证方式: Authorization: Bearer &lt;API_KEY&gt;
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
