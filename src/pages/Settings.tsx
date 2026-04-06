import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  API_PROVIDERS,
  MODEL_OPTIONS,
  type ApiProvider,
  type ApiProviderConfig
} from '../types/index';
import * as authService from '../services/authService';
import * as settingsService from '../services/settingsService';
import { GearIcon, CheckIcon, PlusIcon, SparkleIcon } from '../components/Icons';

export default function SettingsPage() {
  const { state, updateSettingsAction } = useApp();
  const { settings, currentUser } = state;

  // 基础设置
  const [localSettings, setLocalSettings] = useState({
    model: settings.model || 'seedance-2.0-fast',
    ratio: settings.ratio || '16:9',
    duration: settings.duration || '5',
    reference_mode: settings.reference_mode || '全能参考',
    download_path: settings.download_path || '',
    max_concurrent: settings.max_concurrent || '5',
    min_interval: settings.min_interval || '30000',
    max_interval: settings.max_interval || '50000',
  });

  // API供应商配置
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('volcengine');
  const [apiKeys, setApiKeys] = useState<Record<ApiProvider, string>>({
    volcengine: '',
    aihubmix: ''
  });
  const [keyNames, setKeyNames] = useState<Record<ApiProvider, string>>({
    volcengine: '火山方舟API密钥',
    aihubmix: 'Aihubmix API密钥'
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载用户API Key配置
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const keys = await authService.getApiKeys();
        setSelectedProvider(keys.defaultProvider);
        // 注意：出于安全考虑，我们不返回实际的API Key，只返回是否有Key
        // 用户需要重新输入来更新
      } catch (error) {
        console.error('加载API Key配置失败:', error);
      }
    };

    loadApiKeys();
  }, [currentUser]);

  // 保存基础设置
  const handleSaveBasicSettings = async () => {
    setIsSaving(true);
    try {
      await authService.updateSettings(localSettings);
      updateSettingsAction({ type: 'SET_SETTINGS', payload: localSettings });
      setHasChanges(false);
      alert('设置保存成功');
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 测试API Key连接
  const handleTestConnection = async () => {
    const apiKey = apiKeys[selectedProvider];

    if (!apiKey || !apiKey.trim()) {
      alert('请先输入API Key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await settingsService.testApiKey({
        provider: selectedProvider,
        apiKey: apiKey.trim()
      });
      setTestResult({
        success: result.success,
        message: result.success ? (result.message || '连接测试成功！') : (result.error || '连接测试失败')
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 保存API Key
  const handleSaveApiKey = async () => {
    const apiKey = apiKeys[selectedProvider];

    if (!apiKey || !apiKey.trim()) {
      alert('请输入API Key');
      return;
    }

    if (!authService.validateApiKeyFormat(apiKey.trim())) {
      alert('API Key格式无效，请检查后重试');
      return;
    }

    setIsSaving(true);
    try {
      await settingsService.saveApiKey({
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        keyName: keyNames[selectedProvider]
      });
      alert('API Key保存成功');

      // 重新加载API Key配置
      const keys = await authService.getApiKeys();
      setSelectedProvider(keys.defaultProvider);

      // 清空输入框
      setApiKeys({ ...apiKeys, [selectedProvider]: '' });
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 切换默认供应商
  const handleSetDefaultProvider = async (provider: ApiProvider) => {
    setIsSaving(true);
    try {
      await settingsService.setDefaultProvider(provider);
      setSelectedProvider(provider);
      alert(`已切换到 ${API_PROVIDERS.find(p => p.name === provider)?.displayName}`);
    } catch (error) {
      alert(`切换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">系统设置</h1>
          <div className="flex items-center gap-2">
            <GearIcon className="w-6 h-6 text-gray-400" />
            <span className="text-gray-400 text-sm">配置管理</span>
          </div>
        </div>

        {/* API供应商配置 */}
        <div className="mb-8 bg-[#1a1d2d] rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-purple-400" />
            API供应商配置
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            选择API供应商并配置对应的API Key，系统将使用您配置的供应商进行视频生成。
          </p>

          {/* 供应商选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              选择API供应商
            </label>
            <div className="grid grid-cols-2 gap-4">
              {API_PROVIDERS.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => setSelectedProvider(provider.name as ApiProvider)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === provider.name
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold mb-1">{provider.displayName}</div>
                  <div className="text-xs text-gray-400">{provider.description}</div>
                  {selectedProvider === provider.name && (
                    <div className="mt-2 flex items-center text-xs text-purple-400">
                      <CheckIcon className="w-4 h-4 mr-1" />
                      当前选中
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Key配置 */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                {API_PROVIDERS.find(p => p.name === selectedProvider)?.displayName} API Key
              </label>
              {selectedProvider !== 'volcengine' && (
                <button
                  onClick={() => handleSetDefaultProvider(selectedProvider)}
                  className="text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  设为默认
                </button>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="password"
                value={apiKeys[selectedProvider]}
                onChange={(e) => setApiKeys({ ...apiKeys, [selectedProvider]: e.target.value })}
                placeholder="请输入API Key (格式: sk_xxx...)"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <input
                type="text"
                value={keyNames[selectedProvider]}
                onChange={(e) => setKeyNames({ ...keyNames, [selectedProvider]: e.target.value })}
                placeholder="API密钥名称"
                className="w-48 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                {isSaving ? '保存中...' : '保存API Key'}
              </button>
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
              >
                {isTesting ? '测试中...' : '测试连接'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                testResult.success
                  ? 'bg-green-900/50 text-green-400 border border-green-800'
                  : 'bg-red-900/50 text-red-400 border border-red-800'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">API Key说明：</div>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 请妥善保管您的API Key，不要分享给他人</li>
                <li>• API Key将用于调用视频生成服务</li>
                <li>• 可以配置多个供应商的API Key，系统将使用默认供应商</li>
                <li>• 建议使用官方API获得最佳体验</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 基础设置 */}
        <div className="mb-8 bg-[#1a1d2d] rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">基础设置</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                默认模型
              </label>
              <select
                value={localSettings.model}
                onChange={(e) => {
                  setLocalSettings({ ...localSettings, model: e.target.value });
                  setHasChanges(true);
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                宽高比
              </label>
              <select
                value={localSettings.ratio}
                onChange={(e) => {
                  setLocalSettings({ ...localSettings, ratio: e.target.value as any });
                  setHasChanges(true);
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {RATIO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                视频时长（秒）
              </label>
              <select
                value={localSettings.duration}
                onChange={(e) => {
                  setLocalSettings({ ...localSettings, duration: e.target.value as any });
                  setHasChanges(true);
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {DURATION_OPTIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}秒
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                参考模式
              </label>
              <select
                value={localSettings.reference_mode}
                onChange={(e) => {
                  setLocalSettings({ ...localSettings, reference_mode: e.target.value as any });
                  setHasChanges(true);
                }}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {REFERENCE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveBasicSettings}
              disabled={!hasChanges || isSaving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isSaving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>

        {/* 用户信息 */}
        {currentUser && (
          <div className="bg-[#1a1d2d] rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">账户信息</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">邮箱：</span>
                <span className="ml-2">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-gray-400">角色：</span>
                <span className="ml-2">{currentUser.role === 'admin' ? '管理员' : '用户'}</span>
              </div>
              <div>
                <span className="text-gray-400">积分余额：</span>
                <span className="ml-2">{currentUser.credits}</span>
              </div>
              <div>
                <span className="text-gray-400">状态：</span>
                <span className="ml-2">{currentUser.status === 'active' ? '正常' : '已禁用'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}