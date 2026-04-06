/**
 * 文件存储服务 - 替代数据库的轻量级存储方案
 * 用于个人使用的简单任务管理
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 创建子目录
  const dirs = [
    path.join(DATA_DIR, 'tasks'),
    path.join(DATA_DIR, 'videos'),
    path.join(DATA_DIR, 'cache')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 初始化
ensureDataDir();

/**
 * 配置文件管理
 */
export const configService = {
  configFile: path.join(DATA_DIR, 'config.json'),

  getConfig() {
    if (!fs.existsSync(this.configFile)) {
      // 创建默认配置
      const defaultConfig = {
        defaultProvider: 'volcengine',
        supportedProviders: ['volcengine', 'aihubmix'],
        maxConcurrent: 5,
        taskRetentionDays: 30,
        created: new Date().toISOString()
      };
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
  },

  saveConfig(config) {
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
  },

  updateConfig(updates) {
    const config = this.getConfig();
    Object.assign(config, updates);
    this.saveConfig(config);
    return config;
  }
};

/**
 * API Key管理服务
 */
export const apiKeyService = {
  apiKeyFile: path.join(DATA_DIR, 'api-keys.json'),

  getApiKeys() {
    if (!fs.existsSync(this.apiKeyFile)) {
      // 创建默认API Key配置
      const defaultKeys = {
        volcengine: null,
        aihubmix: null,
        default: 'volcengine',
        updated: null
      };
      this.saveApiKeys(defaultKeys);
      return defaultKeys;
    }
    return JSON.parse(fs.readFileSync(this.apiKeyFile, 'utf-8'));
  },

  saveApiKeys(keys) {
    keys.updated = new Date().toISOString();
    fs.writeFileSync(this.apiKeyFile, JSON.stringify(keys, null, 2));
  },

  setApiKey(provider, apiKey) {
    const keys = this.getApiKeys();
    keys[provider] = apiKey;
    this.saveApiKeys(keys);
    return keys;
  },

  getApiKey(provider) {
    const keys = this.getApiKeys();
    return keys[provider] || null;
  },

  getDefaultApiKey() {
    const keys = this.getApiKeys();
    return keys[keys.default] || null;
  },

  setDefaultProvider(provider) {
    const keys = this.getApiKeys();
    keys.default = provider;
    this.saveApiKeys(keys);
    return keys;
  }
};

/**
 * 任务管理服务
 */
export const taskService = {
  tasksDir: path.join(DATA_DIR, 'tasks'),
  indexFile: path.join(DATA_DIR, 'tasks', 'index.json'),

  // 内存索引，用于快速查询
  taskIndex: {},

  /**
   * 初始化任务索引
   */
  initIndex() {
    if (fs.existsSync(this.indexFile)) {
      this.taskIndex = JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
    } else {
      this.taskIndex = {};
      this.saveIndex();
    }
  },

  /**
   * 保存索引
   */
  saveIndex() {
    fs.writeFileSync(this.indexFile, JSON.stringify(this.taskIndex, null, 2));
  },

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * 获取今天的日期目录
   */
  getTodayDir() {
    const today = new Date().toISOString().split('T')[0];
    const dir = path.join(this.tasksDir, today);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return { today, dir };
  },

  /**
   * 创建任务
   */
  createTask(taskData) {
    const taskId = this.generateTaskId();
    const { today, dir } = this.getTodayDir();

    const task = {
      id: taskId,
      date: today,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...taskData
    };

    // 保存任务文件
    const taskFile = path.join(dir, `${taskId}.json`);
    fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

    // 更新索引
    this.taskIndex[taskId] = {
      file: taskFile,
      date: today,
      status: task.status,
      prompt: task.prompt,
      model: task.model,
      createdAt: task.timestamp
    };
    this.saveIndex();

    return task;
  },

  /**
   * 获取任务
   */
  getTask(taskId) {
    const index = this.taskIndex[taskId];
    if (!index) return null;

    if (fs.existsSync(index.file)) {
      return JSON.parse(fs.readFileSync(index.file, 'utf-8'));
    }
    return null;
  },

  /**
   * 更新任务
   */
  updateTask(taskId, updates) {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const taskFile = this.taskIndex[taskId].file;
    fs.writeFileSync(taskFile, JSON.stringify(updatedTask, null, 2));

    // 更新索引
    this.taskIndex[taskId] = {
      ...this.taskIndex[taskId],
      ...updates,
      updatedAt: updatedTask.updatedAt
    };
    this.saveIndex();

    return updatedTask;
  },

  /**
   * 删除任务
   */
  deleteTask(taskId) {
    const index = this.taskIndex[taskId];
    if (!index) return false;

    // 删除任务文件
    if (fs.existsSync(index.file)) {
      fs.unlinkSync(index.file);
    }

    // 从索引中删除
    delete this.taskIndex[taskId];
    this.saveIndex();

    return true;
  },

  /**
   * 获取任务列表
   */
  getTasks(options = {}) {
    const { limit = 50, date = null, status = null } = options;

    let tasks = Object.values(this.taskIndex)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 按日期过滤
    if (date) {
      tasks = tasks.filter(task => task.date === date);
    }

    // 按状态过滤
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    // 限制数量
    tasks = tasks.slice(0, limit);

    // 返回完整任务信息
    return tasks.map(index => this.getTask(index.id)).filter(Boolean);
  },

  /**
   * 按日期获取任务
   */
  getTasksByDate(date) {
    return this.getTasks({ date });
  },

  /**
   * 清理旧任务
   */
  cleanupOldTasks(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const taskIds = Object.keys(this.taskIndex);
    let deletedCount = 0;

    taskIds.forEach(taskId => {
      const task = this.getTask(taskId);
      if (task && new Date(task.timestamp) < cutoffDate) {
        // 只删除已完成的任务
        if (task.status === 'completed' || task.status === 'failed') {
          this.deleteTask(taskId);
          deletedCount++;
        }
      }
    });

    return deletedCount;
  },

  /**
   * 获取任务统计
   */
  getStats() {
    const tasks = Object.values(this.taskIndex);

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      dates: [...new Set(tasks.map(t => t.date))].length
    };
  }
};

// 初始化任务索引
taskService.initIndex();

/**
 * 缓存管理服务
 */
export const cacheService = {
  cacheDir: path.join(DATA_DIR, 'cache'),

  get(key) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    if (!fs.existsSync(cacheFile)) return null;

    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      // 检查是否过期
      if (cache.expires && new Date(cache.expires) < new Date()) {
        this.delete(key);
        return null;
      }
      return cache.data;
    } catch {
      return null;
    }
  },

  set(key, data, ttl = 3600000) { // 默认1小时
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    const expires = new Date(Date.now() + ttl).toISOString();

    const cache = { data, expires, created: new Date().toISOString() };
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  },

  delete(key) {
    const cacheFile = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  },

  clear() {
    const files = fs.readdirSync(this.cacheDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    });
  }
};

// 导出所有服务
export default {
  config: configService,
  apiKey: apiKeyService,
  task: taskService,
  cache: cacheService
};