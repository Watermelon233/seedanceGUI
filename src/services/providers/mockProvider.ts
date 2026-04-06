/**
 * Mock Provider
 * 用于开发和测试，不调用真实 API
 */

import type {
  VideoProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  TaskStatus
} from '../videoProvider';

/**
 * 简化的任务状态（只包含可序列化的字段）
 * 注意：不存储完整的 request（避免 File 对象序列化问题）
 */
interface TaskState {
  taskId: string;
  createdAt: number;
  model: string;
  ratio: string;
  duration: number;
  prompt: string;
  filesCount: number;
}

const MOCK_STORAGE_KEY = 'mock_tasks';
const MOCK_DELAY = 3000; // 3秒完成
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理

/**
 * 检查 localStorage 是否可用
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * 将 File 转换为 Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export class MockProvider implements VideoProvider {
  readonly name = 'Mock Provider';

  // 统一使用内存存储，localStorage 作为持久化
  private static tasks = new Map<string, TaskState>();
  private static useLocalStorage = isLocalStorageAvailable();
  private static initialized = false;

  /**
   * 初始化：从 localStorage 加载任务
   */
  private static initIfNeeded(): void {
    if (MockProvider.initialized) return;
    MockProvider.initialized = true;

    if (!MockProvider.useLocalStorage) {
      console.log('[MockProvider] 使用内存模式（localStorage 不可用）');
      return;
    }

    try {
      const data = localStorage.getItem(MOCK_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const now = Date.now();

        // 只加载未过期的任务
        for (const [id, state] of Object.entries(parsed)) {
          if (now - state.createdAt < CLEANUP_INTERVAL) {
            MockProvider.tasks.set(id, state);
          }
        }

        // 清理 localStorage 中的过期任务
        MockProvider.syncToLocalStorage();
        console.log(`[MockProvider] 从 localStorage 加载了 ${MockProvider.tasks.size} 个任务`);
      }
    } catch (error) {
      console.warn('[MockProvider] localStorage 读取失败，使用内存模式:', error);
      MockProvider.useLocalStorage = false;
    }
  }

  /**
   * 将内存状态同步到 localStorage
   */
  private static syncToLocalStorage(): void {
    if (!MockProvider.useLocalStorage) return;

    try {
      const obj: Record<string, TaskState> = {};
      MockProvider.tasks.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('[MockProvider] localStorage 保存失败:', error);
    }
  }

  /**
   * 清理过期任务
   */
  private static cleanupExpiredTasks(): void {
    const now = Date.now();
    for (const [id, state] of MockProvider.tasks) {
      if (now - state.createdAt > CLEANUP_INTERVAL) {
        MockProvider.tasks.delete(id);
      }
    }
  }

  async createGenerationTask(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    MockProvider.initIfNeeded();
    MockProvider.cleanupExpiredTasks();

    const taskId = `mock-task-${Date.now()}`;

    const taskState: TaskState = {
      taskId,
      createdAt: Date.now(),
      model: request.model,
      ratio: request.ratio,
      duration: request.duration,
      prompt: request.prompt,
      filesCount: request.imageFiles?.length || 0
    };

    MockProvider.tasks.set(taskId, taskState);
    MockProvider.syncToLocalStorage();

    // ============================================================
    // 模仿 aihubmix 真实请求格式打印
    // ============================================================

    // 模型映射信息（与 aihubmixProvider 保持一致）
    const MODEL_ID_MAPPING: Record<string, string> = {
      'seedance-2.0': 'doubao-seedance-2-0-260128',
      'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
      'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
      'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128',
    };
    const mappedModelId = MODEL_ID_MAPPING[request.model] || request.model;

    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🧪 [MockProvider] 模拟 API 请求 (Aihubmix 格式)');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 请求参数:');
    console.log('   ├─ 前端模型:', request.model);
    console.log('   ├─ API 模型 ID:', mappedModelId);
    console.log('   ├─ URL: https://aihubmix.com/v1/videos');
    console.log('   ├─ Method: POST');
    console.log('   ├─ Model:', request.model);
    console.log('   ├─ Ratio:', request.ratio);
    console.log('   ├─ Duration:', request.duration + 's');
    console.log('   ├─ Resolution:', request.resolution || '720p');
    console.log('   ├─ Generate Audio:', request.generateAudio !== false);
    console.log('   ├─ Image Files:', request.imageFiles?.length || 0);
    console.log('   ├─ Image URLs:', request.imageUrls?.length || 0);
    console.log('   ├─ Reference Mode:', request.referenceMode || 'none');
    console.log('   └─ Prompt:', request.prompt);

    // 模拟 payload（与真实 API 格式完全一致）
    const buildContent = async (): Promise<any[]> => {
      const content: any[] = [];
      content.push({ type: 'text', text: request.prompt });

      // 处理图片文件（转换为 base64，与真实 API 完全一致）
      if (request.imageFiles && request.imageFiles.length > 0) {
        for (let i = 0; i < request.imageFiles.length; i++) {
          const file = request.imageFiles[i];
          const base64 = await fileToBase64(file);
          content.push({
            type: 'image_url',
            image_url: { url: base64 }  // 嵌套对象格式
          });
        }
      }

      // 处理图片 URL
      if (request.imageUrls && request.imageUrls.length > 0) {
        for (const url of request.imageUrls) {
          content.push({
            type: 'image_url',
            image_url: { url: url }
          });
        }
      }

      return content;
    };

    const content = await buildContent();

    const payload = {
      model: request.model,
      content: content,
      resolution: request.resolution || '720p',
      ratio: request.ratio,
      duration: request.duration,
      generate_audio: request.generateAudio !== false,
      seed: -1,
      watermark: false,
      camera_fixed: false
    };

    console.log('');
    console.log('📦 完整 Payload (JSON):');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');
    console.log('💡 图片数据已转换为真实 base64，可直接复制到 API 测试工具');
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ [MockProvider] 任务创建成功');
    console.log('   ├─ taskId:', taskId);
    console.log('   ├─ 预计完成时间: 3 秒后');
    console.log('   └─ 当前任务队列数:', MockProvider.tasks.size);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    return {
      success: true,
      taskId
    };
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    MockProvider.initIfNeeded();

    // 打印查询请求（模仿 aihubmix API）
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🔍 [MockProvider] 查询任务状态 (Aihubmix 格式)');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 查询参数:');
    console.log('   ├─ URL: https://aihubmix.com/v1/videos/' + taskId);
    console.log('   ├─ Method: GET');
    console.log('   ├─ Headers: { "Authorization": "Bearer <api_key>" }');
    console.log('   └─ taskId:', taskId);
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    const state = MockProvider.tasks.get(taskId);

    if (!state) {
      console.warn('════════════════════════════════════════════════════════════════');
      console.warn('❌ [MockProvider] 任务不存在:', taskId);
      console.warn('   当前任务列表:', Array.from(MockProvider.tasks.keys()));
      console.warn('════════════════════════════════════════════════════════════════');
      return { status: 'failed', error: '任务不存在或已过期' };
    }

    const elapsed = Math.max(0, Date.now() - state.createdAt);

    if (elapsed < MOCK_DELAY) {
      const progress = Math.min(95, Math.floor((elapsed / MOCK_DELAY) * 95));
      console.log(`🔄 [MockProvider] 任务处理中: ${taskId} - 进度: ${progress}%`);
      return {
        status: 'processing',
        progress
      };
    }

    // 完成，删除任务
    MockProvider.tasks.delete(taskId);
    MockProvider.syncToLocalStorage();

    const videoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

    // 打印响应数据
    const responseData = {
      id: taskId,
      status: 'completed',
      url: videoUrl,
      created_at: new Date(state.createdAt).toISOString(),
      completed_at: new Date().toISOString()
    };

    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ [MockProvider] 任务完成');
    console.log('   ├─ taskId:', taskId);
    console.log('   ├─ 耗时:', (elapsed / 1000).toFixed(1) + 's');
    console.log('   ├─ videoUrl:', videoUrl);
    console.log('   └─ 剩余任务数:', MockProvider.tasks.size);
    console.log('');
    console.log('📦 API 响应数据 (JSON):');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');

    return {
      status: 'completed',
      videoUrl
    };
  }

  /**
   * 手动清理所有任务（调试用）
   */
  static clearAllTasks(): number {
    MockProvider.initIfNeeded();
    const count = MockProvider.tasks.size;

    MockProvider.tasks.clear();
    MockProvider.syncToLocalStorage();

    console.log(`[MockProvider] 已清理 ${count} 个任务`);
    return count;
  }

  /**
   * 获取当前任务数量（调试用）
   */
  static getTaskCount(): number {
    MockProvider.initIfNeeded();
    return MockProvider.tasks.size;
  }

  /**
   * 获取所有任务 ID（调试用）
   */
  static getAllTaskIds(): string[] {
    MockProvider.initIfNeeded();
    return Array.from(MockProvider.tasks.keys());
  }
}
