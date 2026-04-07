/**
 * Provider 工具函数
 * v7 新增: 统一的错误识别和工具函数
 */

/**
 * 稳健的 AbortError 识别
 * 兼容多种可能的 abort 错误表现形式
 * @param error - 待检查的错误对象
 * @returns true 表示是 AbortError，false 表示不是
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false;

  // 标准 AbortError
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  // DOMException (某些浏览器环境)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  // 兼容包装过的错误对象
  const err = error as Record<string, unknown>;
  if (err.name === 'AbortError') {
    return true;
  }

  // 检查 cause 链
  if (err.cause && typeof err.cause === 'object') {
    return isAbortError(err.cause);
  }

  return false;
}

export default {
  isAbortError,
};
