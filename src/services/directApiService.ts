/**
 * 直接调用第三方API的服务
 * 处理CORS问题和API调用逻辑
 */

import { getCurrentApiKey, getApiConfig } from './localStorageService';

// ============================================================
// CORS处理方案
// ============================================================

/**
 * 使用CORS代理发起请求
 */
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
// 视频生成API
// ============================================================

export interface VideoGenerationRequest {
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  imageFiles?: File[];
}

export interface VideoGenerationResponse {
  success: boolean;
  taskId?: string;
  videoUrl?: string;
  error?: string;
}

/**
 * 调用火山方舟API生成视频
 */
export async function generateVideoWithVolcengine(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const config = getApiConfig();
  if (!config.volcengineKey) {
    return { success: false, error: '未配置火山方舟API Key' };
  }

  try {
    // 注意：这里需要根据实际的火山方舟API文档调整
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v1/video/generate';

    const payload = {
      prompt: request.prompt,
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
      // 添加其他必要参数
    };

    const response = await fetchWithProxy(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.volcengineKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      taskId: data.task_id,
      videoUrl: data.video_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成视频失败'
    };
  }
}

/**
 * 调用Aihubmix API生成视频
 */
export async function generateVideoWithAihubmix(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const config = getApiConfig();
  if (!config.aihubmixKey) {
    return { success: false, error: '未配置Aihubmix API Key' };
  }

  try {
    // 注意：这里需要根据实际的Aihubmix API文档调整
    const apiUrl = 'https://api.aihubmix.com/v1/video/generate';

    const payload = {
      prompt: request.prompt,
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
    };

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

    return {
      success: true,
      taskId: data.task_id,
      videoUrl: data.video_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成视频失败'
    };
  }
}

/**
 * 统一的视频生成接口
 */
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
 * 查询任务状态
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const config = getApiConfig();
  const apiKey = getCurrentApiKey();

  if (!apiKey) {
    throw new Error('未配置API Key');
  }

  try {
    let apiUrl = '';
    if (config.defaultProvider === 'volcengine') {
      apiUrl = `https://ark.cn-beijing.volces.com/api/v1/tasks/${taskId}`;
    } else {
      apiUrl = `https://api.aihubmix.com/v1/tasks/${taskId}`;
    }

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
      status: data.status,
      progress: data.progress,
      videoUrl: data.video_url,
      error: data.error,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '查询任务状态失败');
  }
}

// ============================================================
// 辅助功能
// ============================================================

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
    // 这里应该调用实际的测试接口
    // 暂时只验证API Key格式
    return apiKey.startsWith('sk_') && apiKey.length >= 35;
  } catch (error) {
    return false;
  }
}

/**
 * 下载视频到本地
 */
export async function downloadVideo(videoUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetchWithProxy(videoUrl);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}