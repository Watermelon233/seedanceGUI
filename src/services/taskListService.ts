/**
 * 任务列表管理服务
 * 处理任务轮询、状态更新和用户关联
 * 修复: 并发控制、请求取消、删除竞态
 * v8: 单一互斥入口、统一刷新触发、Listener 生命周期管理
 */

import { indexedDBService, TaskRecord } from './indexedDBService';
import { getVideoProvider } from './providers';
import { getApiConfig } from './localStorageService';
import { isAbortError } from './providers/utils';

// ============================================================
// 类型定义
// ============================================================

export interface TaskListItem {
  id: string;
  prompt: string;
  model: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  provider: 'aihubmix' | 'volcengine' | 'mock';
  lastPolledAt?: string;
}

export interface PollingOptions {
  interval?: number;
  visibilityAware?: boolean;
}

// ============================================================
// API Key 关联
// ============================================================

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCurrentApiKeyHash(): Promise<string> {
  const config = getApiConfig();
  const key = config.aihubmixKey || config.volcengineKey;
  return key ? await hashApiKey(key) : 'anonymous';
}

function getCurrentProvider(): 'aihubmix' | 'volcengine' | 'mock' {
  const config = getApiConfig();
  if (config.defaultProvider === 'volcengine') {
    return 'volcengine';
  }
  return 'aihubmix';
}

// ============================================================
// 任务 CRUD 操作
// ============================================================

