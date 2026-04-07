/**
 * 临时文件托管服务 (tempfile.org)
 * 修复: 使用 XMLHttpRequest 支持上传进度
 * 仅用于图片上传，视频不使用此服务
 */

export interface TempFileResult {
  url: string;
  deleteUrl?: string;
  filename?: string;
  size?: number;
  expiry?: number;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  maxSize?: number;
  expiry?: number;
}

const TEMPFILE_API = 'https://tempfile.org/api';
const MAX_DEFAULT_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * 上传本地文件到 tempfile.org
 * 使用 XMLHttpRequest 支持上传进度
 */
export function uploadLocalFile(
  file: File,
  options: UploadOptions = {}
): Promise<TempFileResult> {
  const { maxSize = MAX_DEFAULT_SIZE, expiry = 24, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    // 验证文件大小
    if (file.size > maxSize) {
      reject(new Error(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，最大支持 ${maxSize / 1024 / 1024}MB`));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('expires', expiry.toString());

    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    // 监听完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.url || data.file_url || data.link,
            deleteUrl: data.delete_url || data.deleteUrl,
            filename: data.filename || file.name,
            size: file.size,
            expiry,
          });
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    });

    // 监听错误
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    // 支持取消
    signal?.addEventListener('abort', () => {
      xhr.abort();
    });

    xhr.open('POST', `${TEMPFILE_API}/upload/local`);
    xhr.send(formData);
  });
}

/**
 * 从 URL 导入到 tempfile.org
 * 仅支持公开可访问的 URL
 */
export async function importFromUrl(
  url: string,
  options: UploadOptions = {}
): Promise<TempFileResult> {
  try {
    const response = await fetch(`${TEMPFILE_API}/upload/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, expires: options.expiry || 24 }),
    });

    if (!response.ok) {
      throw new Error(`URL导入失败: HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      url: data.url || data.file_url,
      filename: data.filename,
      expiry: options.expiry || 24,
    };
  } catch (error) {
    console.error('URL导入失败:', error);
    throw error;
  }
}

/**
 * 将 base64 转换为 File 对象
 */
export function base64ToFile(
  base64: string,
  filename: string = 'image.png'
): File {
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的 base64 格式');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  const blob = new Blob(byteArrays, { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * 上传 base64 图片
 */
export async function uploadBase64Image(
  base64: string,
  filename: string = 'uploaded_image.png',
  options: UploadOptions = {}
): Promise<TempFileResult> {
  const file = base64ToFile(base64, filename);
  return uploadLocalFile(file, options);
}

export default {
  uploadLocalFile,
  importFromUrl,
  base64ToFile,
  uploadBase64Image,
};
