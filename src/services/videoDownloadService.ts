/**
 * 视频下载服务
 * 使用 fetch + blob 方式下载，支持认证
 * 注意: 下载进度在浏览器环境中不可靠，暂不实现
 */

import { getApiConfig } from './localStorageService';

export interface DownloadOptions {
  filename?: string;
  signal?: AbortSignal;
}

/**
 * 从代理 URL 下载视频
 * @param taskId - 任务 ID
 * @param options - 下载选项
 */
export async function downloadVideoFromProxy(
  taskId: string,
  options: DownloadOptions = {}
): Promise<void> {
  const config = getApiConfig();
  const apiKey = config.aihubmixKey || config.volcengineKey;

  if (!apiKey) {
    throw new Error('未配置API Key，无法下载视频');
  }

  // 构建代理 URL
  const proxyUrl = `http://localhost:3002/api/v1/videos/${taskId}/content?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5分钟超时

  options.signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }

    // 获取文件名（从 Content-Disposition 或使用默认值）
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = extractFilename(contentDisposition) || options.filename || `seedance_video_${taskId}.mp4`;

    // 读取响应为 blob
    const blob = await response.blob();

    // 触发下载
    triggerDownload(blob, filename);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('下载超时或被取消');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 从 Content-Disposition 头提取文件名
 * 格式: attachment; filename="video.mp4" 或 attachment; filename=video.mp4
 */
function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  // 匹配 filename="xxx" 或 filename=xxx
  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match && match[1]) {
    let filename = match[1].replace(/['"]/g, '');
    // 处理 UTF-8 编码的文件名
    if (filename.startsWith('UTF-8')) {
      const utfMatch = filename.match(/UTF-8''(.+)/);
      if (utfMatch) {
        filename = decodeURIComponent(utfMatch[1]);
      }
    }
    return filename;
  }

  return null;
}

/**
 * 触发浏览器下载
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  // 延迟清理，确保下载开始
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * 从视频 URL 提取任务 ID
 * 支持: aihubmix.com/v1/videos/{taskId}/content
 *       代理 URL: /api/v1/videos/{taskId}/content
 */
export function extractTaskId(videoUrl: string): string | null {
  if (!videoUrl) return null;

  // 匹配 aihubmix 格式
  const aihubmixMatch = videoUrl.match(/\/v1\/videos\/(.+)\/content/);
  if (aihubmixMatch) return aihubmixMatch[1];

  // 匹配代理格式
  const proxyMatch = videoUrl.match(/\/api\/v1\/videos\/(.+)\/content/);
  if (proxyMatch) return proxyMatch[1];

  return null;
}

export default {
  downloadVideoFromProxy,
  extractTaskId,
};
