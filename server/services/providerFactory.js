/**
 * API供应商工厂
 * 负责管理和提供所有API供应商实例
 *
 * 设计模式：工厂模式 + 单例模式
 */

import VolcengineProvider from './providers/volcengineProvider.js';
import AihubmixProvider from './providers/aihubmixProvider.js';

class ProviderFactory {
  constructor() {
    if (ProviderFactory.instance) {
      return ProviderFactory.instance;
    }

    this.providers = new Map();
    this.registerDefaultProviders();

    ProviderFactory.instance = this;
  }

  /**
   * 注册默认的API供应商
   */
  registerDefaultProviders() {
    // 注册火山方舟官方API
    this.registerProvider(new VolcengineProvider());

    // 注册Aihubmix聚合API
    this.registerProvider(new AihubmixProvider());
  }

  /**
   * 注册新的API供应商
   * @param {VideoApiProvider} provider - 供应商实例
   */
  registerProvider(provider) {
    const name = provider.getName();
    if (this.providers.has(name)) {
      console.warn(`Provider ${name} already registered, overwriting...`);
    }
    this.providers.set(name, provider);
    console.log(`Registered API provider: ${provider.getDisplayName()}`);
  }

  /**
   * 根据名称获取供应商
   * @param {string} name - 供应商名称
   * @returns {VideoApiProvider} 供应商实例
   */
  getProvider(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * 获取所有供应商信息
   * @returns {Array<{name: string, displayName: string}>} 供应商列表
   */
  getAllProviders() {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.getName(),
      displayName: provider.getDisplayName()
    }));
  }

  /**
   * 根据API Key格式自动识别供应商
   * @param {string} apiKey - API密钥
   * @returns {VideoApiProvider} 识别的供应商实例
   */
  getProviderByApiKey(apiKey) {
    // 根据API Key前缀或格式自动识别供应商
    if (typeof apiKey === 'string') {
      // Aihubmix API Key通常有特定前缀
      if (apiKey.startsWith('ahm_') || apiKey.startsWith('aihubmix_')) {
        return this.getProvider('aihubmix');
      }
    }

    // 默认使用官方API
    return this.getProvider('volcengine');
  }

  /**
   * 验证API Key是否有效
   * @param {string} apiKey - API密钥
   * @param {string} providerName - 供应商名称（可选）
   * @returns {Promise<object>} 验证结果 { success, error }
   */
  async validateApiKey(apiKey, providerName = null) {
    try {
      const provider = providerName
        ? this.getProvider(providerName)
        : this.getProviderByApiKey(apiKey);

      return await provider.testConnection(apiKey);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取默认供应商
   * @returns {VideoApiProvider} 默认供应商（官方API）
   */
  getDefaultProvider() {
    return this.getProvider('volcengine');
  }

  /**
   * 检查供应商是否已注册
   * @param {string} name - 供应商名称
   * @returns {boolean} 是否已注册
   */
  hasProvider(name) {
    return this.providers.has(name);
  }

  /**
   * 获取已注册供应商的数量
   * @returns {number} 供应商数量
   */
  getProviderCount() {
    return this.providers.size;
  }
}

// 创建单例实例
const factory = new ProviderFactory();

export default factory;
export { ProviderFactory };