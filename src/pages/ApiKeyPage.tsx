import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyIcon, CheckIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from '../components/Icons';
import {
  getApiConfig,
  saveApiConfig,
  hasApiKey,
  validateApiKeyFormat,
  getCurrentApiKey
} from '../services/localStorageService';

type ApiProvider = 'volcengine' | 'aihubmix';

export default function ApiKeyPage() {
  const navigate = useNavigate();
  const [volcengineKey, setVolcengineKey] = useState('');
  const [aihubmixKey, setAihubmixKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState<ApiProvider>('volcengine');
  const [showKeys, setShowKeys] = useState({ volcengine: false, aihubmix: false });
  const [errors, setErrors] = useState<{ volcengine?: string; aihubmix?: string; general?: string }>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载已保存的配置
  useEffect(() => {
    const config = getApiConfig();
    if (config.volcengineKey) setVolcengineKey(config.volcengineKey);
    if (config.aihubmixKey) setAihubmixKey(config.aihubmixKey);
    setDefaultProvider(config.defaultProvider);
  }, []);

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

    // 验证Key格式
    const newErrors: typeof errors = {};
    if (volcengineKey.trim() && !validateApiKeyFormat(volcengineKey)) {
      newErrors.volcengine = '火山方舟API Key格式无效';
    }
    if (aihubmixKey.trim() && !validateApiKeyFormat(aihubmixKey)) {
      newErrors.aihubmix = 'Aihubmix API Key格式无效';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // 保存配置到localStorage
      saveApiConfig({
        volcengineKey: volcengineKey.trim() || null,
        aihubmixKey: aihubmixKey.trim() || null,
        defaultProvider
      });

      setSuccess(true);

      // 2秒后跳转到首页
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setErrors({ general: '保存配置失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
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
            配置 API Key
          </h1>
          <p style={{ color: '#9ca3af' }}>
            请配置您的视频生成API密钥以开始使用
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
            {/* 火山方舟 API Key */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                火山方舟 API Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKeys.volcengine ? 'text' : 'password'}
                  value={volcengineKey}
                  onChange={(e) => setVolcengineKey(e.target.value)}
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
                  onClick={() => setShowKeys({ ...showKeys, volcengine: !showKeys.volcengine })}
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
                  {showKeys.volcengine ? <EyeOffIcon style={{ width: '1.25rem', height: '1.25rem' }} /> : <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
                </button>
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <KeyIcon style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
                </div>
              </div>
              {errors.volcengine && (
                <p style={{ marginTop: '0.25rem', color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircleIcon style={{ width: '1rem', height: '1rem' }} />
                  {errors.volcengine}
                </p>
              )}
            </div>

            {/* Aihubmix API Key */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                Aihubmix API Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKeys.aihubmix ? 'text' : 'password'}
                  value={aihubmixKey}
                  onChange={(e) => setAihubmixKey(e.target.value)}
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
                  onClick={() => setShowKeys({ ...showKeys, aihubmix: !showKeys.aihubmix })}
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
                  {showKeys.aihubmix ? <EyeOffIcon style={{ width: '1.25rem', height: '1.25rem' }} /> : <EyeIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
                </button>
                <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <KeyIcon style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
                </div>
              </div>
              {errors.aihubmix && (
                <p style={{ marginTop: '0.25rem', color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircleIcon style={{ width: '1rem', height: '1rem' }} />
                  {errors.aihubmix}
                </p>
              )}
            </div>

            {/* 默认供应商选择 */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                默认API供应商
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setDefaultProvider('volcengine')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '2px solid',
                    borderColor: defaultProvider === 'volcengine' ? '#a855f7' : '#374151',
                    backgroundColor: defaultProvider === 'volcengine' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                    color: defaultProvider === 'volcengine' ? '#e5e7eb' : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>火山方舟</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>官方API服务</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultProvider('aihubmix')}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '2px solid',
                    borderColor: defaultProvider === 'aihubmix' ? '#a855f7' : '#374151',
                    backgroundColor: defaultProvider === 'aihubmix' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                    color: defaultProvider === 'aihubmix' ? '#e5e7eb' : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>Aihubmix</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>聚合API服务</div>
                </button>
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
                API配置保存成功！正在跳转...
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #a855f7, #ec4899)',
                color: 'white',
                fontWeight: '500',
                padding: '0.75rem 1.5rem',
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

            {/* 提示信息 */}
            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              <p>至少需要配置一个API Key才能使用</p>
              <p style={{ marginTop: '0.25rem' }}>API Key将安全存储在本地浏览器中</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}