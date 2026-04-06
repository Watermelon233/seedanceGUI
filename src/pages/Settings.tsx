import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as settingsService from '../services/settingsService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<settingsService.AppSettings>({
    theme: 'light',
    language: 'zh-CN',
    defaultModel: 'seedance-2.0',
    defaultRatio: '16:9',
    defaultDuration: 5,
    showAdvancedOptions: false,
    autoSaveDrafts: true,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await settingsService.getSettings();
        setSettings(loadedSettings);
      } catch (error) {
        showMessage('error', `加载设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };

    loadSettings();
  }, []);

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 保存设置
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const cleanSettings: Record<string, string | number | boolean> = {};
      Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanSettings[key] = value as string | number | boolean;
        }
      });
      await settingsService.updateSettings(cleanSettings);
      setHasChanges(false);
      showMessage('success', '设置保存成功');
    } catch (error) {
      showMessage('error', `保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 重置设置
  const handleResetSettings = async () => {
    if (!confirm('确定要重置所有设置为默认值吗？')) {
      return;
    }

    setIsSaving(true);
    try {
      await settingsService.resetSettings();
      const resetSettings = await settingsService.getSettings();
      setSettings(resetSettings);
      setHasChanges(false);
      showMessage('success', '设置已重置为默认值');
    } catch (error) {
      showMessage('error', `重置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 更新设置项
  const updateSetting = (key: keyof settingsService.AppSettings, value: string | number | boolean) => {
    setSettings({ ...settings, [key]: value as any });
    setHasChanges(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      padding: '6rem 2rem 2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: 'linear-gradient(to right, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ⚙️ 应用设置
          </h1>
          <p style={{ color: '#9ca3af' }}>
            配置应用的默认参数和界面选项
          </p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: message.type === 'success'
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: message.type === 'success' ? '#22c55e' : '#ef4444',
          }}>
            {message.text}
          </div>
        )}

        {/* 界面设置 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid #374151',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            🎨 界面设置
          </h2>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* 主题设置 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                主题模式
              </label>
              <select
                value={settings.theme || 'light'}
                onChange={(e) => updateSetting('theme', e.target.value)}
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
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>

            {/* 语言设置 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                语言
              </label>
              <select
                value={settings.language || 'zh-CN'}
                onChange={(e) => updateSetting('language', e.target.value)}
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
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>

            {/* 高级选项显示 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>显示高级选项</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  在生成页面显示更多配置选项
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showAdvancedOptions || false}
                onChange={(e) => updateSetting('showAdvancedOptions', e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem' }}
              />
            </div>

            {/* 自动保存草稿 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>自动保存草稿</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  自动保存未完成的生成任务
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSaveDrafts !== false}
                onChange={(e) => updateSetting('autoSaveDrafts', e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem' }}
              />
            </div>
          </div>
        </div>

        {/* 默认生成参数 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid #374151',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            🎬 默认生成参数
          </h2>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* 默认模型 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                默认模型
              </label>
              <select
                value={settings.defaultModel || 'seedance-2.0'}
                onChange={(e) => updateSetting('defaultModel', e.target.value)}
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
                <option value="seedance-2.0">Seedance 2.0 (全能)</option>
                <option value="seedance-2.0-fast">Seedance 2.0 Fast (快速)</option>
                <option value="seedance-2.0-vip">Seedance 2.0 VIP (高清)</option>
                <option value="seedance-2.0-fast-vip">Seedance 2.0 Fast VIP (快速高清)</option>
              </select>
            </div>

            {/* 默认比例 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                默认宽高比
              </label>
              <select
                value={settings.defaultRatio || '16:9'}
                onChange={(e) => updateSetting('defaultRatio', e.target.value)}
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
                <option value="3:4">3:4 (竖版标准)</option>
              </select>
            </div>

            {/* 默认时长 */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                默认视频时长（秒）
              </label>
              <select
                value={settings.defaultDuration || 5}
                onChange={(e) => updateSetting('defaultDuration', parseInt(e.target.value))}
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
                <option value="3">3秒</option>
                <option value="5">5秒</option>
                <option value="10">10秒</option>
              </select>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={handleResetSettings}
            disabled={isSaving}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#1a1d2d',
              color: '#e5e7eb',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1
            }}
          >
            重置默认
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges || isSaving}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(to right, #a855f7, #ec4899)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: (!hasChanges || isSaving) ? 'not-allowed' : 'pointer',
              opacity: (!hasChanges || isSaving) ? 0.5 : 1
            }}
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>

        {/* 返回按钮 */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            ← 返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
