/**
 * 纯前端本地存储服务
 * 使用localStorage替代后端存储
 */

// ============================================================
// API Key 配置存储
// ============================================================

export interface ApiConfig {
  volcengineKey: string | null;
  aihubmixKey: string | null;
  defaultProvider: 'volcengine' | 'aihubmix';
}

const API_CONFIG_KEY = 'seedance_api_config';

/**
 * 获取API配置
 */
export function getApiConfig(): ApiConfig {
  try {
    const stored = localStorage.getItem(API_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('读取API配置失败:', error);
  }

  return {
    volcengineKey: null,
    aihubmixKey: null,
    defaultProvider: 'volcengine'
  };
}

/**
 * 保存API配置
 */
export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('保存API配置失败:', error);
    throw new Error('保存API配置失败');
  }
}

/**
 * 获取当前使用的API Key
 */
export function getCurrentApiKey(): string | null {
  const config = getApiConfig();
  if (config.defaultProvider === 'volcengine') {
    return config.volcengineKey;
  } else {
    return config.aihubmixKey;
  }
}

/**
 * 检查是否已配置API Key
 */
export function hasApiKey(): boolean {
  const config = getApiConfig();
  return !!(config.volcengineKey || config.aihubmixKey);
}

/**
 * 验证API Key格式
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.startsWith('sk_') && apiKey.length >= 35;
}

// ============================================================
// 用户设置存储
// ============================================================

export interface UserSettings {
  [key: string]: string;
}

const SETTINGS_KEY = 'seedance_user_settings';

/**
 * 获取用户设置
 */
export function getSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('读取设置失败:', error);
  }

  return {};
}

/**
 * 保存用户设置
 */
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

/**
 * 更新单个设置项
 */
export function updateSetting(key: string, value: string): void {
  const settings = getSettings();
  settings[key] = value;
  saveSettings(settings);
}

// ============================================================
// 清除所有数据
// ============================================================

/**
 * 清除所有本地数据
 */
export function clearAllData(): void {
  try {
    localStorage.removeItem(API_CONFIG_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem('seedance_tasks'); // 任务数据
  } catch (error) {
    console.error('清除数据失败:', error);
  }
}

/**
 * 导出数据（用于备份）
 */
export function exportData(): string {
  const data = {
    apiConfig: getApiConfig(),
    settings: getSettings(),
    tasks: localStorage.getItem('seedance_tasks')
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导入数据（用于恢复）
 */
export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);

    if (data.apiConfig) {
      saveApiConfig(data.apiConfig);
    }
    if (data.settings) {
      saveSettings(data.settings);
    }
    if (data.tasks) {
      localStorage.setItem('seedance_tasks', data.tasks);
    }

    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}