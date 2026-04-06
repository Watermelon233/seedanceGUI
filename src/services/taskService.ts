/**
 * 纯前端任务管理服务
 * 使用IndexedDB存储任务数据，无需后端服务器
 */

import type { Task, TaskKind, TaskAsset } from '../types/index';
import { indexedDBService, TaskRecord } from './indexedDBService';

// ============================================================
// 类型转换工具
// ============================================================

/**
 * 将TaskRecord转换为Task类型
 */
function taskRecordToTask(record: TaskRecord): Task {
  return {
    id: parseInt(record.id.replace('task_', '')) || 0,
    project_id: 0, // 简化版本不使用项目
    prompt: record.prompt,
    model_key: record.model,
    ratio: record.ratio,
    video_duration: record.duration,
    status: record.status as any,
    created_at: record.createdAt,
    completed_at: record.completedAt,
    video_url: record.videoUrl,
    thumbnail_url: record.thumbnailUrl,
    error_message: record.errorMessage,
    task_kind: 'single' as TaskKind,
  };
}

/**
 * 将Task转换为TaskRecord类型
 */
function taskToTaskRecord(task: Partial<Task>): Omit<TaskRecord, 'id' | 'createdAt'> {
  return {
    prompt: task.prompt || '',
    model: task.model_key || 'seedance-2.0',
    ratio: task.ratio || '16:9',
    duration: task.video_duration || 5,
    status: (task.status as any) || 'pending',
    completedAt: task.completed_at || undefined,
    videoUrl: task.video_url || undefined,
    thumbnailUrl: task.thumbnail_url || undefined,
    errorMessage: task.error_message || undefined,
  };
}

// ============================================================
// 任务管理功能
// ============================================================

/**
 * 获取所有任务
 */
export async function getTasks(): Promise<Task[]> {
  try {
    const records = await indexedDBService.getAllTasks();
    return records.map(taskRecordToTask);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return [];
  }
}

/**
 * 获取单个任务
 */
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    // 支持两种ID格式：数字ID和task_开头的字符串ID
    const id = typeof taskId === 'number' ? `task_${taskId}` : taskId;
    const record = await indexedDBService.getTask(id);

    if (!record) {
      return null;
    }

    return taskRecordToTask(record);
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return null;
  }
}

/**
 * 创建任务
 */
export async function createTask(
  prompt: string,
  options: {
    model?: string;
    ratio?: string;
    duration?: number;
  } = {}
): Promise<Task> {
  try {
    const record = await indexedDBService.addTask({
      prompt,
      model: options.model || 'seedance-2.0',
      ratio: options.ratio || '16:9',
      duration: options.duration || 5,
      status: 'pending',
    });

    return taskRecordToTask(record);
  } catch (error) {
    console.error('创建任务失败:', error);
    throw error;
  }
}

/**
 * 更新任务
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<void> {
  try {
    const id = typeof taskId === 'number' ? `task_${taskId}` : taskId;
    const recordUpdates = taskToTaskRecord(updates);

    await indexedDBService.updateTask(id, recordUpdates);
  } catch (error) {
    console.error('更新任务失败:', error);
    throw error;
  }
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    const id = typeof taskId === 'number' ? `task_${taskId}` : taskId;
    await indexedDBService.deleteTask(id);
  } catch (error) {
    console.error('删除任务失败:', error);
    throw error;
  }
}

/**
 * 清空所有任务
 */
export async function clearAllTasks(): Promise<void> {
  try {
    await indexedDBService.clearAllTasks();
  } catch (error) {
    console.error('清空任务失败:', error);
    throw error;
  }
}

// ============================================================
// 素材管理（简化版本）
// ============================================================

/**
 * 添加任务素材（简化版本，仅存储引用）
 */
