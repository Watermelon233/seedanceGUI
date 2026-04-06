/**
 * API供应商初始化和导出
 * 统一管理所有供应商的注册、初始化和导出
 */

import providerFactory from '../providerFactory.js';
import providerRegistry from '../providerRegistry.js';
import VolcengineProvider from './volcengineProvider.js';
import AihubmixProvider from './aihubmixProvider.js';

/**
 * 初始化所有API供应商
 * 在应用启动时调用此函数
 */
export function initializeProviders() {
  console.log('Initializing API providers...');

  try {
    // 注册火山方舟官方API
    providerFactory.registerProvider(new VolcengineProvider());

    // 注册Aihubmix聚合API
    providerFactory.registerProvider(new AihubmixProvider());

    console.log(`Successfully initialized ${providerFactory.getProviderCount()} API providers`);
    console.log('Available providers:', providerFactory.getAllProviders().map(p => `${p.name} (${p.displayName})`).join(', '));

    // 输出配置信息
    const stats = providerRegistry.getStatistics();
    console.log('Provider statistics:', stats);

  } catch (error) {
    console.error('Failed to initialize API providers:', error);
    throw error;
  }
}

/**
 * 获取供应商工厂实例
 * @returns {ProviderFactory} 供应商工厂
 */
export function getProviderFactory() {
  return providerFactory;
}

/**
 * 获取供应商注册表实例
 * @returns {ProviderRegistry} 供应商注册表
 */
export function getProviderRegistry() {
  return providerRegistry;
}

/**
 * 根据用户配置获取最佳供应商
 * @param {string} userProviderChoice - 用户选择的供应商
 * @param {boolean} usePerformanceBased - 是否使用性能最优的供应商
 * @returns {VideoApiProvider} 最佳供应商
 */
export function getBestProviderForUser(userProviderChoice = null, usePerformanceBased = false) {
  if (usePerformanceBased) {
    return providerRegistry.getBestPerformanceProvider();
  }

  return providerRegistry.getBestProvider(userProviderChoice);
}

/**
 * 验证API Key并获取对应的供应商
 * @param {string} apiKey - API密钥
 * @param {string} preferredProvider - 首选供应商（可选）
 * @returns {Promise<object>} 验证结果和供应商信息
 */
export async function validateApiKeyAndGetProvider(apiKey, preferredProvider = null) {
  try {
    const provider = preferredProvider
      ? providerFactory.getProvider(preferredProvider)
      : providerFactory.getProviderByApiKey(apiKey);

    const validation = await provider.validateApiKey(apiKey);

    return {
      success: validation.success,
      provider: provider.getName(),
      providerDisplayName: provider.getDisplayName(),
      error: validation.error
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 默认导出供应商工厂
export default providerFactory;