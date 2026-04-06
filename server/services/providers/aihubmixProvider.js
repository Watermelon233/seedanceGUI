/**
 * Aihubmix聚合API实现
 * 第三方API聚合服务，提供多厂商视频生成能力
 *
 * 注意：此实现基于常见API格式，可能需要根据实际Aihubmix文档调整
 * 请参考Aihubmix官方文档确认具体的API端点和参数格式
 */

import VideoApiProvider from '../videoApiProvider.js';
import fetch from 'node-fetch';

class AihubmixProvider extends VideoApiProvider {
  constructor() {
    super();
    // 请根据实际Aihubmix文档修改这些端点
    this.apiBase = 'https://api.aihubmix.com/v1';
    this.generateEndpoint = '/video/generate';
    this.taskEndpoint = '/video/tasks';
  }

  getName() {
    return 'aihubmix';
  }

  getDisplayName() {
    return 'Aihubmix聚合API';
  }

  validateApiKey(apiKey) {
    // Aihubmix API Key格式验证（请根据实际情况调整）
    return typeof apiKey === 'string' && apiKey.length >= 10;
  }

  getModelMapping() {
    // Aihubmix可能使用不同的模型标识符（请根据实际文档调整）
    return {
      'seedance-2.0': 'seedance-2.0',
      'seedance-2.0-fast': 'seedance-2.0-fast',
      'seedance-2.0-vip': 'seedance-2.0-vip',
      'seedance-2.0-fast-vip': 'seedance-2.0-fast-vip'
    };
  }

  transformRequest(request) {
    const { prompt, model, ratio, duration, files, referenceMode } = request;

    // Aihubmix可能使用不同的请求格式（请根据实际文档调整）
    const requestBody = {
      model: this.getModelMapping()[model],
      prompt: prompt || '',
      aspect_ratio: ratio || '16:9',
      duration: parseInt(duration) || 5,
      generate_audio: true
    };

    // 处理图片素材
    if (files && files.length > 0) {
      requestBody.images = files.map(file => file.dataUrl || file.url);

      // 添加参考模式信息
      if (referenceMode !== '全能参考') {
        requestBody.reference_mode = referenceMode;
      }
    }

    return requestBody;
  }

  async createTask(apiKey, transformedRequest) {
    const url = `${this.apiBase}${this.generateEndpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          // Aihubmix可能需要额外的认证头
          'X-API-Key': apiKey
        },
        body: JSON.stringify(transformedRequest)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || data.error || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage
        };
      }

      // Aihubmix响应格式（请根据实际文档调整）
      return {
        success: true,
        taskId: data.task_id || data.id,
        status: data.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '创建任务失败'
      };
    }
  }

  async getTaskStatus(apiKey, taskId) {
    const url = `${this.apiBase}${this.taskEndpoint}/${taskId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || data.error || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage
        };
      }

      // Aihubmix状态响应格式
      return {
        success: true,
        status: data.status, // 请根据实际状态映射调整
        result: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '查询任务状态失败'
      };
    }
  }

  transformResponse(providerResponse) {
    // 转换Aihubmix响应为标准格式（请根据实际文档调整）
    if (providerResponse.status !== 'completed' && providerResponse.status !== 'succeeded') {
      return {
        created: Date.now(),
        data: []
      };
    }

    // Aihubmix响应格式（请根据实际文档调整）
    const videoUrl = providerResponse.result?.video_url ||
                    providerResponse.result?.output?.video_url;

    return {
      created: Date.now(),
      data: [
        {
          url: videoUrl || '',
          revised_prompt: providerResponse.result?.revised_prompt || ''
        }
      ]
    };
  }

  async testConnection(apiKey) {
    if (!this.validateApiKey(apiKey)) {
      return {
        success: false,
        error: 'API Key格式无效'
      };
    }

    // Aihubmix可能有专门的连接测试端点
    try {
      const response = await fetch(`${this.apiBase}/user/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey
        }
      });

      return {
        success: response.ok,
        error: response.ok ? null : 'API Key验证失败'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getSupportedReferenceModes() {
    // Aihubmix支持的参考模式（请根据实际情况调整）
    return ['全能参考', '首帧参考', '尾帧参考'];
  }

  getSupportedModels() {
    // Aihubmix支持的模型（请根据实际情况调整）
    return ['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-vip', 'seedance-2.0-fast-vip'];
  }
}

export default AihubmixProvider;