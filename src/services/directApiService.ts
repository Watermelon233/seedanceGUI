/**
 * 直接调用火山方舟官方API的服务
 * 严格按照官方文档实现
 * 文档: https://www.volcengine.com/docs/82379/1520758
 */

import { getApiConfig } from './localStorageService';

// ============================================================
// 类型定义
// ============================================================

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  imageFiles?: File[];
  imageUrls?: string[]; // 新增：支持图片URL
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
// CORS处理方案
// ============================================================

async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const corsProxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  // 先尝试直接请求
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
  } catch (error) {
    console.log('直接请求失败，尝试CORS代理');
  }

  // 尝试CORS代理
  for (const proxyUrl of corsProxies) {
    try {
      const response = await fetch(proxyUrl, options);
      if (response.ok) return response;
    } catch (error) {
      console.log(`代理 ${proxyUrl} 失败，尝试下一个`);
      continue;
    }
  }

  throw new Error('所有请求方式都失败了，可能是CORS限制或网络问题');
}

// ============================================================
// 文件处理工具
// ============================================================

/**
 * 将文件转换为Base64编码
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/xxx;base64,前缀，只保留base64编码部分
      const base64 = result.split(',')[1];
      resolve(`${result.split(',')[0]},${base64}`);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 构建content数组 - 支持混合媒体类型（图片+音频+视频）
 */
async function buildContentArray(
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

  // 准备媒体数据：支持文件和URL混合
  const mediaData: Array<{ url: string; type: string; index: number }> = [];

  // 处理上传的文件（支持图片、音频、视频）
  if (imageFiles && imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const base64 = await fileToBase64(file);

      // 检测文件类型
      const fileType = file.type.toLowerCase();
      let mediaType = 'image';

      if (fileType.startsWith('image/')) {
        mediaType = 'image';
      } else if (fileType.startsWith('audio/')) {
        mediaType = 'audio';
      } else if (fileType.startsWith('video/')) {
        mediaType = 'video';
      } else {
        // 根据文件扩展名判断
        const ext = file.name.toLowerCase().split('.').pop();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];

        if (ext && imageExts.includes(ext)) mediaType = 'image';
        else if (ext && audioExts.includes(ext)) mediaType = 'audio';
        else if (ext && videoExts.includes(ext)) mediaType = 'video';
      }

      mediaData.push({ url: base64, type: mediaType, index: i + 1 });
    }
  }

  // 处理图片URL（暂时只支持图片URL）
  if (imageUrls && imageUrls.length > 0) {
    const startIndex = mediaData.length + 1;
    for (let i = 0; i < imageUrls.length; i++) {
      mediaData.push({ url: imageUrls[i], type: 'image', index: startIndex + i });
    }
  }

  // 添加所有媒体文件，根据类型设置role
  for (const media of mediaData) {
    if (media.type === 'image') {
      let role: string | undefined;

      // 首尾帧参考模式：第1张=first_frame，第2张=last_frame
      if (referenceMode === '首帧参考' || referenceMode === '尾帧参考') {
        if (media.index === 1) {
          role = 'first_frame';
        } else if (media.index === 2) {
          role = 'last_frame';
        }
      } else if (referenceMode === '全能参考') {
        role = 'reference_image';
      }

      content.push({
        type: 'image_url',
        image_url: {
          url: media.url
        },
        ...(role && { role })
      });
    } else if (media.type === 'audio') {
      // 音频文件：使用 reference_audio role
      content.push({
        type: 'audio_url',
        audio_url: {
          url: media.url
        },
        role: 'reference_audio'
      });
    } else if (media.type === 'video') {
      // 视频文件：使用 reference_video role
      content.push({
        type: 'video_url',
        video_url: {
          url: media.url
        },
        role: 'reference_video'
      });
    }
  }

  return content;
}

// ============================================================
// 火山方舟API调用
// ============================================================

/**
 * 调用火山方舟官方API生成视频
 * 严格按照官方文档实现
 */
