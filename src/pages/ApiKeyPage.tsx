import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyIcon,
  CheckIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshIcon,
  LoadingIcon,
  GlobeIcon
} from '../components/Icons';
import {
  getApiConfig,
  saveApiConfig,
  validateApiKeyFormat
} from '../services/localStorageService';

type ApiProvider = 'volcengine' | 'aihubmix';

interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  status?: 'available' | 'unavailable' | 'checking';
}

// 默认模型列表
const DEFAULT_MODELS: ModelInfo[] = [
  { id: 'seedance-2.0', name: 'Seedance 2.0 全能模型', description: '标准质量视频生成' },
  { id: 'seedance-2.0-vip', name: 'Seedance 2.0 全能模型 (VIP 720p)', description: '高质量720p输出' },
  { id: 'seedance-2.0-fast', name: 'Seedance 2.0 快速模型', description: '快速生成视频' },
  { id: 'seedance-2.0-fast-vip', name: 'Seedance 2.0 快速模型 (VIP 720p)', description: '快速720p输出' },
];

// Aihubmix 模型列表（可用模型）
const AIHUBMIX_MODELS: ModelInfo[] = [
  { id: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0 全能模型', description: '标准质量视频生成' },
  { id: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 快速模型', description: '快速生成视频' },
];

export default function ApiKeyPage() {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('aihubmix');
  const [volcengineKey, setVolcengineKey] = useState('');
  const [aihubmixKey, setAihubmixKey] = useState('');
  const [aihubmixEndpoint, setAihubmixEndpoint] = useState('https://aihubmix.com');
  const [showKeys, setShowKeys] = useState({ volcengine: false, aihubmix: false });
  const [errors, setErrors] = useState<{
    volcengine?: string;
    aihubmix?: string;
    aihubmixEndpoint?: string;
    general?: string
  }>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 模型列表相关状态
  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [checkingModel, setCheckingModel] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    volcengine: 'idle' | 'checking' | 'success' | 'error';
    aihubmix: 'idle' | 'checking' | 'success' | 'error';
  }>({
    volcengine: 'idle',
    aihubmix: 'idle'
  });

  // 加载已保存的配置
  useEffect(() => {
    const config = getApiConfig();
    if (config.volcengineKey) {
      setVolcengineKey(config.volcengineKey);
    }
    if (config.aihubmixKey) setAihubmixKey(config.aihubmixKey);
    if (config.aihubmixEndpoint) setAihubmixEndpoint(config.aihubmixEndpoint);
    setSelectedProvider(config.defaultProvider || 'aihubmix');
  }, []);

  // 切换供应商时更新模型列表
  useEffect(() => {
    if (selectedProvider === 'aihubmix') {
      setModels(AIHUBMIX_MODELS);
    } else {
      setModels(DEFAULT_MODELS);
    }
    // 重置连接状态
    setConnectionStatus(prev => ({
      ...prev,
      [selectedProvider]: 'idle'
    }));
  }, [selectedProvider]);

  // 检测火山方舟连通性（仅格式检查，因为CORS限制）
  const checkVolcengineConnection = useCallback(async () => {
    if (!volcengineKey.trim()) {
      setErrors({ volcengine: '请先输入API Key' });
      return false;
    }

    if (!validateApiKeyFormat(volcengineKey)) {
      setErrors({ volcengine: 'API Key格式无效，应以 sk- 开头且长度≥35' });
      setConnectionStatus(prev => ({ ...prev, volcengine: 'error' }));
      return false;
    }

    setConnectionStatus(prev => ({ ...prev, volcengine: 'checking' }));
    setErrors({});

    // 火山方舟不支持浏览器直接调用，只做格式验证
    await new Promise(resolve => setTimeout(resolve, 500));

    setConnectionStatus(prev => ({ ...prev, volcengine: 'success' }));
    return true;
  }, [volcengineKey]);

  // 检测 Aihubmix 连通性（使用 Chat Completions 接口）
  const checkAihubmixConnection = useCallback(async () => {
    if (!aihubmixKey.trim()) {
      setErrors({ aihubmix: '请先输入API Key' });
      return false;
    }

    if (!aihubmixEndpoint.trim()) {
      setErrors({ aihubmixEndpoint: '请输入API接入点地址' });
      return false;
    }

    setConnectionStatus(prev => ({ ...prev, aihubmix: 'checking' }));
    setErrors({});

    try {
      // 使用 Chat Completions 接口快速检测连通性
      const response = await fetch(`${aihubmixEndpoint.trim()}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aihubmixKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'What is the meaning of life?'
            }
          ]
        }),
      });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, aihubmix: 'success' }));
        return true;
      } else if (response.status === 401) {
        setErrors({ aihubmix: 'API Key 无效或已过期' });
        setConnectionStatus(prev => ({ ...prev, aihubmix: 'error' }));
        return false;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
        setErrors({ aihubmix: `连接失败: ${errorMsg}` });
        setConnectionStatus(prev => ({ ...prev, aihubmix: 'error' }));
        return false;
      }
    } catch (error) {
      console.error('Aihubmix 连通性检测失败:', error);
      setErrors({
        aihubmix: error instanceof Error ? error.message : '连接失败，请检查API Key和接入点地址'
      });
      setConnectionStatus(prev => ({ ...prev, aihubmix: 'error' }));
      return false;
    }
  }, [aihubmixKey, aihubmixEndpoint]);

  // 检测单个模型
  const checkSingleModel = useCallback(async (modelId: string) => {
    if (selectedProvider === 'volcengine') {
      // 火山方舟无法在浏览器中直接测试
      alert('火山方舟 API 不支持浏览器直接连通性测试\n\n请确保：\n1. API Key 格式正确\n2. 在后端环境调用');
      return;
    }

    setCheckingModel(modelId);
    setModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, status: 'checking' } : m
    ));

    try {
      const response = await fetch(`${aihubmixEndpoint.trim()}/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aihubmixKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          prompt: 'test',
          seconds: '5',
          size: '16:9'
        }),
      });

      if (response.ok || response.status === 400 || response.status === 422) {
        // 400/422 说明 API Key 有效，只是参数问题
        setModels(prev => prev.map(m =>
          m.id === modelId ? { ...m, status: 'available' } : m
        ));
      } else {
        setModels(prev => prev.map(m =>
          m.id === modelId ? { ...m, status: 'unavailable' } : m
        ));
      }
    } catch (error) {
      setModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, status: 'unavailable' } : m
      ));
    } finally {
      setCheckingModel(null);
    }
  }, [selectedProvider, aihubmixKey, aihubmixEndpoint]);

  // 刷新模型列表
  const refreshModels = useCallback(async () => {
    if (selectedProvider === 'aihubmix' && aihubmixKey && aihubmixEndpoint) {
      await checkAihubmixConnection();
    } else if (selectedProvider === 'volcengine') {
      await checkVolcengineConnection();
    }
  }, [selectedProvider, aihubmixKey, aihubmixEndpoint, checkAihubmixConnection, checkVolcengineConnection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setLoading(true);

    // 验证至少配置一个API Key
    if (!volcengineKey.trim() && !aihubmixKey.trim()) {
      setErrors({ general: '请至少配置一个API Key' });
      setLoading(false);
      return;
    }

    // 验证Key格式（只验证火山方舟）
    const newErrors: typeof errors = {};
    if (volcengineKey.trim() && !validateApiKeyFormat(volcengineKey)) {
      newErrors.volcengine = '火山方舟API Key格式无效';
    }
    // Aihubmix Key 不做格式验证

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // 验证API接入点格式
      if (aihubmixKey.trim() && !aihubmixEndpoint.trim()) {
        setErrors({ aihubmixEndpoint: '请输入API接入点' });
        setLoading(false);
        return;
      }

      // 保存配置到localStorage
      saveApiConfig({
        volcengineKey: volcengineKey.trim() || null,
        aihubmixKey: aihubmixKey.trim() || null,
        aihubmixEndpoint: aihubmixEndpoint.trim(),
        defaultProvider: selectedProvider
      });

      setSuccess(true);

      // 2秒后跳转到首页
      setTimeout(() => {
        navigate('/generate');
      }, 2000);
    } catch (error) {
      setErrors({ general: '保存配置失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const currentKey = selectedProvider === 'volcengine' ? volcengineKey : aihubmixKey;
  const connectionState = connectionStatus[selectedProvider];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      paddingTop: '5rem'
    }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* 头部 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            配置 API
          </h1>
          <p style={{ color: '#9ca3af' }}>
            选择并配置您的视频生成API服务
          </p>
        </div>

        {/* 配置表单 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* API 供应商选择 */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                API 供应商
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as ApiProvider)}
                style={{
                  width: '100%',
                  backgroundColor: '#0f111a',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#e5e7eb',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="aihubmix">Aihubmix (聚合 API) - 推荐</option>
                <option value="volcengine">火山方舟 (官方 API)</option>
              </select>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                {selectedProvider === 'volcengine'
                  ? '💡 火山方舟是字节跳动的官方视频生成API服务'
                  : '💡 Aihubmix 是第三方聚合API服务，支持浏览器直接调用，支持多厂商模型'}
              </p>
            </div>

            {/* API Key 输入 */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {selectedProvider === 'volcengine' ? '火山方舟 API Key' : 'Aihubmix API Key'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKeys[selectedProvider] ? 'text' : 'password'}
                  value={currentKey}
                  onChange={(e) => selectedProvider === 'volcengine'
                    ? setVolcengineKey(e.target.value)
                    : setAihubmixKey(e.target.value)
                  }
                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    backgroundColor: '#0f111a',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 3rem 0.75rem 1rem',
                    color: '#e5e7eb',
                    fontSize: '1rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKeys({ ...showKeys, [selectedProvider]: !showKeys[selectedProvider] })}
                  style={{
                    position: 'absolute',
                    right: '2.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer'
                  }}
                >
                  {showKeys[selectedProvider]
                    ? <EyeOffIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                    : <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
                </button>
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <KeyIcon style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
                </div>
              </div>
              {errors[selectedProvider] && (
                <p style={{ marginTop: '0.25rem', color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircleIcon style={{ width: '1rem', height: '1rem' }} />
                  {errors[selectedProvider]}
                </p>
              )}
            </div>

            {/* Aihubmix API 接入点 */}
            {selectedProvider === 'aihubmix' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  API 接入点地址
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={aihubmixEndpoint}
                    onChange={(e) => setAihubmixEndpoint(e.target.value)}
                    placeholder="https://aihubmix.com"
                    style={{
                      width: '100%',
                      backgroundColor: '#0f111a',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      padding: '0.75rem 3rem 0.75rem 1rem',
                      color: '#e5e7eb',
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <GlobeIcon style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
                  </div>
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  官方地址: https://aihubmix.com
                </p>
                {errors.aihubmixEndpoint && (
                  <p style={{ marginTop: '0.25rem', color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircleIcon style={{ width: '1rem', height: '1rem' }} />
                    {errors.aihubmixEndpoint}
                  </p>
                )}
              </div>
            )}

            {/* 连通性检测 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  连通性检测
                </label>
                <button
                  type="button"
                  onClick={refreshModels}
                  disabled={!currentKey.trim() || connectionState === 'checking'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: connectionState === 'checking' ? '#374151' : '#1f2937',
                    border: '1px solid #4b5563',
                    borderRadius: '0.375rem',
                    color: '#e5e7eb',
                    fontSize: '0.875rem',
                    cursor: connectionState === 'checking' ? 'not-allowed' : 'pointer',
                    opacity: !currentKey.trim() || connectionState === 'checking' ? 0.5 : 1
                  }}
                >
                  {connectionState === 'checking' ? (
                    <LoadingIcon style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshIcon style={{ width: '1rem', height: '1rem' }} />
                  )}
                  {connectionState === 'checking' ? '检测中...' : '检测连通性'}
                </button>
              </div>

              {/* 连通性状态 */}
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: connectionState === 'success'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : connectionState === 'error'
                    ? 'rgba(239, 68, 68, 0.1)'
                    : connectionState === 'checking'
                      ? 'rgba(168, 85, 247, 0.1)'
                      : '#1f2937',
                border: `1px solid ${connectionState === 'success'
                  ? 'rgba(34, 197, 94, 0.5)'
                  : connectionState === 'error'
                    ? 'rgba(239, 68, 68, 0.5)'
                    : connectionState === 'checking'
                      ? 'rgba(168, 85, 247, 0.5)'
                      : '#374151'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                {connectionState === 'idle' && (
                  <span style={{ color: '#9ca3af' }}>点击"检测连通性"测试API连接</span>
                )}
                {connectionState === 'checking' && (
                  <span style={{ color: '#a855f7' }}>正在连接API服务...</span>
                )}
                {connectionState === 'success' && (
                  <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckIcon style={{ width: '1rem', height: '1rem' }} />
                    {selectedProvider === 'volcengine'
                      ? 'API Key 格式验证通过（火山方舟需要后端调用）'
                      : 'API 连接成功！'}
                  </span>
                )}
                {connectionState === 'error' && (
                  <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircleIcon style={{ width: '1rem', height: '1rem' }} />
                    连接失败，请检查API Key和配置
                  </span>
                )}
              </div>
            </div>

            {/* 模型列表 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                  可用模型列表
                </label>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  共 {models.length} 个模型
                </span>
              </div>

              <div style={{
                maxHeight: '250px',
                overflowY: 'auto',
                backgroundColor: '#0f111a',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                padding: '0.5rem'
              }}>
                {models.map((model, index) => (
                  <div
                    key={model.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: index === models.length - 1 ? 'none' : '1px solid #1f2937'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb' }}>
                        {model.name}
                      </div>
                      {model.description && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                          {model.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* 模型状态指示 */}
                      {model.status === 'available' && (
                        <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>✓ 可用</span>
                      )}
                      {model.status === 'unavailable' && (
                        <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>✗ 不可用</span>
                      )}
                      {model.status === 'checking' && (
                        <span style={{ color: '#a855f7', fontSize: '0.75rem' }}>
                          {checkingModel === model.id ? '检测中...' : ''}
                        </span>
                      )}
                      {/* 单个模型检测按钮 */}
                      {selectedProvider === 'aihubmix' && connectionStatus.aihubmix === 'success' && (
                        <button
                          type="button"
                          onClick={() => checkSingleModel(model.id)}
                          disabled={checkingModel === model.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '0.25rem',
                            color: '#9ca3af',
                            fontSize: '0.75rem',
                            cursor: checkingModel === model.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          测试
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 错误提示 */}
            {errors.general && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '0.5rem',
                padding: '1rem',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircleIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                {errors.general}
              </div>
            )}

            {/* 成功提示 */}
            {success && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '0.5rem',
                padding: '1rem',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckIcon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                API配置保存成功！正在跳转到生成页面...
              </div>
            )}

            {/* 提交按钮 */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  background: 'linear-gradient(to right, #a855f7, #ec4899)',
                  color: 'white',
                  fontWeight: '500',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '保存中...' : success ? '配置成功！' : '保存配置'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/generate')}
                disabled={loading}
                style={{
                  padding: '0.875rem 1.5rem',
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  fontWeight: '500',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  fontSize: '1rem'
                }}
              >
                取消
              </button>
            </div>

            {/* 提示信息 */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              <p>API Key 将安全存储在本地浏览器中</p>
              {selectedProvider === 'volcengine' && (
                <p style={{ marginTop: '0.25rem', color: '#f59e0b' }}>
                  ⚠️ 火山方舟 API 不支持浏览器直接调用，建议使用 Aihubmix 或配置后端代理
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
