/**
 * API供应商注册表
 * 提供高级的供应商管理功能，包括配置、优先级、启用/禁用等
 *
 * 设计模式：注册表模式 + 配置管理
 */

import providerFactory from './providerFactory.js';

class ProviderRegistry {
  constructor() {
    if (ProviderRegistry.instance) {
      return ProviderRegistry.instance;
    }

    this.configurations = new Map();
    this.metrics = new Map(); // 性能指标统计
    this.initializeDefaultConfigurations();

    ProviderRegistry.instance = this;
  }

  /**
   * 初始化默认配置
   */
  initializeDefaultConfigurations() {
    const providers = providerFactory.getAllProviders();

    providers.forEach(provider => {
      this.configurations.set(provider.name, {
        enabled: true,
        priority: provider.name === 'volcengine' ? 100 : 50, // 官方API优先级最高
        maxConcurrent: 5, // 最大并发数
        timeout: 300000, // 超时时间（5分钟）
        retryCount: 3, // 重试次数
        retryDelay: 1000 // 重试延迟（1秒）
      });

      // 初始化性能指标
      this.metrics.set(provider.name, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastUsed: null,
        lastSuccess: null,
        lastFailure: null
      });
    });
  }

  /**
   * 获取供应商配置
   * @param {string} providerName - 供应商名称
   * @returns {object} 配置对象
   */
  getConfiguration(providerName) {
    return this.configurations.get(providerName) || {};
  }

  /**
   * 设置供应商配置
   * @param {string} providerName - 供应商名称
   * @param {object} config - 配置对象
   */
  setConfiguration(providerName, config) {
    const currentConfig = this.configurations.get(providerName) || {};
    this.configurations.set(providerName, { ...currentConfig, ...config });
  }

  /**
   * 启用或禁用供应商
   * @param {string} providerName - 供应商名称
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(providerName, enabled) {
    const config = this.configurations.get(providerName);
    if (config) {
      config.enabled = enabled;
      console.log(`Provider ${providerName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * 检查供应商是否启用
   * @param {string} providerName - 供应商名称
   * @returns {boolean} 是否启用
   */
  isEnabled(providerName) {
    const config = this.configurations.get(providerName);
    return config ? config.enabled : false;
  }

  /**
   * 设置供应商优先级
   * @param {string} providerName - 供应商名称
   * @param {number} priority - 优先级（数值越大优先级越高）
   */
  setPriority(providerName, priority) {
    const config = this.configurations.get(providerName);
    if (config) {
      config.priority = priority;
      console.log(`Provider ${providerName} priority set to ${priority}`);
    }
  }

  /**
   * 获取供应商优先级
   * @param {string} providerName - 供应商名称
   * @returns {number} 优先级
   */
  getPriority(providerName) {
    const config = this.configurations.get(providerName);
    return config ? config.priority : 0;
  }

  /**
   * 获取所有启用的供应商
   * @returns {Array<VideoApiProvider>} 启用的供应商列表
   */
  getEnabledProviders() {
    const allProviders = providerFactory.getAllProviders();
    return allProviders
      .filter(providerInfo => this.isEnabled(providerInfo.name))
      .sort((a, b) => this.getPriority(b.name) - this.getPriority(a.name))
      .map(providerInfo => providerFactory.getProvider(providerInfo.name));
  }

  /**
   * 根据优先级获取最佳供应商
   * @param {string} preferredProvider - 首选供应商（可选）
   * @returns {VideoApiProvider} 最佳供应商
   */
  getBestProvider(preferredProvider = null) {
    // 如果指定了首选供应商且启用，优先使用
    if (preferredProvider && this.isEnabled(preferredProvider)) {
      try {
        return providerFactory.getProvider(preferredProvider);
      } catch (error) {
        console.warn(`Preferred provider ${preferredProvider} not available, falling back to best enabled provider`);
      }
    }

    // 获取所有启用的供应商
    const enabledProviders = this.getEnabledProviders();

    if (enabledProviders.length === 0) {
      throw new Error('没有可用的API供应商');
    }

    // 按优先级排序并返回第一个
    return enabledProviders[0];
  }

  /**
   * 记录供应商使用指标
   * @param {string} providerName - 供应商名称
   * @param {object} metrics - 指标数据
   */
  recordMetrics(providerName, metrics) {
    const currentMetrics = this.metrics.get(providerName) || {};
    const updatedMetrics = {
      ...currentMetrics,
      ...metrics,
      lastUsed: new Date().toISOString()
    };

    this.metrics.set(providerName, updatedMetrics);
  }

  /**
   * 获取供应商指标
   * @param {string} providerName - 供应商名称
   * @returns {object} 指标数据
   */
  getMetrics(providerName) {
    return this.metrics.get(providerName) || {};
  }

  /**
   * 获取所有供应商的指标
   * @returns {object} 所有供应商的指标
   */
  getAllMetrics() {
    const allMetrics = {};
    this.metrics.forEach((metrics, providerName) => {
      allMetrics[providerName] = metrics;
    });
    return allMetrics;
  }

  /**
   * 重置供应商指标
   * @param {string} providerName - 供应商名称
   */
  resetMetrics(providerName) {
    const defaultMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: null,
      lastSuccess: null,
      lastFailure: null
    };
    this.metrics.set(providerName, defaultMetrics);
  }

  /**
   * 根据性能指标智能选择供应商
   * @returns {VideoApiProvider} 最佳性能供应商
   */
  getBestPerformanceProvider() {
    const enabledProviders = this.getEnabledProviders();
    if (enabledProviders.length === 0) {
      throw new Error('没有可用的API供应商');
    }

    // 根据成功率和平均响应时间选择
    let bestProvider = enabledProviders[0];
    let bestScore = -1;

    enabledProviders.forEach(provider => {
      const metrics = this.getMetrics(provider.getName());
      const successRate = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 0;

      // 综合评分：成功率权重0.7，响应时间权重0.3
      const score = (successRate * 0.7) +
                   ((1000 / (metrics.averageResponseTime || 1000)) * 0.3);

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  /**
   * 获取供应商统计信息
   * @returns {object} 统计信息
   */
  getStatistics() {
    const stats = {
      totalProviders: providerFactory.getProviderCount(),
      enabledProviders: this.getEnabledProviders().length,
      disabledProviders: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };

    this.metrics.forEach((metrics) => {
      stats.totalRequests += metrics.totalRequests || 0;
      stats.successfulRequests += metrics.successfulRequests || 0;
      stats.failedRequests += metrics.failedRequests || 0;
    });

    stats.disabledProviders = stats.totalProviders - stats.enabledProviders;
    stats.overallSuccessRate = stats.totalRequests > 0
      ? stats.successfulRequests / stats.totalRequests
      : 0;

    return stats;
  }
}

// 创建单例实例
const registry = new ProviderRegistry();

export default registry;
export { ProviderRegistry };