import type { GenerateVideoRequest, VideoGenerationResponse } from '../types';
import { getVideoProvider } from './providers';
import { indexedDBService } from './indexedDBService';

/**
 * 生成视频（使用新的 Provider 架构）
 */
export async function generateVideo(
  request: GenerateVideoRequest,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  try {
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🎬 [VideoService] 开始生成视频');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📥 接收到的请求参数:');
    console.log('   ├─ model:', request.model);
    console.log('   ├─ ratio:', request.ratio);
    console.log('   ├─ duration:', request.duration);
    console.log('   ├─ prompt:', request.prompt);
    console.log('   ├─ files:', request.files?.length || 0, '个文件');
    if (request.files && request.files.length > 0) {
      request.files.forEach((f, i) => {
        console.log('   │  └─ File[' + i + ']:', f.name, f.type, (f.size / 1024).toFixed(1) + 'KB');
      });
    }
    console.log('   └─ generateAudio:', request.generateAudio);

    onProgress?.('正在提交视频生成请求...');

    // 获取当前配置的供应商
    const provider = getVideoProvider();
    console.log('');
    console.log('🔧 使用的供应商:', provider.name);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    // 调用供应商API
    const result = await provider.createGenerationTask({
      prompt: request.prompt,
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
      imageFiles: request.files,
      generateAudio: true,
      resolution: request.model.includes('vip') ? '720p' : '720p',
    });

    console.log('[VideoService] API 响应:', result);

    if (!result.success) {
      console.error('[VideoService] API 调用失败:', result.error);
      onProgress?.(`API调用失败: ${result.error || '未知错误'}`);
      throw new Error(result.error || '生成视频失败');
    }

    if (!result.taskId) {
      console.error('[VideoService] 未获取到 taskId');
      onProgress?.('未获取到任务ID，请检查API配置');
      throw new Error('未获取到任务ID，请检查API Key是否正确');
    }

    console.log('[VideoService] 任务ID:', result.taskId);

    // 保存任务到IndexedDB（Mock 模式标记 isMock，使用 Provider 返回的 taskId）
    const isMockMode = provider.name === 'Mock Provider';
    await indexedDBService.addTask({
      id: result.taskId || undefined,
      prompt: request.prompt,
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
      status: 'generating',
      isMock: isMockMode,
    });

    // 如果直接返回了视频URL（API 同步完成）
    if (result.videoUrl) {
      console.log('[VideoService] API 直接返回视频 URL');
      await indexedDBService.updateTask(result.taskId, {
        status: 'completed',
        videoUrl: result.videoUrl,
        completedAt: new Date().toISOString(),
      });
      onProgress?.('视频生成完成！');
      return {
        created: Date.now(),
        data: [{
          url: result.videoUrl,
          revised_prompt: request.prompt,
        }],
      };
    }

    // 需要轮询任务状态
    if (!result.taskId) {
      throw new Error('未获取到任务ID，请检查API配置');
    }

    onProgress?.('任务已创建，开始轮询状态...');
    return await pollTaskStatus(result.taskId, provider, onProgress);
  } catch (error) {
    console.error('[VideoService] 生成视频失败:', error);
    onProgress?.(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    throw error;
  }
}

/**
 * 轮询任务状态
 */
async function pollTaskStatus(
  taskId: string,
  provider: any,
  onProgress?: (message: string) => void
): Promise<VideoGenerationResponse> {
  const maxPollTime = 25 * 60 * 1000; // 25分钟
  const pollInterval = 3000; // 3秒
  const startTime = Date.now();
  let pollCount = 0;

  console.log('[VideoService] 开始轮询任务状态, taskId:', taskId);

  while (Date.now() - startTime < maxPollTime) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    pollCount++;

    try {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress?.(`正在生成视频，请稍候... (${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')})`);

      console.log(`[VideoService] 轮询第${pollCount}次, taskId: ${taskId}`);

      const status = await provider.getTaskStatus(taskId);

      console.log(`[VideoService] 任务状态:`, status);

      if (status.status === 'completed' && status.videoUrl) {
        console.log('[VideoService] 视频生成完成!');
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
        console.error('[VideoService] 任务失败:', status.error);
        await indexedDBService.updateTask(taskId, {
          status: 'failed',
          errorMessage: status.error,
        });

        throw new Error(status.error || '视频生成失败');
      }

    } catch (error) {
      console.error(`[VideoService] 轮询第${pollCount}次出错:`, error);
      // 继续轮询，不中断
    }
  }

  console.error('[VideoService] 轮询超时');
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

/**
 * 查询任务状态（供外部调用）
 */
export async function getTaskStatus(taskId: string) {
  const provider = getVideoProvider();
  return await provider.getTaskStatus(taskId);
}
