import type {
  Settings,
  ApiResponse,
  JimengSessionAccount,
  JimengSessionAccountInput,
  EffectiveSessionResolution,
} from '../types/index';
import { getAuthHeaders } from './authService';

const API_BASE = '/api';

export interface SessionAccountsResponse {
  accounts: JimengSessionAccount[];
  effective: EffectiveSessionResolution;
}

/**
 * 获取全局设置
 */
export async function getSettings(): Promise<Settings> {
  const response = await fetch(`${API_BASE}/settings`);
  const result: ApiResponse<Settings> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '获取设置失败');
  }
  return result.data || {};
}

/**
 * 更新全局设置
 */
export async function updateSettings(
  settings: Record<string, string>
): Promise<Settings> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const result: ApiResponse<Settings> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '更新设置失败');
  }
  return result.data!;
}

export async function getSessionAccounts(): Promise<SessionAccountsResponse> {
  const response = await fetch(`${API_BASE}/settings/session-accounts`, {
    headers: getAuthHeaders(),
  });
  const result: ApiResponse<SessionAccountsResponse> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '获取 SessionID 列表失败');
  }
  return result.data!;
}

export async function createSessionAccount(
  input: JimengSessionAccountInput
): Promise<JimengSessionAccount> {
  const response = await fetch(`${API_BASE}/settings/session-accounts`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const result: ApiResponse<JimengSessionAccount> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '新增 SessionID 失败');
  }
  return result.data!;
}

export async function updateSessionAccount(
  id: number,
  input: Partial<JimengSessionAccountInput>
): Promise<JimengSessionAccount> {
  const response = await fetch(`${API_BASE}/settings/session-accounts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const result: ApiResponse<JimengSessionAccount> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '更新 SessionID 失败');
  }
  return result.data!;
}

export async function deleteSessionAccount(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/settings/session-accounts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.error || '删除 SessionID 失败');
  }
}

export async function testJimengSessionId(
  sessionId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/settings/session-accounts/test`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ sessionId }),
  });
  const result: ApiResponse<{
    success: boolean;
    message?: string;
    error?: string;
  }> = await response.json();
  return result;
}

// ============================================================
// API Key 管理功能（新增）
// ============================================================

export interface ApiKeyConfig {
  defaultProvider: string;
  volcengine: {
    hasKey: boolean;
    keyName: string | null;
  };
  aihubmix: {
    hasKey: boolean;
    keyName: string | null;
  };
}

export interface ApiKeyInput {
  provider: 'volcengine' | 'aihubmix';
  apiKey: string;
  keyName?: string;
}

/**
 * 获取用户的API Key配置
 */
export async function getApiKeyConfig(): Promise<ApiKeyConfig> {
  const response = await fetch(`${API_BASE}/settings/api-keys`, {
    headers: getAuthHeaders(),
  });
  const result: ApiResponse<ApiKeyConfig> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '获取API Key配置失败');
  }
  return result.data!;
}

/**
 * 保存或更新API Key
 */
export async function saveApiKey(input: ApiKeyInput): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/settings/api-keys`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const result: ApiResponse<{ success: boolean; message?: string }> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '保存API Key失败');
  }
  return result.data!;
}

/**
 * 删除API Key
 */
export async function deleteApiKey(provider: 'volcengine' | 'aihubmix'): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/settings/api-keys/${provider}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const result: ApiResponse<{ success: boolean }> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '删除API Key失败');
  }
  return result.data!;
}

/**
 * 测试API Key连接
 */
export async function testApiKey(input: ApiKeyInput): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/settings/api-keys/test`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });
  const result: ApiResponse<{
    success: boolean;
    message?: string;
    error?: string;
  }> = await response.json();
  return result;
}

/**
 * 设置默认API供应商
 */
export async function setDefaultProvider(provider: 'volcengine' | 'aihubmix'): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/settings/default-provider`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ provider }),
  });
  const result: ApiResponse<{ success: boolean }> = await response.json();
  if (!result.success) {
    throw new Error(result.error || '设置默认供应商失败');
  }
  return result.data!;
}

export default {
  getSettings,
  updateSettings,
  getSessionAccounts,
  createSessionAccount,
  updateSessionAccount,
  deleteSessionAccount,
  testJimengSessionId,
  // 新增的API Key管理功能
  getApiKeyConfig,
  saveApiKey,
  deleteApiKey,
  testApiKey,
  setDefaultProvider,
};
