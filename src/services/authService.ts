import type { ApiProvider } from '../types';

const API_BASE = '/api';

// ============================================================
// API Key 管理
// ============================================================

/**
 * 获取存储的API Key
 */
export function getApiKey(): string | null {
  return localStorage.getItem('seedance_api_key');
}

/**
 * 设置API Key
 */
export function setApiKey(apiKey: string): void {
  localStorage.setItem('seedance_api_key', apiKey);
}

/**
 * 移除API Key
 */
export function removeApiKey(): void {
  localStorage.removeItem('seedance_api_key');
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
 * 获取认证头（使用API Key）
 */
export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('未配置API Key，请先在配置页面设置');
  }

  return {
    ...headers,
    'X-API-Key': apiKey,
  };
}

// ============================================================
// API 供应商管理
// ============================================================

/**
 * 获取当前选择的API供应商
 */
export function getApiProvider(): ApiProvider {
  const provider = localStorage.getItem('seedance_api_provider');
  return (provider as ApiProvider) || 'volcengine';
}

/**
 * 设置API供应商
 */
export function setApiProvider(provider: ApiProvider): void {
  localStorage.setItem('seedance_api_provider', provider);
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  removeApiKey();
  setApiProvider('volcengine'); // 重置为默认供应商
}

// ============================================================
// API Key 配置接口
// ============================================================

/**
 * 获取API Key配置
 */
export async function getApiKeys(): Promise<{
  volcengine: string | null;
  aihubmix: string | null;
  default: ApiProvider;
}> {
  const response = await fetch(`${API_BASE}/api-keys`);

  if (!response.ok) {
    throw new Error('获取API配置失败');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '获取API配置失败');
  }

  return data.data;
}

/**
 * 保存API Key配置
 */
export async function saveApiKeys(config: {
  volcengine?: string | null;
  aihubmix?: string | null;
  default?: ApiProvider;
}): Promise<void> {
  const response = await fetch(`${API_BASE}/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('保存API配置失败');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '保存API配置失败');
  }

  // 更新当前使用的Key
  if (config.default) {
    const selectedKey = config.default === 'volcengine' ? config.volcengine : config.aihubmix;
    if (selectedKey) {
      setApiKey(selectedKey);
    }
    setApiProvider(config.default);
  }
}