export async function getTasksForCurrentUser(): Promise<TaskListItem[]> {
  const allTasks = await indexedDBService.getAllTasks();
  const currentHash = await getCurrentApiKeyHash();

  return allTasks
    .filter(task => {
      // v5 修复: 为旧数据提供兼容性
      // v1/v2 任务没有 apiKeyHash 字段，使用宽松的匹配策略
      if (!task.apiKeyHash) {
        // 旧数据：返回所有任务（假设都是当前用户的）
        return true;
      }
      // 新数据：严格匹配 apiKeyHash
      return task.apiKeyHash === currentHash;
    })
    .map(task => ({
      id: task.id,
      prompt: task.prompt,
      model: task.model,
      status: task.status,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      videoUrl: task.videoUrl,
      thumbnailUrl: task.thumbnailUrl,
      errorMessage: task.errorMessage,
      provider: (task as any).provider || 'aihubmix', // v5: 为旧数据提供默认值
      lastPolledAt: (task as any).lastPolledAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveTaskWithUser(
  task: Omit<TaskRecord, 'id' | 'createdAt' | 'apiKeyHash' | 'provider' | 'updatedAt'>
): Promise<TaskRecord> {
  const apiKeyHash = await getCurrentApiKeyHash();
  const provider = getCurrentProvider();

  return indexedDBService.addTask({
    ...task,
    apiKeyHash,
    provider,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  return indexedDBService.deleteTask(taskId);
}

// ============================================================
// 轮询机制 (修复并发问题)
// ============================================================

interface PollingController {
  intervalId: number | null;
  isActive: boolean;
  isPolling: boolean;  // v7 新增: 轮询级防重入
  abortController: AbortController | null;
  pendingTaskIds: Set<string>;
}

const pollingController: PollingController = {
  intervalId: null,
  isActive: false,
  isPolling: false,  // v7 新增
  abortController: null,
  pendingTaskIds: new Set(),
};

// ============================================================
// 工具函数 (v7 新增: 统一任务互斥和错误识别)
// ============================================================

/**
 * v7 新增: 统一的任务互斥检查和声明
 * @returns true 表示成功声明任务，false 表示任务已在处理中
 */
function tryClaimTask(taskId: string): boolean {
  if (pollingController.pendingTaskIds.has(taskId)) {
    return false;
  }
  pollingController.pendingTaskIds.add(taskId);
  return true;
}

/**
 * v7 新增: 释放任务声明
 */
function releaseTask(taskId: string): void {
  pollingController.pendingTaskIds.delete(taskId);
}

/**
 * 启动轮询 (v8 修复: 移除双重 claim，改用统一刷新入口)
 */
export async function startPolling(options: PollingOptions = {}): Promise<void> {
  if (pollingController.isActive) {
    console.log('[TaskList] 轮询已在运行');
    return;
  }

  const {
    interval = 5000,
    visibilityAware = true,
  } = options;

  pollingController.isActive = true;
  pollingController.abortController = new AbortController();

  // v8: 抓取本轮 signal，避免过程中被置空
  const currentSignal = pollingController.abortController.signal;

  const scheduleNextPoll = () => {
    if (!pollingController.isActive) return;

    pollingController.intervalId = window.setTimeout(() => {
      poll().catch(err => {
        if (!isAbortError(err)) {
          console.error('[TaskList] 轮询调度出错:', err);
        }
      });
    }, interval);
  };

  const poll = async () => {
    // v7: 轮询级防重入
    if (pollingController.isPolling) {
      console.log('[TaskList] 上一轮轮询尚未完成，跳过本轮');
      return;
    }

    if (!pollingController.isActive) return;

    // 可见性检查
    if (visibilityAware && document.hidden) {
      scheduleNextPoll();
      return;
    }

    pollingController.isPolling = true;

    try {
      const tasks = await getPendingTasks();

      if (tasks.length === 0) {
        scheduleNextPoll();
        return;
      }

      console.log(`[TaskList] 轮询 ${tasks.length} 个任务...`);

      // v8 修复: 移除外层 tryClaimTask，直接调用 updateTaskStatus
      // claim/release 完全下沉到 updateTaskStatus() 内部
      for (const task of tasks) {
        if (currentSignal.aborted) {
          return;
        }

        // 直接调用 updateTaskStatus，不再预先 claim
        await updateTaskStatus(task.id, currentSignal);
      }

      scheduleNextPoll();
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('[TaskList] 轮询出错:', error);
      }
      scheduleNextPoll();
    } finally {
      pollingController.isPolling = false;
    }
  };

  // 立即执行一次
  await poll();

  // v8: 注册 visibilitychange listener
  setupVisibilityListener();

  console.log(`[TaskList] 已启动轮询 (间隔: ${interval}ms)`);
}

/**
 * 停止轮询 (v8: 同时注销 listener)
 */
export function stopPolling(): void {
  // v8: 注销 visibilitychange listener
  cleanupVisibilityListener();

  if (pollingController.abortController) {
    pollingController.abortController.abort();
    pollingController.abortController = null;
  }

  if (pollingController.intervalId !== null) {
    clearTimeout(pollingController.intervalId);
    pollingController.intervalId = null;
  }

  pollingController.isActive = false;
  pollingController.isPolling = false;
  pollingController.pendingTaskIds.clear();
  console.log('[TaskList] 已停止轮询');
}

// ============================================================
// v8 新增: 统一刷新入口
// ============================================================

/**
 * v8 新增: 统一的刷新请求入口
 * 所有外部触发（手动刷新、页面恢复、任务提交后等）都通过此函数
 */
export function requestRefresh(options: { immediate?: boolean } = {}) {
  if (!pollingController.isActive) return;

  const { immediate = false } = options;

  if (immediate) {
    console.log('[TaskList] 收到立即刷新请求');
    // 触发一次立即轮询
    pollOnce().catch(err => {
      if (!isAbortError(err)) {
        console.error('[TaskList] 立即刷新出错:', err);
      }
    });
  }
}

/**
 * v8 新增: 执行单次轮询（不调度下一轮）
 */
async function pollOnce(): Promise<void> {
  if (pollingController.isPolling) {
    console.log('[TaskList] 轮询进行中，跳过本次刷新');
    return;
  }

  if (!pollingController.isActive) return;

  const currentSignal = pollingController.abortController?.signal;
  if (!currentSignal) return;

  pollingController.isPolling = true;

  try {
    const tasks = await getPendingTasks();

    if (tasks.length === 0) {
      console.log('[TaskList] 没有待处理任务');
      return;
    }

    console.log(`[TaskList] 刷新 ${tasks.length} 个任务...`);

    for (const task of tasks) {
      if (currentSignal.aborted) return;
      await updateTaskStatus(task.id, currentSignal);
    }
  } finally {
    pollingController.isPolling = false;
  }
}

// ============================================================
// v8 新增: visibilitychange listener 生命周期管理
// ============================================================

let visibilityChangeListener: (() => void) | null = null;

/**
 * v8 新增: 注册 visibilitychange listener（只注册一次）
 */
function setupVisibilityListener() {
  // 避免重复注册
  if (visibilityChangeListener !== null) {
    return;
  }

  visibilityChangeListener = () => {
    if (!document.hidden && pollingController.isActive) {
      console.log('[TaskList] 页面恢复可见，请求立即刷新');
      // v8 修复: 使用统一的刷新入口，而非直接遍历
      requestRefresh({ immediate: true });
    }
  };

  document.addEventListener('visibilitychange', visibilityChangeListener);
}

/**
 * v8 新增: 注销 visibilitychange listener
 */
function cleanupVisibilityListener() {
  if (visibilityChangeListener !== null) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
    visibilityChangeListener = null;
  }
}

async function getPendingTasks(): Promise<TaskRecord[]> {
  const allTasks = await indexedDBService.getAllTasks();
  const currentHash = await getCurrentApiKeyHash();

  return allTasks.filter(task =>
    task.apiKeyHash === currentHash &&
    (task.status === 'pending' || task.status === 'generating')
  );
}

/**
 * 更新任务状态 (v8 修复: 单一互斥入口，所有调用都通过此函数)
 * @param taskId - 任务 ID
 * @param signal - AbortSignal 用于取消请求
 *
 * v8 修复说明:
 * - 这是唯一的任务互斥入口，内部负责 claim/release
 * - 调用方（poll()、requestRefresh()）不需要预先 claim
 * - 避免了 v7 的双重 claim 问题
 */
async function updateTaskStatus(taskId: string, signal?: AbortSignal): Promise<void> {
  // v8: 统一的互斥检查，所有入口都必须通过此检查
  if (!tryClaimTask(taskId)) {
    console.log(`[TaskList] 任务 ${taskId} 已在处理中，跳过`);
    return;
  }

  try {
    // 检查任务是否已被删除（在发起网络请求前检查，减少无效请求）
    const currentTask = await indexedDBService.getTask(taskId);
    if (!currentTask) {
      console.log(`[TaskList] 任务 ${taskId} 已被删除，跳过更新`);
      return;
    }

    const provider = getVideoProvider();

    // v6 修复: 传递 signal 给 provider，支持取消进行中的请求
    const status = await provider.getTaskStatus(taskId, signal);

    const updates: Partial<TaskRecord> = {
      updatedAt: new Date().toISOString(),
      lastPolledAt: new Date().toISOString(),
    };

    if (status.status === 'completed' && status.videoUrl) {
      updates.status = 'completed';
      updates.videoUrl = status.videoUrl;
      updates.completedAt = new Date().toISOString();
      console.log(`[TaskList] 任务 ${taskId} 已完成!`);
    } else if (status.status === 'failed') {
      updates.status = 'failed';
      updates.errorMessage = status.error;
      console.log(`[TaskList] 任务 ${taskId} 失败:`, status.error);
    } else if (status.status === 'processing') {
      updates.status = 'generating';
    }

    await indexedDBService.updateTask(taskId, updates);
  } catch (error) {
    // v7/v8: 使用统一的 isAbortError 识别
    if (isAbortError(error)) {
      console.log(`[TaskList] 任务 ${taskId} 请求已取消`);
      return;
    }
    console.error(`[TaskList] 更新任务 ${taskId} 失败:`, error);
  } finally {
    // v7/v8: 使用统一的 releaseTask
    releaseTask(taskId);
  }
}

export default {
  getTasksForCurrentUser,
  saveTaskWithUser,
  deleteTask,
  startPolling,
  stopPolling,
  requestRefresh,  // v8 新增: 统一刷新入口
};