export async function generateVideoWithVolcengine(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const config = getApiConfig();
  if (!config.volcengineKey) {
    return { success: false, error: '未配置火山方舟API Key' };
  }

  try {
    // 获取模型ID
    const modelId = MODEL_ID_MAPPING[request.model] || request.model;

    // 构建content数组
    const content = await buildContentArray(
      request.prompt,
      request.imageFiles,
      request.imageUrls,
      request.referenceMode
    );

    // 确定分辨率
    let resolution = request.resolution || '720p';
    if (request.model.includes('vip')) {
      resolution = '720p'; // VIP模型强制使用720p
    }

    // 构建请求体（严格按照官方文档）
    const payload = {
      model: modelId,
      content: content,
      resolution: RESOLUTION_MAPPING[resolution] || '720p',
      ratio: RATIO_MAPPING[request.ratio] || '16:9',
      duration: request.duration,
      generate_audio: request.generateAudio !== false,
      seed: -1, // 随机种子
      watermark: false,
      camera_fixed: false
    };

    console.log('🚀 发送请求到火山方舟API:', JSON.stringify(payload, null, 2));

    // 调用官方API（v3版本）
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

    const response = await fetchWithProxy(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.volcengineKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ API响应:', data);

    // 返回任务ID
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

// ============================================================
// Aihubmix API调用（保持原有实现）
// ============================================================

/**
 * 调用Aihubmix API生成视频
 */
export async function generateVideoWithAihubmix(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const config = getApiConfig();
  const endpoint = config.aihubmixEndpoint || 'https://api.aihubmix.com';

  if (!config.aihubmixKey) {
    return { success: false, error: '未配置Aihubmix API Key' };
  }

  try {
    // Aihubmix使用火山方舟兼容接口
    const modelId = MODEL_ID_MAPPING[request.model] || request.model;

    const content = await buildContentArray(
      request.prompt,
      request.imageFiles,
      request.referenceMode
    );

    const payload = {
      model: modelId,
      content: content,
      resolution: '720p',
      ratio: RATIO_MAPPING[request.ratio] || '16:9',
      duration: request.duration,
      generate_audio: request.generateAudio !== false,
      seed: -1,
      watermark: false,
      camera_fixed: false
    };

    console.log('🚀 发送请求到Aihubmix API:', JSON.stringify(payload, null, 2));

    const apiUrl = `${endpoint}/v1/video/generate`;

    const response = await fetchWithProxy(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.aihubmixKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Aihubmix API响应:', data);

    return {
      success: true,
      taskId: data.id,
      videoUrl: data.video_url
    };
  } catch (error) {
    console.error('❌ Aihubmix生成视频失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成视频失败'
    };
  }
}

// ============================================================
// 统一的视频生成接口
// ============================================================

export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const config = getApiConfig();
  const apiKey = getCurrentApiKey();

  if (!apiKey) {
    return { success: false, error: '请先配置API Key' };
  }

  // 根据默认供应商选择API
  if (config.defaultProvider === 'volcengine') {
    return generateVideoWithVolcengine(request);
  } else {
    return generateVideoWithAihubmix(request);
  }
}

// ============================================================
// 任务状态查询
// ============================================================

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoUrl?: string;
  error?: string;
}

/**
 * 查询火山方舟任务状态
 */
export async function getVolcengineTaskStatus(taskId: string): Promise<TaskStatus> {
  const config = getApiConfig();
  const apiKey = config.volcengineKey;

  if (!apiKey) {
    throw new Error('未配置火山方舟API Key');
  }

  try {
    const apiUrl = `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`;

    const response = await fetchWithProxy(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`查询失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 任务状态:', data);

    // 根据官方文档映射状态
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
    throw new Error(error instanceof Error ? error.message : '查询任务状态失败');
  }
}

/**
 * 查询Aihubmix任务状态
 */
export async function getAihubmixTaskStatus(taskId: string): Promise<TaskStatus> {
  const config = getApiConfig();
  const endpoint = config.aihubmixEndpoint || 'https://api.aihubmix.com';
  const apiKey = config.aihubmixKey;

  if (!apiKey) {
    throw new Error('未配置Aihubmix API Key');
  }

  try {
    const apiUrl = `${endpoint}/v1/tasks/${taskId}`;

    const response = await fetchWithProxy(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`查询失败: ${response.status}`);
    }

    const data = await response.json();

    return {
      status: data.status || 'pending',
      videoUrl: data.video_url,
      error: data.error
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '查询任务状态失败');
  }
}

/**
 * 统一的任务状态查询
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const config = getApiConfig();

  if (config.defaultProvider === 'volcengine') {
    return getVolcengineTaskStatus(taskId);
  } else {
    return getAihubmixTaskStatus(taskId);
  }
}

// ============================================================
// 辅助功能
// ============================================================

/**
 * 获取当前API Key
 */
function getCurrentApiKey(): string | null {
  const config = getApiConfig();
  if (config.defaultProvider === 'volcengine') {
    return config.volcengineKey;
  } else {
    return config.aihubmixKey;
  }
}

/**
 * 验证视频URL格式
 */
function isValidVideoUrl(url: string): boolean {
  try {
    // 先检查特殊URL格式（不需要URL解析）
    const isDataURL = url.startsWith('data:video/');
    const isAssetUrl = url.startsWith('asset://');

    if (isDataURL || isAssetUrl) {
      return true;
    }

    // 检查HTTP/HTTPS URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // 检查是否为视频文件扩展名
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    const isVideoFile = videoExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));

    return isVideoFile;
  } catch {
    return false;
  }
}

/**
 * 生成智能文件名
 */
function generateVideoFilename(prompt?: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const dateStr = new Date(ts).toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19)
    .replace('T', '_');

  if (prompt && prompt.trim()) {
    // 从提示词提取关键词（前20个字符，只保留中文、英文、数字）
    const cleanPrompt = prompt
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
      .substring(0, 20)
      .trim();

    return cleanPrompt ? `${cleanPrompt}_${dateStr}.mp4` : `seedance_${dateStr}.mp4`;
  }

  return `seedance_${dateStr}.mp4`;
}

/**
 * 测试API连接
 */
export async function testApiConnection(provider: 'volcengine' | 'aihubmix'): Promise<boolean> {
  const config = getApiConfig();
  const apiKey = provider === 'volcengine' ? config.volcengineKey : config.aihubmixKey;

  if (!apiKey) {
    return false;
  }

  try {
    // 简单验证API Key格式
    return apiKey.startsWith('sk-') && apiKey.length >= 35;
  } catch (error) {
    return false;
  }
}

/**
 * 增强的视频下载功能
 */
export async function downloadVideo(
  videoUrl: string,
  filename?: string,
  prompt?: string
): Promise<void> {
  try {
    // 验证URL
    if (!videoUrl || !isValidVideoUrl(videoUrl)) {
      throw new Error('无效的视频URL格式');
    }

    console.log('🎬 开始下载视频:', videoUrl);

    const response = await fetchWithProxy(videoUrl);

    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }

    // 检查Content-Type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('video') && !contentType.includes('application/octet-stream')) {
      console.warn('⚠️ 警告: 响应可能不是视频文件', contentType);
    }

    const blob = await response.blob();

    // 检查文件大小
    const fileSize = blob.size / (1024 * 1024); // MB
    if (fileSize > 500) {
      console.warn(`⚠️ 警告: 文件大小 ${fileSize.toFixed(2)}MB，可能较大`);
    }

    // 生成文件名
    const finalFilename = filename || generateVideoFilename(prompt);

    // 创建下载链接
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    console.log('✅ 视频下载完成:', finalFilename);
  } catch (error) {
    console.error('❌ 视频下载失败:', error);
    throw new Error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
