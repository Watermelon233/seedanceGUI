/**
 * 简化的任务管理器 - 无数据库版本
 * 使用文件系统存储任务，通过API Key关联
 */

import crypto from 'crypto';
import { getBestProviderForUser } from './providers/index.js';
import fileStorage from './fileStorage.js';

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * 简化的任务管理器
 */
class SimplifiedTaskManager {
  constructor() {
    this.activeTasks = new Map(); // 正在处理的任务
    this.taskCallbacks = new Map(); // 任务回调
  }

  /**
   * 创建新任务
   */
  async createTask(taskData) {
    const { prompt, model, ratio, duration, files = [], provider = null } = taskData;

    // 获取API Key
    const apiKey = this.getApiKeyForProvider(provider);
    if (!apiKey) {
      throw new Error(`请先配置 ${provider || '默认'} 供应商的 API Key`);
    }

    // 创建任务记录
    const task = fileStorage.task.createTask({
      prompt,
      model,
      ratio,
      duration,
      fileCount: files.length,
      provider: provider || fileStorage.apiKey.getApiKeys().default,
      status: TaskStatus.PENDING
    });

    // 启动异步生成
    this.processTask(task.id, taskData, apiKey);

    return task;
  }

  /**
   * 获取API Key
   */
  getApiKeyForProvider(provider) {
    const keys = fileStorage.apiKey.getApiKeys();
    const selectedProvider = provider || keys.default;

    if (selectedProvider === 'volcengine') {
      return keys.volcengine;
    } else if (selectedProvider === 'aihubmix') {
      return keys.aihubmix;
    }

    return keys[keys.default] || null;
  }

  /**
   * 处理任务（异步）
   */
  async processTask(taskId, taskData, apiKey) {
    try {
      // 更新任务状态为处理中
      fileStorage.task.updateTask(taskId, {
        status: TaskStatus.PROCESSING,
        startedAt: new Date().toISOString()
      });

      this.activeTasks.set(taskId, true);

      // 获取供应商
      const provider = getBestProviderForUser(
        taskData.provider || fileStorage.apiKey.getApiKeys().default
      );

      // 处理文件
      const processedFiles = await this.processFiles(taskData.files);

      // 构建请求
      const request = {
        prompt: taskData.prompt || '',
        model: taskData.model,
        ratio: taskData.ratio,
        duration: taskData.duration,
        files: processedFiles,
        referenceMode: '全能参考'
      };

      // 转换请求
      const transformedRequest = provider.transformRequest(request);

      // 提交任务
      const createResult = await provider.createTask(apiKey, transformedRequest);

      if (!createResult.success) {
        throw new Error(createResult.error || '创建任务失败');
      }

      const providerTaskId = createResult.taskId;

      // 轮询任务状态
      await this.pollTaskStatus(taskId, provider, apiKey, providerTaskId);

    } catch (error) {
      // 任务失败
      fileStorage.task.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        completedAt: new Date().toISOString()
      });

      this.activeTasks.delete(taskId);
      console.error(`[任务 ${taskId}] 失败:`, error.message);
    }
  }

  /**
   * 处理文件
   */
  async processFiles(files) {
    return Promise.all(files.map(async (file) => {
      // 如果文件是buffer，转换为dataUrl
      if (file.buffer) {
        const base64 = file.buffer.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        return {
          dataUrl: `data:${mimeType};base64,${base64}`,
          url: null
        };
      }
      // 如果已有dataUrl或url，直接使用
      return {
        dataUrl: file.dataUrl || null,
        url: file.url || null
      };
    }));
  }

  /**
   * 轮询任务状态
   */
  async pollTaskStatus(taskId, provider, apiKey, providerTaskId) {
    const maxRetries = 60;
    const checkInterval = 3000; // 3秒

    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      try {
        const statusResult = await provider.getTaskStatus(apiKey, providerTaskId);

        if (!statusResult.success) {
          console.warn(`[任务 ${taskId}] 查询状态失败: ${statusResult.error}`);
          continue;
        }

        const status = statusResult.status;
        console.log(`[任务 ${taskId}] 状态: ${status} (${retryCount + 1}/${maxRetries})`);

        // 检查任务是否完成
        if (status === 'succeeded' || status === 'completed' || status === 'finished') {
          const response = provider.transformResponse(statusResult);
          const videoUrl = response.data?.[0]?.url;

          if (!videoUrl) {
            throw new Error('未能从响应中获取视频URL');
          }

          // 任务完成
          fileStorage.task.updateTask(taskId, {
            status: TaskStatus.COMPLETED,
            videoUrl,
            completedAt: new Date().toISOString(),
            result: {
              videoUrl,
              revisedPrompt: response.data?.[0]?.revised_prompt || ''
            }
          });

          this.activeTasks.delete(taskId);
          console.log(`[任务 ${taskId}] 完成: ${videoUrl}`);
          return;
        }

        // 检查任务是否失败
        if (status === 'failed' || status === 'error') {
          throw new Error('视频生成失败');
        }

      } catch (error) {
        if (error.message.includes('视频生成失败')) {
          throw error;
        }
        console.warn(`[任务 ${taskId}] 轮询出错: ${error.message}`);
      }
    }

    throw new Error('任务超时');
  }

  /**
   * 获取任务
   */
  getTask(taskId) {
    return fileStorage.task.getTask(taskId);
  }

  /**
   * 获取任务列表
   */
  getTasks(options = {}) {
    return fileStorage.task.getTasks(options);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId) {
    const task = fileStorage.task.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw new Error('任务已完成，无法取消');
    }

    fileStorage.task.updateTask(taskId, {
      status: TaskStatus.FAILED,
      error: '用户取消',
      completedAt: new Date().toISOString()
    });

    this.activeTasks.delete(taskId);

    return true;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId) {
    return fileStorage.task.deleteTask(taskId);
  }

  /**
   * 获取任务统计
   */
  getStats() {
    return fileStorage.task.getStats();
  }

  /**
   * 清理旧任务
   */
  cleanup(daysToKeep = 30) {
    return fileStorage.task.cleanupOldTasks(daysToKeep);
  }
}

// 创建单例
const taskManager = new SimplifiedTaskManager();

export default taskManager;
export { TaskStatus };