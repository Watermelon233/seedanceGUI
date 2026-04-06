import type { GenerateVideoRequest, VideoGenerationResponse } from '../types';
import { generateVideo as directGenerateVideo, getTaskStatus } from './directApiService';
import { indexedDBService } from './indexedDBService';

/**
 * 生成视频（纯前端版本）
 */
export async function generateVideo(
  request: GenerateVideoRequest,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  try {
    onProgress?.('正在提交视频生成请求...');

    // 调用纯前端API服务
    const result = await directGenerateVideo({
      prompt: request.prompt,
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
      imageFiles: request.files,
    });

    if (!result.success) {
      throw new Error(result.error || '生成视频失败');
    }

    if (result.taskId) {
      // 保存任务到IndexedDB
      await indexedDBService.addTask({
        prompt: request.prompt,
        model: request.model,
        ratio: request.ratio,
        duration: request.duration,
        status: 'generating',
      });

      // 轮询任务状态
      return await pollTaskStatus(result.taskId, onProgress);
    }

    // 如果直接返回了视频URL
    if (result.videoUrl) {
      return {
        created: Date.now(),
        data: [{
          url: result.videoUrl,
          revised_prompt: request.prompt,
        }],
      };
    }

    throw new Error('未获取到视频结果');
  } catch (error) {
    throw error;
  }
}

/**
 * 轮询任务状态
 */
async function pollTaskStatus(
  taskId: string,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  const maxPollTime = 25 * 60 * 1000; // 25分钟
  const pollInterval = 3000; // 3秒
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      onProgress?.('正在生成视频，请稍候...');

      const status = await getTaskStatus(taskId);

      if (status.status === 'completed' && status.videoUrl) {
        // 更新任务状态
        await indexedDBService.updateTask(taskId, {
          status: 'completed',
          videoUrl: status.videoUrl,
          completedAt: new Date().toISOString(),
        });

        return {
          created: Date.now(),
          data: [{
            url: status.videoUrl,
            revised_prompt: '',
          }],
        };
      }

      if (status.status === 'failed') {
        await indexedDBService.updateTask(taskId, {
          status: 'failed',
          errorMessage: status.error,
        });

        throw new Error(status.error || '视频生成失败');
      }

    } catch (error) {
      // 继续轮询
      console.error('轮询错误:', error);
    }
  }

  throw new Error('视频生成超时，请稍后查看任务列表');
}

/**
 * 获取任务列表
 */
export async function getTaskList(): Promise<any[]> {
  try {
    const tasks = await indexedDBService.getAllTasks();
    return tasks;
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return [];
  }
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    await indexedDBService.deleteTask(taskId);
  } catch (error) {
    console.error('删除任务失败:', error);
    throw error;
  }
}