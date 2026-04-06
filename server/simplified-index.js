/**
 * 简化版服务器 - 无数据库架构
 * 纯个人使用，基于API Key认证
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
// import { initializeProviders } from './services/providers/index.js';
import fileStorage from './services/fileStorage.js';
import taskManager from './services/simplifiedTaskManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// 初始化
console.log('🚀 启动简化版服务器...');
console.log('📁 数据目录:', path.join(__dirname, '../data'));

// 暂时注释掉供应商初始化，避免ESM导入问题
// initializeProviders();

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  ['tasks', 'videos', 'cache'].forEach(subdir => {
    fs.mkdirSync(path.join(dataDir, subdir), { recursive: true });
  });
}

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ============================================================
// 认证中间件（简化版）
// ============================================================
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: '需要API Key' });
  }

  // 验证API Key格式
  const keys = fileStorage.apiKey.getApiKeys();
  const isValidKey =
    (keys.volcengine && keys.volcengine === apiKey) ||
    (keys.aihubmix && keys.aihubmix === apiKey);

  if (!isValidKey) {
    return res.status(401).json({ error: 'API Key无效' });
  }

  req.apiKey = apiKey;
  req.provider = Object.keys(keys).find(key => keys[key] === apiKey);
  next();
};

// ============================================================
// 系统信息
// ============================================================
app.get('/api/health', (req, res) => {
  const stats = taskManager.getStats();
  res.json({
    status: 'ok',
    mode: 'api-key-auth',
    version: '2.0-simplified',
    stats: stats
  });
});

// ============================================================
// 配置管理
// ============================================================
app.get('/api/config', (req, res) => {
  const config = fileStorage.config.getConfig();
  res.json({ success: true, data: config });
});

app.put('/api/config', (req, res) => {
  try {
    const config = fileStorage.config.updateConfig(req.body);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// API Key管理
// ============================================================
app.get('/api/api-keys', (req, res) => {
  try {
    const keys = fileStorage.apiKey.getApiKeys();
    // 不返回完整的API Key，只返回是否存在
    const safeKeys = {
      default: keys.default,
      volcengine: !!keys.volcengine,
      aihubmix: !!keys.aihubmix
    };
    res.json({ success: true, data: safeKeys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/api-keys', (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!['volcengine', 'aihubmix'].includes(provider)) {
      return res.status(400).json({ success: false, error: '无效的供应商' });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, error: 'API Key不能为空' });
    }

    const keys = fileStorage.apiKey.setApiKey(provider, apiKey.trim());
    res.json({ success: true, data: { message: 'API Key保存成功' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/api-keys/:provider', (req, res) => {
  try {
    const { provider } = req.params;

    if (!['volcengine', 'aihubmix'].includes(provider)) {
      return res.status(400).json({ success: false, error: '无效的供应商' });
    }

    const keys = fileStorage.apiKey.setApiKey(provider, null);
    res.json({ success: true, data: { success: true } });
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

    const keys = fileStorage.apiKey.setDefaultProvider(provider);
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 供应商信息（简化版，直接返回硬编码数据）
// ============================================================
app.get('/api/providers', (req, res) => {
  res.json({
    success: true,
    data: [
      { name: 'volcengine', displayName: '火山方舟官方API' },
      { name: 'aihubmix', displayName: 'Aihubmix聚合API' }
    ]
  });
});

app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'seedance-2.0', label: 'Seedance 2.0 全能模型' },
      { value: 'seedance-2.0-fast', label: 'Seedance 2.0 快速模型' },
      { value: 'seedance-2.0-vip', label: 'Seedance 2.0 全能模型 (VIP 720p)' },
      { value: 'seedance-2.0-fast-vip', label: 'Seedance 2.0 快速模型 (VIP 720p)' }
    ]
  });
});

// ============================================================
// 任务管理
// ============================================================
app.post('/api/tasks', upload.array('files', 10), async (req, res) => {
  try {
    const { prompt, model, ratio, duration, provider } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: '提示词不能为空' });
    }

    // 检查API Key
    const apiKey = fileStorage.apiKey.getDefaultApiKey();
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请先配置API Key' });
    }

    // 处理文件
    const files = req.files ? req.files.map(file => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname
    })) : [];

    const task = await taskManager.createTask({
      prompt,
      model: model || 'seedance-2.0-fast',
      ratio: ratio || '16:9',
      duration: duration || '5',
      provider,
      files
    });

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = taskManager.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    const { date, status, limit } = req.query;
    const tasks = taskManager.getTasks({
      date,
      status,
      limit: parseInt(limit) || 50
    });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const deleted = taskManager.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tasks/:id/cancel', (req, res) => {
  try {
    taskManager.cancelTask(req.params.id);
    res.json({ success: true, data: { cancelled: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 统计信息
// ============================================================
app.get('/api/stats', (req, res) => {
  try {
    const stats = taskManager.getStats();
    const config = fileStorage.config.getConfig();

    res.json({
      success: true,
      data: {
        tasks: stats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          defaultProvider: config.defaultProvider
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 清理操作
// ============================================================
app.post('/api/cleanup', (req, res) => {
  try {
    const { days } = req.body;
    const deletedCount = taskManager.cleanup(parseInt(days) || 30);

    // 清理缓存
    fileStorage.cache.clear();

    res.json({
      success: true,
      data: {
        deletedTasks: deletedCount,
        message: `清理了 ${deletedCount} 个旧任务`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 静态文件服务（前端）
// ============================================================
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // 移除通配符路由，避免路由错误
  // 如果需要SPA路由支持，请在前端使用history mode
}

// ============================================================
// 错误处理
// ============================================================
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: error.message || '服务器内部错误'
  });
});

// ============================================================
// 启动服务器
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 简化版服务器启动成功！');
  console.log(`🔗 服务器地址: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${dataDir}`);
  console.log(`🔑 认证方式: API Key`);
  console.log(`📊 任务统计:`, taskManager.getStats());
  console.log('');
  console.log('📝 使用说明:');
  console.log('1. 配置API Key: POST /api/api-keys');
  console.log('2. 创建任务: POST /api/tasks');
  console.log('3. 查询任务: GET /api/tasks/:id');
  console.log('4. 任务列表: GET /api/tasks');
  console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  fileStorage.task.saveIndex(); // 保存索引
  process.exit(0);
});