/**
 * Aihubmix API 供应商实现
 * 使用与火山引擎相同的参数格式
 *
 * API端点:
 * - 创建视频: POST /v1/videos
 * - 查询状态: GET /v1/videos/{video_id}
 * - 下载视频: GET /v1/videos/{video_id}/content
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
  'adaptive': '16:9',
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
// AihubmixProvider 类实现
// ============================================================

export class AihubmixProvider extends BaseVideoProvider {
  readonly name = 'aihubmix';

  protected get apiKey(): string | null {
    const config = getApiConfig();
    return config.aihubmixKey || null;
  }

  protected get endpoint(): string {
    const config = getApiConfig();
    return config.aihubmixEndpoint || 'https://aihubmix.com';
  }

  /**
   * 创建视频生成任务
   * 使用与火山引擎相同的参数格式
   */
  async createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    try {
      // 1. 前置检查 - 验证API Key
      this.validateApiKey();

      // 2. 模型映射 - 获取模型ID
      const modelId = MODEL_ID_MAPPING[request.model] || request.model;

      // 3. Content构建 - 处理提示词和媒体文件（参考火山引擎方式）
      const content = await this.buildContentArray(
        request.prompt,
        request.imageFiles,
        request.imageUrls,
        request.referenceMode
      );

      // 4. 参数确定 - 与火山引擎保持一致
      let resolution = request.resolution || '720p';
      if (request.model.includes('vip')) {
        resolution = '720p'; // VIP模型强制使用720p
      }

      const payload: any = {
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
      console.log('🚀 [AihubmixProvider] 发送真实 API 请求');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('📋 请求参数:');
      console.log('   ├─ 前端模型:', request.model);
      console.log('   ├─ API 模型 ID:', modelId);
      console.log('   ├─ URL:', `${this.endpoint}/v1/videos`);
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
      console.log('   ├─ Authorization: Bearer sk-***' + (this.apiKey?.slice(-8) || 'N/A') + ')');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // 5. API调用 - POST到 /v1/videos（使用本地代理避免 CORS）
      const apiUrl = `http://localhost:3002/api/v1/videos`;

      console.log('🚀 发起API请求...');
      console.log('URL:', apiUrl);
      console.log('endpoint:', this.endpoint);
      console.log('apiKey存在:', !!this.apiKey);
      console.log('apiKey前缀:', this.apiKey?.substring(0, 10));

      let response;
      try {
        console.log('[DEBUG] 开始 fetch...');
        response = await this.fetchWithProxy(apiUrl, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        console.log('[DEBUG] fetch 完成');
      } catch (fetchError) {
        console.error('[DEBUG] fetch 失败:', fetchError);
        throw fetchError;
      }

      console.log('📡 API HTTP 状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('');
        console.error('════════════════════════════════════════════════════════════════');
        console.error('❌ [AihubmixProvider] API 请求失败');
        console.error('   ├─ HTTP 状态:', response.status);
        console.error('   └─ 错误响应:', errorText);
        console.error('════════════════════════════════════════════════════════════════');
        console.error('');
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      // 6. 响应处理 - 返回 video_id (作为 taskId)
      const data = await response.json();
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('✅ [AihubmixProvider] 任务创建成功');
      console.log('   ├─ taskId:', data.id);
      console.log('   └─ videoUrl:', data.url || '(等待生成)');
      console.log('');
      console.log('📦 API 响应数据 (JSON):');
      console.log(JSON.stringify(data, null, 2));
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      if (!data.id) {
        console.error('❌ 响应中没有 id 字段!', data);
        throw new Error('API响应缺少任务ID');
      }

      return {
        success: true,
        taskId: data.id,  // video_id
        videoUrl: data.url
      };
    } catch (error) {
      console.error('❌ Aihubmix生成视频失败:', error);
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

      // 2. URL构建 - 使用本地代理
      const apiUrl = `http://localhost:3002/api/v1/videos/${taskId}`;

      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('🔍 [AihubmixProvider] 查询任务状态');
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

      console.log(`[AihubmixProvider] 查询响应 HTTP 状态: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AihubmixProvider] 查询失败响应:`, errorText);
        throw new Error(`查询失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('');
      console.log('📦 API 响应数据 (JSON):');
      console.log(JSON.stringify(data, null, 2));
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');

      // 4. 状态映射
      let status: TaskStatus['status'] = 'pending';
      if (data.status === 'in_progress' || data.status === 'queued') {
        status = 'processing';
      } else if (data.status === 'completed' || data.status === 'succeeded') {
        status = 'completed';
      } else if (data.status === 'failed') {
        status = 'failed';
      }

      console.log(`[AihubmixProvider] 映射后状态:`, status);

      return {
        status,
        videoUrl: data.url,
        error: data.error?.message || data.error
      };
    } catch (error) {
      // v7/v8: 使用统一的 isAbortError 识别
      if (isAbortError(error)) {
        throw error; // 重新抛出 AbortError，让调用方处理
      }
      console.error(`[AihubmixProvider] 查询任务状态异常:`, error);
      throw new Error(error instanceof Error ? error.message : '查询任务状态失败');
    }
  }

  /**
   * 获取视频下载URL
   */
  getDownloadUrl(taskId: string): string {
    return `${this.endpoint}/v1/videos/${taskId}/content`;
  }

  /**
   * 下载视频内容
   */
  async downloadVideo(taskId: string): Promise<Blob> {
    this.validateApiKey();

    const downloadUrl = this.getDownloadUrl(taskId);

    const response = await this.fetchWithProxy(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }

    return await response.blob();
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      return this.apiKey.startsWith('sk-') && this.apiKey.length >= 35;
    } catch {
      return false;
    }
  }
}
