import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyIcon, CheckIcon, AlertCircleIcon, SparkleIcon, EyeIcon, EyeOffIcon } from '../components/Icons';
import { validateApiKeyFormat, setApiKey, setApiProvider } from '../services/authService';

type ApiProvider = 'volcengine' | 'aihubmix';

interface ApiKeyFormData {
  volcengineKey: string;
  aihubmixKey: string;
  defaultProvider: ApiProvider;
}

export default function ApiKeyConfigPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ApiKeyFormData>({
    volcengineKey: '',
    aihubmixKey: '',
    defaultProvider: 'volcengine',
  });
  const [showKeys, setShowKeys] = useState({
    volcengine: false,
    aihubmix: false,
  });
  const [errors, setErrors] = useState<{
    volcengine?: string;
    aihubmix?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  // 加载已保存的 API Keys
  useEffect(() => {
    const loadSavedKeys = async () => {
      try {
        const response = await fetch('/api/api-keys');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFormData({
              volcengineKey: data.data.volcengine || '',
              aihubmixKey: data.data.aihubmix || '',
              defaultProvider: data.data.default || 'volcengine',
            });
          }
        }
      } catch (error) {
        console.error('加载API配置失败:', error);
      }
    };
    loadSavedKeys();
  }, []);

  const validateKey = (key: string, provider: ApiProvider): string | null => {
    if (!key.trim()) {
      return null; // 允许为空，但至少需要一个key
    }
    if (!validateApiKeyFormat(key)) {
      return `${provider === 'volcengine' ? '火山方舟' : 'Aihubmix'} API Key格式无效，应以'sk_'开头且长度≥35`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setTestResult({});

    // 验证至少配置一个API Key
    if (!formData.volcengineKey.trim() && !formData.aihubmixKey.trim()) {
      setErrors({ general: '请至少配置一个API Key' });
      return;
    }

    // 验证Key格式
    const newErrors: typeof errors = {};
    if (formData.volcengineKey.trim()) {
      const volError = validateKey(formData.volcengineKey, 'volcengine');
      if (volError) newErrors.volcengine = volError;
    }
    if (formData.aihubmixKey.trim()) {
      const aihubError = validateKey(formData.aihubmixKey, 'aihubmix');
      if (aihubError) newErrors.aihubmix = aihubError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 保存API Keys
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volcengine: formData.volcengineKey.trim() || null,
          aihubmix: formData.aihubmixKey.trim() || null,
          default: formData.defaultProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({ general: data.error || '保存API配置失败' });
        return;
      }

      // 保存成功，设置当前使用的Key
      const selectedKey = formData.defaultProvider === 'volcengine' ? formData.volcengineKey : formData.aihubmixKey;
      setApiKey(selectedKey);
      setApiProvider(formData.defaultProvider);

      setSuccess(true);
      setTestResult({ success: true, message: 'API配置保存成功！' });

      // 3秒后跳转到首页
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      setErrors({ general: '网络错误，请稍后重试' });
    }
  };

  const handleTestConnection = async (provider: ApiProvider) => {
    const key = provider === 'volcengine' ? formData.volcengineKey : formData.aihubmixKey;

    if (!key.trim()) {
      setTestResult({
        success: false,
        message: `请先输入${provider === 'volcengine' ? '火山方舟' : 'Aihubmix'} API Key`,
      });
      return;
    }

    const validationError = validateKey(key, provider);
    if (validationError) {
      setTestResult({ success: false, message: validationError });
      return;
    }

    setTesting(true);
    setTestResult({});

    try {
      // 这里可以调用真实的测试接口
      // 目前只做格式验证
      await new Promise(resolve => setTimeout(resolve, 1000));

      setTestResult({
        success: true,
        message: `${provider === 'volcengine' ? '火山方舟' : 'Aihubmix'} API Key格式验证通过`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接测试失败，请检查API Key是否正确',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <SparkleIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">配置 API Key</h1>
          <p className="text-gray-400">
            请配置您的视频生成API密钥以开始使用
          </p>
        </div>

        {/* 配置表单 */}
        <div className="bg-[#1a1d2d] rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 火山方舟 API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center justify-between">
                  <span>火山方舟 API Key</span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('volcengine')}
                    disabled={testing}
                    className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </button>
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys.volcengine ? 'text' : 'password'}
                  value={formData.volcengineKey}
                  onChange={(e) => setFormData({ ...formData, volcengineKey: e.target.value })}
                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#0f111a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-24"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys({ ...showKeys, volcengine: !showKeys.volcengine })}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKeys.volcengine ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <KeyIcon className="w-5 h-5 text-gray-500" />
                </div>
              </div>
              {errors.volcengine && (
                <p className="mt-1 text-sm text-red-400 flex items-center">
                  <AlertCircleIcon className="w-4 h-4 mr-1" />
                  {errors.volcengine}
                </p>
              )}
            </div>

            {/* Aihubmix API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center justify-between">
                  <span>Aihubmix API Key</span>
                  <button
                    type="button"
                    onClick={() => handleTestConnection('aihubmix')}
                    disabled={testing}
                    className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </button>
                </div>
              </label>
              <div className="relative">
                <input
                  type={showKeys.aihubmix ? 'text' : 'password'}
                  value={formData.aihubmixKey}
                  onChange={(e) => setFormData({ ...formData, aihubmixKey: e.target.value })}
                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#0f111a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-24"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys({ ...showKeys, aihubmix: !showKeys.aihubmix })}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showKeys.aihubmix ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <KeyIcon className="w-5 h-5 text-gray-500" />
                </div>
              </div>
              {errors.aihubmix && (
                <p className="mt-1 text-sm text-red-400 flex items-center">
                  <AlertCircleIcon className="w-4 h-4 mr-1" />
                  {errors.aihubmix}
                </p>
              )}
            </div>

            {/* 默认供应商选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                默认API供应商
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, defaultProvider: 'volcengine' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.defaultProvider === 'volcengine'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">火山方舟</div>
                  <div className="text-xs opacity-70 mt-1">官方API服务</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, defaultProvider: 'aihubmix' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.defaultProvider === 'aihubmix'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">Aihubmix</div>
                  <div className="text-xs opacity-70 mt-1">聚合API服务</div>
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-center">
                <AlertCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {errors.general}
              </div>
            )}

            {/* 成功提示 */}
            {success && testResult.success && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 flex items-center">
                <CheckIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                {testResult.message}
              </div>
            )}

            {/* 测试结果 */}
            {!success && testResult.message && (
              <div className={`rounded-lg p-4 flex items-center ${
                testResult.success
                  ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                  : 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400'
              }`}>
                {testResult.success ? (
                  <CheckIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                ) : (
                  <AlertCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                )}
                {testResult.message}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {success ? '配置成功！正在跳转...' : '保存配置'}
            </button>

            {/* 提示信息 */}
            <div className="text-center text-sm text-gray-500">
              <p>至少需要配置一个API Key才能使用</p>
              <p className="mt-1">API Key将安全存储在本地，不会上传到其他服务器</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}