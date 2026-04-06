/**
 * 供应商工厂
 * 根据配置创建对应的供应商实例
 */

import { VideoProvider } from '../videoProvider';
import { AihubmixProvider } from './aihubmixProvider';
import { VolcengineProvider } from './volcengineProvider';
import { MockProvider } from './mockProvider';
import { ApiProvider } from '../../types';
import { getApiConfig } from '../localStorageService';

/**
 * 检查是否为 Mock 模式
 */
function isMockMode(): boolean {
  const mockEnv = import.meta.env.VITE_MOCK_API;
  return mockEnv === 'true' || mockEnv === true;
}

// ============================================================
// ProviderFactory 类
// ============================================================

export class ProviderFactory {
  private static providers: Map<ApiProvider, VideoProvider> = new Map();

  /**
   * 获取指定供应商的实例
   * @param provider 供应商类型
   * @returns VideoProvider 实例
   */
  static getProvider(provider?: ApiProvider): VideoProvider {
    // Mock 模式：不缓存，每次返回新实例
    if (isMockMode()) {
      console.log('[ProviderFactory] 使用 Mock Provider');
      return new MockProvider();
    }

    const config = getApiConfig();
    const providerType = provider || config.defaultProvider || 'volcengine';

    // 如果已有实例，直接返回
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    // 创建新实例
    let providerInstance: VideoProvider;

    switch (providerType) {
      case 'aihubmix':
        providerInstance = new AihubmixProvider();
        break;
      case 'volcengine':
        providerInstance = new VolcengineProvider();
        break;
      default:
        throw new Error(`不支持的供应商类型: ${providerType}`);
    }

    // 缓存实例
    this.providers.set(providerType, providerInstance);

    return providerInstance;
  }

  /**
   * 获取当前默认供应商
   * @returns 默认供应商实例
   */
  static getDefaultProvider(): VideoProvider {
    const config = getApiConfig();
    return this.getProvider(config.defaultProvider);
  }

  /**
   * 清除缓存的供应商实例
   * 用于配置更新后重新创建实例
   */
  static clearCache(): void {
    this.providers.clear();
  }

  /**
   * 测试供应商连接
   * @param provider 供应商类型
   * @returns 连接是否成功
   */
  static async testConnection(provider?: ApiProvider): Promise<boolean> {
    const providerInstance = this.getProvider(provider);

    if (providerInstance.testConnection) {
      return providerInstance.testConnection();
    }

    return false;
  }
}

// ============================================================
// 导出便捷函数
// ============================================================

/**
 * 获取视频供应商实例
 */
export function getVideoProvider(provider?: ApiProvider): VideoProvider {
  return ProviderFactory.getProvider(provider);
}

/**
 * 获取默认视频供应商实例
 */
export function getDefaultVideoProvider(): VideoProvider {
  return ProviderFactory.getDefaultProvider();
}
