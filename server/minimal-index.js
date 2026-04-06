/**
 * 极简版服务器 - 无数据库、无复杂依赖
 * 纯文件系统存储，基础功能测试
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

// 数据目录
const DATA_DIR = path.join(__dirname, '../data');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  ['tasks', 'videos', 'cache'].forEach(subdir => {
    fs.mkdirSync(path.join(DATA_DIR, subdir), { recursive: true });
  });
}

app.use(cors());
app.use(express.json());

// ============================================================
// 数据存储服务（内联极简版）
// ============================================================
const storage = {
  // API Key存储
  apiKeyFile: path.join(DATA_DIR, 'api-keys.json'),
  getApiKeys() {
    if (!fs.existsSync(this.apiKeyFile)) {
      return { volcengine: null, aihubmix: null, default: 'volcengine' };
    }
    return JSON.parse(fs.readFileSync(this.apiKeyFile, 'utf-8'));
  },
  saveApiKeys(keys) {
    fs.writeFileSync(this.apiKeyFile, JSON.stringify(keys, null, 2));
  },

  // 任务存储
  tasksDir: path.join(DATA_DIR, 'tasks'),
  taskIndex: {},
  loadIndex() {
    const indexFile = path.join(this.tasksDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      this.taskIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    }
  },
  saveIndex() {
    const indexFile = path.join(this.tasksDir, 'index.json');
    fs.writeFileSync(indexFile, JSON.stringify(this.taskIndex, null, 2));
  },
  createTask(taskData) {
    const taskId = `task_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const taskDir = path.join(this.tasksDir, today);
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    const task = {
      id: taskId,
      date: today,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...taskData
    };

    const taskFile = path.join(taskDir, `${taskId}.json`);
    fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

    this.taskIndex[taskId] = {
      file: taskFile,
      date: today,
      status: task.status,
      createdAt: task.timestamp
    };
    this.saveIndex();

    return task;
  },
  getTask(taskId) {
    const index = this.taskIndex[taskId];
    if (!index || !fs.existsSync(index.file)) return null;
    return JSON.parse(fs.readFileSync(index.file, 'utf-8'));
  },
  getTasks() {
    return Object.values(this.taskIndex)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(index => this.getTask(index.id))
      .filter(Boolean);
  }
};

// 初始化
storage.loadIndex();

// ============================================================
// API路由
// ============================================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'no-database',
    version: '2.0-minimal'
  });
});

// API Key管理
app.get('/api/api-keys', (req, res) => {
  const keys = storage.getApiKeys();
  res.json({
    success: true,
    data: {
      default: keys.default,
      volcengine: !!keys.volcengine,
      aihubmix: !!keys.aihubmix
    }
  });
});

app.post('/api/api-keys', (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (!['volcengine', 'aihubmix'].includes(provider)) {
      return res.status(400).json({ success: false, error: '无效的供应商' });
    }

    const keys = storage.getApiKeys();
    keys[provider] = apiKey;
    storage.saveApiKeys(keys);

    res.json({ success: true, data: { message: '保存成功' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/api-keys/default', (req, res) => {
  try {
    const { provider } = req.body;
    if (!['volcengine', 'aihubmix'].includes(provider)) {
      return res.status(400).json({ success: false, error: '无效的供应商' });
    }

    const keys = storage.getApiKeys();
    keys.default = provider;
    storage.saveApiKeys(keys);

    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 供应商信息
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'volcengine', displayName: '火山方舟官方API' },
      { name: 'aihubmix', displayName: 'Aihubmix聚合API' }
    ]
  });
});

// 模型信息
app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'seedance-2.0', label: 'Seedance 2.0 全能模型' },
      { value: 'seedance-2.0-fast', label: 'Seedance 2.0 快速模型' }
    ]
  });
});

// 任务管理（简化版，不实际生成）
app.post('/api/tasks', (req, res) => {
  try {
    const { prompt, model, ratio, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: '提示词不能为空' });
    }

    // 检查API Key
    const keys = storage.getApiKeys();
    if (!keys.volcengine && !keys.aihubmix) {
      return res.status(400).json({ success: false, error: '请先配置API Key' });
    }

    const task = storage.createTask({
      prompt,
      model: model || 'seedance-2.0-fast',
      ratio: ratio || '16:9',
      duration: duration || '5',
      status: 'pending' // 暂时不实际生成，只记录任务
    });

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    const tasks = storage.getTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = storage.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 启动服务器
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 极简版服务器启动成功！');
  console.log(`🔗 服务器地址: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
  console.log(`🔑 认证方式: API Key`);
  console.log(`📊 当前任务数: ${Object.keys(storage.taskIndex).length}`);
  console.log('');
  console.log('📝 可用接口:');
  console.log('- GET  /api/health');
  console.log('- GET  /api/api-keys');
  console.log('- POST /api/api-keys');
  console.log('- GET  /api/tasks');
  console.log('- POST /api/tasks');
  console.log('');
});