export async function addTaskAssets(
  taskId: string,
  images?: File[],
  _audios?: File[]
): Promise<TaskAsset[]> {
  // 简化版本：将文件转换为DataURL并存储在任务记录中
  const assets: TaskAsset[] = [];
  const assetData: { images?: string[]; audios?: string[] } = {};

  if (images && images.length > 0) {
    assetData.images = await Promise.all(
      images.map(async (file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );

    assets.push(
      ...images.map((file, index) => ({
        id: Date.now() + index,
        task_id: typeof taskId === 'number' ? taskId : parseInt(taskId.replace('task_', '')) || 0,
        asset_type: 'image' as const,
        file_path: assetData.images![index],
        file_name: file.name,
        file_size: file.size,
        created_at: new Date().toISOString(),
      }))
    );
  }

  // 更新任务记录，添加素材数据
  await updateTask(taskId, {
    video_url: assetData.images?.[0], // 暂时存储在video_url字段
  } as any);

  return assets;
}

/**
 * 获取任务素材列表
 */
export async function getTaskAssets(taskId: string): Promise<TaskAsset[]> {
  // 简化版本：从任务记录中获取素材
  const task = await getTask(taskId);
  if (!task || !task.video_url) {
    return [];
  }

  return [{
    id: Date.now(),
    task_id: task.id,
    asset_type: 'image',
    file_path: task.video_url,
    file_name: 'image.png',
    file_size: 0,
    created_at: task.created_at || new Date().toISOString(),
  }];
}

/**
 * 删除任务素材
 */
export async function deleteTaskAsset(_assetId: number): Promise<void> {
  // 简化版本：暂不实现
  console.log('删除素材功能暂未实现');
}

// ============================================================
// 任务操作（已废弃，使用videoService）
// ============================================================

/**
 * 生成任务视频 - 已废弃，请使用videoService.generateVideo
 * @deprecated
 */
export async function generateTaskVideo(_taskId: number): Promise<any> {
  console.warn('generateTaskVideo已废弃，请使用videoService.generateVideo');
  throw new Error('此方法已废弃，请使用videoService.generateVideo');
}

/**
 * 取消任务 - 已废弃
 * @deprecated
 */
export async function cancelTask(_taskId: number): Promise<void> {
  console.warn('cancelTask已废弃');
  throw new Error('此方法已废弃');
}

/**
 * 下载任务视频 - 已废弃，请使用directApiService.downloadVideo
 * @deprecated
 */
export async function downloadTaskVideo(_taskId: number): Promise<any> {
  console.warn('downloadTaskVideo已废弃，请使用directApiService.downloadVideo');
  throw new Error('此方法已废弃，请使用directApiService.downloadVideo');
}

/**
 * 打开视频所在文件夹 - 已废弃
 * @deprecated
 */
export async function openTaskVideoFolder(_taskId: number): Promise<void> {
  console.warn('openTaskVideoFolder已废弃（纯前端无法打开本地文件夹）');
  throw new Error('纯前端版本无法打开本地文件夹');
}

/**
 * 二次采集任务视频 - 已废弃
 * @deprecated
 */
export async function collectTaskVideo(_taskId: number): Promise<any> {
  console.warn('collectTaskVideo已废弃');
  throw new Error('此方法已废弃');
}

// ============================================================
// 便捷查询方法
// ============================================================

/**
 * 获取进行中的任务
 */
export async function getActiveTasks(): Promise<Task[]> {
  const allTasks = await getTasks();
  return allTasks.filter(
    (task) => task.status === 'pending' || task.status === 'generating'
  );
}

/**
 * 获取已完成的任务
 */
export async function getCompletedTasks(): Promise<Task[]> {
  const allTasks = await getTasks();
  return allTasks.filter((task) => task.status === 'completed');
}

/**
 * 获取失败的任务
 */
export async function getFailedTasks(): Promise<Task[]> {
  const allTasks = await getTasks();
  return allTasks.filter((task) => task.status === 'failed');
}

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  clearAllTasks,
  addTaskAssets,
  getTaskAssets,
  deleteTaskAsset,
  getActiveTasks,
  getCompletedTasks,
  getFailedTasks,
};
