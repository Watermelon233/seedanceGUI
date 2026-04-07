/**
 * 视频生成供应商接口
 * 定义统一的API供应商抽象接口
 * 参考: doc/AIHUBMIX_VIDEO_GENERATION_FLOW.md
 */

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  imageFiles?: File[];
  imageUrls?: string[];
  referenceMode?: string;
  generateAudio?: boolean;
  resolution?: string;
}

// ============================================================
// 类型定义
// ============================================================

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  imageFiles?: File[];
  imageUrls?: string[];
  referenceMode?: string;
  generateAudio?: boolean;
  resolution?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  taskId?: string;
  videoUrl?: string;
  error?: string;
}

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

// ============================================================
// 抽象接口 - VideoProvider
// ============================================================

/**
 * 视频生成供应商接口
 * 所有API供应商必须实现此接口
 */
export interface VideoProvider {
  /**
   * 供应商名称
   */
  readonly name: string;

  /**
   * 创建视频生成任务
   * @param request 视频生成请求参数
   * @returns 生成任务响应，包含taskId
   */
  createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @param signal 可选的 AbortSignal，用于取消请求
   * @returns 任务状态信息
   */
  getTaskStatus(taskId: string, signal?: AbortSignal): Promise<TaskStatus>;

  /**
   * 测试API连接（可选）
   * @returns 连接是否成功
   */
  testConnection?(): Promise<boolean>;

  /**
   * 获取视频下载URL（可选）
   * @param taskId 任务ID
   * @returns 下载端点URL
   */
  getDownloadUrl?(taskId: string): string;

  /**
   * 下载视频内容（可选）
   * @param taskId 任务ID
   * @returns 视频二进制数据
   */
  downloadVideo?(taskId: string): Promise<Blob>;
}

// ============================================================
// 抽象基类 - BaseVideoProvider
// ============================================================

/**
 * 视频供应商抽象基类
 * 提供通用的辅助方法
 */
export abstract class BaseVideoProvider implements VideoProvider {
  abstract readonly name: string;
  protected abstract apiKey: string | null;
  protected abstract endpoint: string;

  /**
   * 前置检查 - 验证API Key
   */
  protected validateApiKey(): void {
    if (!this.apiKey) {
      throw new Error(`未配置${this.name} API Key`);
    }
  }

  /**
   * 构建认证头
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 直接发起请求（不使用CORS代理，因为代理不支持POST）
   */
  protected async fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
    console.log('[fetchWithProxy] 发起请求...');
    console.log('[fetchWithProxy] URL:', url);
    console.log('[fetchWithProxy] Method:', options.method);
    console.log('[fetchWithProxy] Headers:', JSON.stringify(options.headers, null, 2));
    console.log('[fetchWithProxy] Body length:', options.body ? JSON.stringify(options.body).length : 0);

    const startTime = Date.now();

    try {
      console.log('[fetchWithProxy] 调用原生 fetch...');
      const response = await fetch(url, options);
      const elapsed = Date.now() - startTime;
      console.log(`[fetchWithProxy] fetch 完成，耗时: ${elapsed}ms`);
      console.log('[fetchWithProxy] 响应状态:', response.status, response.statusText);
      console.log('[fetchWithProxy] 响应头:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      return response;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[fetchWithProxy] 请求失败，耗时: ${elapsed}ms`);
      console.error('[fetchWithProxy] 错误类型:', error?.constructor?.name);
      console.error('[fetchWithProxy] 错误信息:', error instanceof Error ? error.message : String(error));
      throw new Error(`请求失败: ${error instanceof Error ? error.message : '网络错误'}`);
    }
  }

  /**
   * 将文件转换为Base64编码
   */
  protected async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(`${result.split(',')[0]},${base64}`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 检测文件类型
   */
  protected detectMediaType(file: File): 'image' | 'audio' | 'video' {
    const fileType = file.type.toLowerCase();

    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.startsWith('video/')) return 'video';

    // 根据文件扩展名判断
    const ext = file.name.toLowerCase().split('.').pop();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];

    if (ext && imageExts.includes(ext)) return 'image';
    if (ext && audioExts.includes(ext)) return 'audio';
    if (ext && videoExts.includes(ext)) return 'video';

    return 'image'; // 默认
  }

  /**
   * 构建Content数组 - 虚函数，子类可覆盖
   */
  protected async buildContentArray(
    prompt: string,
    imageFiles?: File[],
    imageUrls?: string[],
    referenceMode?: string
  ): Promise<Array<any>> {
    const content: Array<any> = [];

    // 添加文本提示词
    content.push({
      type: 'text',
      text: prompt
    });

    // 准备媒体数据
    const mediaData: Array<{ url: string; type: string; index: number }> = [];

    // 处理上传的文件
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const base64 = await this.fileToBase64(file);
        const mediaType = this.detectMediaType(file);

        mediaData.push({ url: base64, type: mediaType, index: i + 1 });
      }
    }

    // 处理图片URL
    if (imageUrls && imageUrls.length > 0) {
      const startIndex = mediaData.length + 1;
      for (let i = 0; i < imageUrls.length; i++) {
        mediaData.push({ url: imageUrls[i], type: 'image', index: startIndex + i });
      }
    }

    // 添加所有媒体文件，根据类型设置role
    for (const media of mediaData) {
      if (media.type === 'image') {
        let role: string;

        // 根据参考模式设置 role，默认使用 reference_image
        if (referenceMode === '首帧参考' || referenceMode === '尾帧参考') {
          if (media.index === 1) {
            role = 'first_frame';
          } else if (media.index === 2) {
            role = 'last_frame';
          } else {
            role = 'reference_image';
          }
        } else if (referenceMode === '全能参考') {
          role = 'reference_image';
        } else {
          // 默认 role（API 要求必须有 role）
          role = 'reference_image';
        }

        content.push({
          type: 'image_url',
          image_url: { url: media.url },
          role
        });
      } else if (media.type === 'audio') {
        content.push({
          type: 'audio_url',
          audio_url: { url: media.url },
          role: 'reference_audio'
        });
      } else if (media.type === 'video') {
        content.push({
          type: 'video_url',
          video_url: { url: media.url },
          role: 'reference_video'
        });
      }
    }

    return content;
  }

  // 抽象方法，子类必须实现
  abstract createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  abstract getTaskStatus(taskId: string, signal?: AbortSignal): Promise<TaskStatus>;
}
