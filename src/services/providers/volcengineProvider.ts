/**
 * 火山方舟 API 供应商实现
 * 基于 volcengine 官方文档
 */

import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResponse, TaskStatus } from '../videoProvider';
import { getApiConfig } from '../localStorageService';
import { isAbortError } from './utils';

// ============================================================
// 模型配置映射
// ============================================================

const MODEL_ID_MAPPING: Record<string, string> = {
  'seedance-2.0': 'doubao-seedance-2-0-260128',
  'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
  'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
  'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128',
};

const RATIO_MAPPING: Record<string, string> = {
  'adaptive': 'adaptive',
  '21:9': '21:9',
  '16:9': '16:9',
  '4:3': '4:3',
  '1:1': '1:1',
  '3:4': '3:4',
  '9:16': '9:16',
};

const RESOLUTION_MAPPING: Record<string, string> = {
  '480p': '480p',
  '720p': '720p',
  '1080p': '1080p',
};

// ============================================================
// VolcengineProvider 类实现
// ============================================================

export class VolcengineProvider extends BaseVideoProvider {
  readonly name = 'volcengine';

  protected get apiKey(): string | null {
    const config = getApiConfig();
    return config.volcengineKey || null;
  }

  protected get endpoint(): string {
    // 火山方舟使用固定端点
    return 'https://ark.cn-beijing.volces.com';
  }

  /**
   * 创建视频生成任务
   * 严格按照官方文档实现
   */
  async createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // 1. 前置检查 - 验证API Key
      this.validateApiKey();

      // 2. 模型映射 - 获取模型ID
      const modelId = MODEL_ID_MAPPING[request.model] || request.model;

      // 3. Content构建 - 处理提示词和媒体文件
      const content = await this.buildContentArray(
        request.prompt,
        request.imageFiles,
        request.imageUrls,
        request.referenceMode
      );

      // 4. 参数确定 - 设置分辨率、比例等
      let resolution = request.resolution || '720p';
      if (request.model.includes('vip')) {
        resolution = '720p'; // VIP模型强制使用720p
      }

      const payload = {
        model: modelId,
        content: content,
        resolution: RESOLUTION_MAPPING[resolution] || '720p',
        ratio: RATIO_MAPPING[request.ratio] || '16:9',
        duration: request.duration,
        generate_audio: request.generateAudio !== false,
        seed: -1,
        watermark: false,
        camera_fixed: false
      };

      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('🚀 [VolcengineProvider] 发送真实 API 请求');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('📋 请求参数:');
      console.log('   ├─ 前端模型:', request.model);
      console.log('   ├─ API 模型 ID:', modelId);
      console.log('   ├─ URL:', `${this.endpoint}/api/v3/contents/generations/tasks`);
      console.log('   ├─ Method: POST');
      console.log('   ├─ Resolution:', payload.resolution);
      console.log('   ├─ Ratio:', payload.ratio);
      console.log('   ├─ Duration:', payload.duration + 's');
      console.log('   ├─ Generate Audio:', payload.generate_audio);
      console.log('   ├─ Image Files:', request.imageFiles?.length || 0);
      console.log('   ├─ Image URLs:', request.imageUrls?.length || 0);
      console.log('   ├─ Reference Mode:', request.referenceMode || 'none');
      console.log('   └─ Prompt:', request.prompt);
      console.log('');
      console.log('📦 完整 Payload (JSON):');
      console.log(JSON.stringify(payload, null, 2));
      console.log('');
      console.log('🔑 Headers (已隐藏 API Key):');
      console.log('   ├─ Content-Type: application/json');
      console.log('   ├─ Authorization: Bearer sk-***' + (this.apiKey?.slice(-8) || 'N/A'));
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // 5. API调用 - POST到官方API端点
      const apiUrl = `${this.endpoint}/api/v3/contents/generations/tasks`;

      const response = await this.fetchWithProxy(apiUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('');
        console.error('════════════════════════════════════════════════════════════════');
        console.error('❌ [VolcengineProvider] API 请求失败');
        console.error('   ├─ HTTP 状态:', response.status);
        console.error('   └─ 错误响应:', errorText);
        console.error('════════════════════════════════════════════════════════════════');
        console.error('');
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      // 6. 响应处理 - 返回taskId
      const data = await response.json();
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('✅ [VolcengineProvider] 任务创建成功');
      console.log('   └─ taskId:', data.id);
      console.log('');
      console.log('📦 API 响应数据 (JSON):');
      console.log(JSON.stringify(data, null, 2));
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      if (data.id) {
        return {
          success: true,
          taskId: data.id
        };
      } else {
        return {
          success: false,
          error: '未获取到任务ID'
        };
      }
    } catch (error) {
      console.error('❌ 生成视频失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成视频失败'
      };
    }
  }

  /**
   * 查询任务状态
   * @param taskId - 任务ID
   * @param signal - 可选的 AbortSignal，用于取消请求
   */
  async getTaskStatus(taskId: string, signal?: AbortSignal): Promise<TaskStatus> {
    try {
      // 1. 前置检查 - 验证API Key
      this.validateApiKey();

      // v6/v7/v8: 检查 signal 是否已中止
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // 2. URL构建
      const apiUrl = `${this.endpoint}/api/v3/contents/generations/tasks/${taskId}`;

      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('🔍 [VolcengineProvider] 查询任务状态');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('📋 查询参数:');
      console.log('   ├─ URL:', apiUrl);
      console.log('   ├─ Method: GET');
      console.log('   ├─ Headers: { "Authorization": "Bearer sk-***' + (this.apiKey?.slice(-8) || 'N/A') + '" }');
      console.log('   └─ taskId:', taskId);
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // 3. API调用 - GET请求，传递 signal
      const response = await this.fetchWithProxy(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal, // v6/v7/v8: 传递 signal 给 fetch
      });

      if (!response.ok) {
        throw new Error(`查询失败: ${response.status}`);
      }

      const data = await response.json();
      console.log('');
      console.log('📦 API 响应数据 (JSON):');
      console.log(JSON.stringify(data, null, 2));
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // 4. 状态映射 - 根据官方文档映射状态
      let status: TaskStatus['status'];
      switch (data.status) {
        case 'queued':
        case 'running':
          status = 'processing';
          break;
        case 'succeeded':
          status = 'completed';
          break;
        case 'failed':
        case 'expired':
          status = 'failed';
          break;
        case 'cancelled':
          status = 'failed';
          break;
        default:
          status = 'pending';
      }

      // 提取视频URL（支持多种响应格式）
      let videoUrl = null;
      if (data.result?.video_url) {
        videoUrl = data.result.video_url;
      } else if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.output?.video_url) {
        videoUrl = data.output.video_url;
      }

      return {
        status,
        videoUrl,
        error: data.error_message || data.message || data.error
      };
    } catch (error) {
      // v7/v8: 使用统一的 isAbortError 识别
      if (isAbortError(error)) {
        throw error; // 重新抛出 AbortError，让调用方处理
      }
      throw new Error(error instanceof Error ? error.message : '查询任务状态失败');
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      // 简单验证API Key格式
      return this.apiKey.startsWith('sk-') && this.apiKey.length >= 35;
    } catch {
      return false;
    }
  }
}
