/**
 * IndexedDB任务管理服务
 * 用于存储任务记录和生成历史
 */

export interface TaskRecord {
  id: string;
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  isMock?: boolean; // Mock 任务标识
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  taskCount: number;
}

const DB_NAME = 'SeedanceDB';
const DB_VERSION = 2; // 升级到 v2，支持 isMock 索引
const TASKS_STORE = 'tasks';
const PROJECTS_STORE = 'projects';

class IndexedDBService {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('无法打开数据库'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = (event as any).oldVersion || 0;

        // v1: 创建基础结构
        if (oldVersion < 1) {
          // 创建任务存储
          if (!db.objectStoreNames.contains(TASKS_STORE)) {
            const taskStore = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
            taskStore.createIndex('status', 'status', { unique: false });
            taskStore.createIndex('createdAt', 'createdAt', { unique: false });
            // v1 时就添加 isMock 索引（如果是新建）
            taskStore.createIndex('isMock', 'isMock', { unique: false });
          }

          // 创建项目存储
          if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
            const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
            projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        }

        // v2: 添加 isMock 索引（仅升级时）
        if (oldVersion >= 1 && oldVersion < 2) {
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const taskStore = transaction.objectStore(TASKS_STORE);
            if (!taskStore.indexNames.contains('isMock')) {
              taskStore.createIndex('isMock', 'isMock', { unique: false });
              console.log('[IndexedDB] 已添加 isMock 索引');
            }
          }
        }
      };
    });
  }

  /**
   * 添加任务
   * 支持传入自定义 id（用于 Mock 模式）
   */
  async addTask(task: Omit<TaskRecord, 'id' | 'createdAt'> & { id?: string }): Promise<TaskRecord> {
    if (!this.db) await this.init();

    const newTask: TaskRecord = {
      ...task,
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.add(newTask);

      request.onsuccess = () => resolve(newTask);
      request.onerror = () => reject(new Error('添加任务失败'));
    });
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<TaskRecord>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE);

      store.get(taskId).onsuccess = (event) => {
        const task = (event.target as IDBRequest).result as TaskRecord;
        if (task) {
          const updatedTask = { ...task, ...updates };
          store.put(updatedTask).onsuccess = () => resolve();
        } else {
          reject(new Error('任务不存在'));
        }
      };
    });
  }

  /**
   * 获取任务
   */
  async getTask(taskId: string): Promise<TaskRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readonly');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.get(taskId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('获取任务失败'));
    });
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<TaskRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readonly');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const tasks = request.result as TaskRecord[];
        // 按创建时间倒序排列
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(tasks);
      };
      request.onerror = () => reject(new Error('获取任务列表失败'));
    });
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.delete(taskId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('删除任务失败'));
    });
  }

  /**
   * 清空所有任务
   */
  async clearAllTasks(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('清空任务失败'));
    });
  }

  /**
   * 清理所有 mock 任务
   */
  async clearMockTasks(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(TASKS_STORE);
      const index = store.index('isMock');
      const request = index.openCursor(IDBKeyRange.only('true'));

      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          count++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] 已清理 ${count} 个 mock 任务`);
        resolve(count);
      };

      transaction.onerror = () => reject(new Error('清理任务失败'));
    });
  }

  /**
   * 统计 mock 任务数量
   */
  async getMockTaskCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASKS_STORE], 'readonly');
      const store = transaction.objectStore(TASKS_STORE);
      const index = store.index('isMock');
      const request = index.count('true');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('统计任务失败'));
    });
  }

  /**
   * 添加项目
   */
  async addProject(project: Omit<ProjectRecord, 'id' | 'createdAt' | 'taskCount'>): Promise<ProjectRecord> {
    if (!this.db) await this.init();

    const newProject: ProjectRecord = {
      ...project,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      taskCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.add(newProject);

      request.onsuccess = () => resolve(newProject);
      request.onerror = () => reject(new Error('添加项目失败'));
    });
  }

  /**
   * 获取所有项目
   */
  async getAllProjects(): Promise<ProjectRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const projects = request.result as ProjectRecord[];
        projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(projects);
      };
      request.onerror = () => reject(new Error('获取项目列表失败'));
    });
  }
}

// 导出单例
export const indexedDBService = new IndexedDBService();