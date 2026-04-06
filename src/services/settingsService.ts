/**
 * 纯前端设置管理服务
 * 使用localStorage存储用户设置，无需后端服务器
 */

import { getSettings as getLocalSettings, saveSettings as saveLocalSettings } from './localStorageService';

// ============================================================
// 设置类型定义
// ============================================================

export interface AppSettings {
  // 主题设置
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh-CN' | 'en-US';

  // 视频生成默认参数
  defaultModel?: string;
  defaultRatio?: string;
  defaultDuration?: number;

  // 界面设置
  showAdvancedOptions?: boolean;
  autoSaveDrafts?: boolean;

  // 其他设置
  [key: string]: string | number | boolean | undefined;
}

// ============================================================
// 基础设置管理
// ============================================================

/**
 * 获取所有设置
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const settings = getLocalSettings();
    return settings as AppSettings;
  } catch (error) {
    console.error('获取设置失败:', error);
    return {};
  }
}

/**
 * 更新设置
 */
export async function updateSettings(settings: Record<string, string | number | boolean>): Promise<AppSettings> {
  try {
    const currentSettings = getLocalSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    saveLocalSettings(newSettings as any);
    return newSettings as AppSettings;
  } catch (error) {
    console.error('更新设置失败:', error);
    throw error;
  }
}

/**
 * 获取单个设置项
 */
export async function getSetting(key: keyof AppSettings): Promise<string | number | boolean | undefined> {
  try {
    const settings = getLocalSettings();
    return settings[key];
  } catch (error) {
    console.error(`获取设置项 ${key} 失败:`, error);
    return undefined;
  }
}

/**
 * 更新单个设置项
 */
export async function updateSetting(
  key: keyof AppSettings,
  value: string | number | boolean
): Promise<void> {
  try {
    const currentSettings = getLocalSettings();
    currentSettings[key] = value as any;
    saveLocalSettings(currentSettings);
  } catch (error) {
    console.error(`更新设置项 ${key} 失败:`, error);
    throw error;
  }
}

/**
 * 重置所有设置为默认值
 */
export async function resetSettings(): Promise<void> {
  try {
    const defaultSettings: AppSettings = {
      theme: 'light',
      language: 'zh-CN',
      defaultModel: 'seedance-2.0',
      defaultRatio: '16:9',
      defaultDuration: 5,
      showAdvancedOptions: false,
      autoSaveDrafts: true,
    };

    saveLocalSettings(defaultSettings as any);
  } catch (error) {
    console.error('重置设置失败:', error);
    throw error;
  }
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 获取主题设置
 */
export async function getTheme(): Promise<'light' | 'dark' | 'auto'> {
  const theme = await getSetting('theme');
  return (theme as 'light' | 'dark' | 'auto') || 'light';
}

/**
 * 设置主题
 */
export async function setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
  await updateSetting('theme', theme);
}

/**
 * 获取语言设置
 */
export async function getLanguage(): Promise<'zh-CN' | 'en-US'> {
  const language = await getSetting('language');
  return (language as 'zh-CN' | 'en-US') || 'zh-CN';
}

/**
 * 设置语言
 */
export async function setLanguage(language: 'zh-CN' | 'en-US'): Promise<void> {
  await updateSetting('language', language);
}

/**
 * 获取默认模型
 */
export async function getDefaultModel(): Promise<string> {
  const model = await getSetting('defaultModel');
  return model as string || 'seedance-2.0';
}

/**
 * 设置默认模型
 */
export async function setDefaultModel(model: string): Promise<void> {
  await updateSetting('defaultModel', model);
}

/**
 * 获取默认比例
 */
export async function getDefaultRatio(): Promise<string> {
  const ratio = await getSetting('defaultRatio');
  return ratio as string || '16:9';
}

/**
 * 设置默认比例
 */
export async function setDefaultRatio(ratio: string): Promise<void> {
  await updateSetting('defaultRatio', ratio);
}

/**
 * 获取默认时长
 */
export async function getDefaultDuration(): Promise<number> {
  const duration = await getSetting('defaultDuration');
  return (duration as number) || 5;
}

/**
 * 设置默认时长
 */
export async function setDefaultDuration(duration: number): Promise<void> {
  await updateSetting('defaultDuration', duration);
}

// ============================================================
// 已废弃的方法（保留接口兼容性）
// ============================================================

/**
 * Session账号管理 - 已废弃
 * @deprecated
 */
export async function getSessionAccounts(): Promise<any> {
  console.warn('getSessionAccounts已废弃（纯前端版本无Session管理）');
  return { accounts: [], effective: null };
}

/**
 * 创建Session账号 - 已废弃
 * @deprecated
 */
export async function createSessionAccount(): Promise<any> {
  console.warn('createSessionAccount已废弃');
  throw new Error('此方法已废弃');
}

/**
 * 更新Session账号 - 已废弃
 * @deprecated
 */
export async function updateSessionAccount(): Promise<any> {
  console.warn('updateSessionAccount已废弃');
  throw new Error('此方法已废弃');
}

/**
 * 删除Session账号 - 已废弃
 * @deprecated
 */
export async function deleteSessionAccount(): Promise<void> {
  console.warn('deleteSessionAccount已废弃');
  throw new Error('此方法已废弃');
}

/**
 * 测试SessionID - 已废弃
 * @deprecated
 */
export async function testJimengSessionId(): Promise<any> {
  console.warn('testJimengSessionId已废弃');
  throw new Error('此方法已废弃');
}

/**
 * API Key配置管理 - 已废弃，请使用authService
 * @deprecated
 */
export async function getApiKeyConfig(): Promise<any> {
  console.warn('getApiKeyConfig已废弃，请使用authService');
  throw new Error('此方法已废弃，请使用authService');
}

/**
 * 保存API Key - 已废弃，请使用authService
 * @deprecated
 */
export async function saveApiKey(): Promise<any> {
  console.warn('saveApiKey已废弃，请使用authService');
  throw new Error('此方法已废弃，请使用authService');
}

/**
 * 删除API Key - 已废弃，请使用authService
 * @deprecated
 */
export async function deleteApiKey(): Promise<any> {
  console.warn('deleteApiKey已废弃，请使用authService');
  throw new Error('此方法已废弃，请使用authService');
}

/**
 * 测试API Key - 已废弃，请使用authService
 * @deprecated
 */
export async function testApiKey(): Promise<any> {
  console.warn('testApiKey已废弃，请使用authService');
  throw new Error('此方法已废弃，请使用authService');
}

/**
 * 设置默认供应商 - 已废弃，请使用authService
 * @deprecated
 */
export async function setDefaultProvider(): Promise<any> {
  console.warn('setDefaultProvider已废弃，请使用authService');
  throw new Error('此方法已废弃，请使用authService');
}

export default {
  getSettings,
  updateSettings,
  getSetting,
  updateSetting,
  resetSettings,
  getTheme,
  setTheme,
  getLanguage,
  setLanguage,
  getDefaultModel,
  setDefaultModel,
  getDefaultRatio,
  setDefaultRatio,
  getDefaultDuration,
  setDefaultDuration,
};
