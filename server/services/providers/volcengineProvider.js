/**
 * 火山方舟官方API实现
 * 基于官方API文档: https://www.volcengine.com/docs/82379/1520758
 *
 * API端点: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
 * 认证方式: Bearer Token (API Key)
 */

import VideoApiProvider from '../videoApiProvider.js';
import fetch from 'node-fetch';

class VolcengineProvider extends VideoApiProvider {
  constructor() {
    super();
    this.apiBase = 'https://ark.cn-beijing.volces.com/api/v3';
    this.endpoint = '/contents/generations/tasks';
  }

  getName() {
    return 'volcengine';
  }

  getDisplayName() {
    return '火山方舟官方API';
  }

  validateApiKey(apiKey) {
    // 官方API Key格式验证：通常是以akk开头的长字符串
    return typeof apiKey === 'string' && apiKey.length >= 20;
  }

  getModelMapping() {
    return {
      'seedance-2.0': 'doubao-seedance-2-0-260128',
      'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
      'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
      'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128'
    };
  }

  transformRequest(request) {
    const { prompt, model, ratio, duration, files, referenceMode } = request;

    // 构建content数组（官方API要求格式）
    const content = [];

    // 添加文本提示词
    if (prompt?.trim()) {
      content.push({
        type: 'text',
        text: prompt.trim()
      });
    }

    // 添加图片素材
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        let role = 'reference_image'; // 默认全能参考

        // 根据参考模式设置role
        if (referenceMode === '首帧参考' && index === 0) {
          role = 'first_frame';
        } else if (referenceMode === '尾帧参考' && index === 1) {
          role = 'last_frame';
        }

        content.push({
          type: 'image_url',
          image_url: {
            url: file.dataUrl || file.url // 支持Base64或URL
          },
          role: role
        });
      });
    }

    // 判断是否为VIP模型
    const isVipModel = model?.includes('vip');
    const baseModel = this.getModelMapping()[model] || this.getModelMapping()['seedance-2.0'];

    // 构建官方API请求体
    const requestBody = {
      model: baseModel,
      content: content,
      ratio: ratio || '16:9',
      duration: parseInt(duration) || 5,
      generate_audio: true,
      // VIP模型额外参数
      ...(isVipModel && {
        resolution: '720p'
      })
    };

    return requestBody;
  }

  async createTask(apiKey, transformedRequest) {
    const url = `${this.apiBase}${this.endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(transformedRequest)
      });

      const data = await response.json();

      if (!response.ok) {
        // 官方API错误格式: { error: { message: string, code: string } }
        const errorMessage = data.error?.message || data.message || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage
        };
      }

      // 官方API成功响应: { id: string, status: string, ... }
      return {
        success: true,
        taskId: data.id,
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
    const url = `${this.apiBase}${this.endpoint}/${taskId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage
        };
      }

      // 官方API状态响应格式
      return {
        success: true,
        status: data.status, // queued, running, succeeded, failed, expired
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
    // 转换官方API响应为标准格式
    if (providerResponse.status !== 'succeeded') {
      return {
        created: Date.now(),
        data: []
      };
    }

    // 官方API成功响应中的视频URL路径
    const videoUrl = providerResponse.result?.video_url;

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
    // 通过获取用户信息来测试连接
    // 官方API可能需要特定的测试端点，这里用简单的验证
    if (!this.validateApiKey(apiKey)) {
      return {
        success: false,
        error: 'API Key格式无效'
      };
    }

    // 尝试创建一个最简单的任务来验证连接
    const testRequest = {
      model: 'doubao-seedance-2-0-260128',
      content: [
        {
          type: 'text',
          text: 'test'
        }
      ],
      ratio: '16:9',
      duration: 4
    };

    try {
      const result = await this.createTask(apiKey, testRequest);
      // 即使创建失败，只要能连接上就认为连接测试通过
      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getSupportedReferenceModes() {
    // 官方API支持所有参考模式
    return ['全能参考', '首帧参考', '尾帧参考'];
  }

  getSupportedModels() {
    // 官方API支持所有模型
    return ['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-vip', 'seedance-2.0-fast-vip'];
  }
}

export default VolcengineProvider;