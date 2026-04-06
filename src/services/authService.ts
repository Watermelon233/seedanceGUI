/**
 * 纯前端认证服务
 * 使用localStorage管理API Key，无需后端服务器
 */

import { getApiConfig, saveApiConfig } from './localStorageService';

// ============================================================
// API Key 管理
// ============================================================

/**
 * 获取当前API Key
 */
export function getApiKey(): string | null {
  const config = getApiConfig();
  if (config.defaultProvider === 'volcengine') {
    return config.volcengineKey;
  } else {
    return config.aihubmixKey;
  }
}

/**
 * 设置API Key（自动选择供应商）
 */
export function setApiKey(apiKey: string, provider?: 'volcengine' | 'aihubmix'): void {
  const config = getApiConfig();

  if (provider) {
    // 设置指定供应商的Key
    if (provider === 'volcengine') {
      config.volcengineKey = apiKey;
    } else {
      config.aihubmixKey = apiKey;
    }
    // 设置该供应商为默认
    config.defaultProvider = provider;
  } else {
    // 设置当前默认供应商的Key
    if (config.defaultProvider === 'volcengine') {
      config.volcengineKey = apiKey;
    } else {
      config.aihubmixKey = apiKey;
    }
  }

  saveApiConfig(config);
}

/**
 * 移除API Key
 */
export function removeApiKey(): void {
  const config = getApiConfig();

  if (config.defaultProvider === 'volcengine') {
    config.volcengineKey = null;
  } else {
    config.aihubmixKey = null;
  }

  saveApiConfig(config);
}

/**
 * 检查是否已配置API Key
 */
export function hasApiKey(): boolean {
  return !!getApiKey();
}

/**
 * 验证API Key格式
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.startsWith('sk_') && apiKey.length >= 35;
}

/**
 * 获取认证头（直接返回API Key）
 */
export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('未配置API Key，请先在配置页面设置');
  }

  return {
    ...headers,
    'Authorization': `Bearer ${apiKey}`,
  };
}

// ============================================================
// API 供应商管理
// ============================================================

/**
 * 获取当前API供应商
 */
export function getApiProvider(): 'volcengine' | 'aihubmix' {
  const config = getApiConfig();
  return config.defaultProvider;
}

/**
 * 设置API供应商
 */
export function setApiProvider(provider: 'volcengine' | 'aihubmix'): void {
  const config = getApiConfig();
  config.defaultProvider = provider;
  saveApiConfig(config);
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  const config = getApiConfig();
  config.volcengineKey = null;
  config.aihubmixKey = null;
  config.defaultProvider = 'volcengine';
  saveApiConfig(config);
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 获取火山方舟API Key
 */
export function getVolcengineKey(): string | null {
  const config = getApiConfig();
  return config.volcengineKey;
}

/**
 * 获取Aihubmix API Key
 */
export function getAihubmixKey(): string | null {
  const config = getApiConfig();
  return config.aihubmixKey;
}

/**
 * 设置火山方舟API Key
 */
export function setVolcengineKey(apiKey: string): void {
  const config = getApiConfig();
  config.volcengineKey = apiKey;
  saveApiConfig(config);
}

/**
 * 设置Aihubmix API Key
 */
export function setAihubmixKey(apiKey: string): void {
  const config = getApiConfig();
  config.aihubmixKey = apiKey;
  saveApiConfig(config);
}

export default {
  getApiKey,
  setApiKey,
  removeApiKey,
  hasApiKey,
  validateApiKeyFormat,
  getAuthHeaders,
  getApiProvider,
  setApiProvider,
  clearAuth,
  getVolcengineKey,
  getAihubmixKey,
  setVolcengineKey,
  setAihubmixKey,
};
