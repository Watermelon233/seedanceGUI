-- ============================================
-- 迁移到API供应商架构
-- 删除session机制，添加API供应商支持
-- ============================================

-- 步骤1：删除旧的表和索引

-- 删除session相关索引
DROP INDEX IF EXISTS idx_sessions_session_id;
DROP INDEX IF EXISTS idx_sessions_expires_at;

-- 删除session表
DROP TABLE IF EXISTS sessions;

-- 删除即梦Session账号相关索引
DROP INDEX IF EXISTS idx_jimeng_session_accounts_user_id;
DROP INDEX IF EXISTS idx_jimeng_session_accounts_default_per_user;

-- 删除即梦Session账号表
DROP TABLE IF EXISTS jimeng_session_accounts;

-- 步骤2：为users表添加API供应商相关字段
-- 创建一个新表包含所有字段，然后复制数据
-- 这样可以避免SQLite的ALTER TABLE限制

-- 检查列是否存在，如果不存在则添加
-- SQLite不支持直接检查，所以我们会遇到错误时忽略

-- 首先尝试创建users表的备份并重建
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  credits INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_check_in_at DATETIME,
  api_provider TEXT DEFAULT 'volcengine',
  volcengine_api_key TEXT,
  aihubmix_api_key TEXT,
  api_key_name TEXT DEFAULT '默认API密钥'
);

-- 复制现有数据到新表
INSERT INTO users_new (id, email, password_hash, role, status, credits, created_at, updated_at, last_check_in_at)
SELECT id, email, password_hash, role, status, credits, created_at, updated_at, last_check_in_at FROM users;

-- 删除旧表
DROP TABLE users;

-- 重命名新表
ALTER TABLE users_new RENAME TO users;

-- 重新创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 步骤3：为tasks表添加供应商字段
-- 使用相同的重建表方法

CREATE TABLE IF NOT EXISTS tasks_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  prompt TEXT,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  history_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  completed_at DATETIME,
  -- 批量管理相关字段
  task_kind TEXT DEFAULT 'draft',
  source_task_id INTEGER,
  row_group_id TEXT,
  row_index INTEGER,
  video_count INTEGER DEFAULT 1,
  output_index INTEGER,
  submit_id TEXT,
  item_id TEXT,
  -- 下载管理相关字段
  download_status TEXT DEFAULT 'pending',
  download_path TEXT,
  downloaded_at DATETIME,
  account_info TEXT,
  progress INTEGER DEFAULT 0,
  -- API供应商字段
  api_provider TEXT DEFAULT 'volcengine',
  user_id INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 复制现有数据到新表
INSERT INTO tasks_new (
  id, project_id, prompt, status, video_url, history_id, created_at, updated_at,
  submitted_at, completed_at, task_kind, source_task_id, row_group_id, row_index,
  video_count, output_index, submit_id, item_id, download_status, download_path,
  downloaded_at, account_info, progress, user_id
)
SELECT
  id, project_id, prompt, status, video_url, history_id, created_at, updated_at,
  submitted_at, completed_at, task_kind, source_task_id, row_group_id, row_index,
  video_count, output_index, submit_id, item_id, download_status, download_path,
  downloaded_at, account_info, progress, user_id
FROM tasks;

-- 删除旧表
DROP TABLE tasks;

-- 重命名新表
ALTER TABLE tasks_new RENAME TO tasks;

-- 重新创建tasks表的索引
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- 步骤4：创建新的索引提升查询性能

-- 为新的API供应商字段创建索引
CREATE INDEX IF NOT EXISTS idx_users_api_provider ON users(api_provider);
CREATE INDEX IF NOT EXISTS idx_tasks_api_provider ON tasks(api_provider);

-- 步骤5：更新系统配置

-- 删除旧的session_id配置
DELETE FROM settings WHERE key = 'session_id';

-- 添加新的API供应商配置
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('default_api_provider', 'volcengine'),
  ('volcengine_api_enabled', 'true'),
  ('aihubmix_api_enabled', 'true');

-- 步骤6：数据迁移

-- 为现有用户设置默认API供应商
UPDATE users SET api_provider = 'volcengine' WHERE api_provider IS NULL;

-- 步骤7：创建触发器确保数据一致性

-- 确保用户有至少一个有效的API供应商配置
CREATE TRIGGER IF NOT EXISTS validate_user_api_provider
  BEFORE UPDATE OF api_provider ON users
  WHEN NEW.api_provider NOT IN ('volcengine', 'aihubmix')
BEGIN
  SELECT RAISE(ABORT, 'Invalid API provider');
END;

-- 步骤8：添加注释说明

-- 用户表字段说明
-- api_provider: 用户选择的API供应商 ('volcengine' 或 'aihubmix')
-- volcengine_api_key: 火山方舟官方API的密钥
-- aihubmix_api_key: Aihubmix聚合API的密钥
-- api_key_name: 用户自定义的API密钥名称

-- 任务表字段说明
-- api_provider: 任务使用的API供应商，继承自用户设置

-- ============================================
-- 迁移验证查询
-- ============================================

-- 验证表结构
SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('users', 'tasks');

-- 验证字段是否添加成功
PRAGMA table_info(users);
PRAGMA table_info(tasks);

-- 验证索引是否创建成功
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%api_provider%';

-- 验证默认数据
SELECT COUNT(*) as users_with_default_provider FROM users WHERE api_provider = 'volcengine';

-- ============================================
-- 回滚脚本（如需回滚，请执行以下SQL）
-- ============================================

/*
-- 回滚用户表字段修改
ALTER TABLE users DROP COLUMN api_provider;
ALTER TABLE users DROP COLUMN volcengine_api_key;
ALTER TABLE users DROP COLUMN aihubmix_api_key;
ALTER TABLE users DROP COLUMN api_key_name;

-- 回滚任务表字段修改
ALTER TABLE tasks DROP COLUMN api_provider;

-- 回滚索引
DROP INDEX IF EXISTS idx_users_api_provider;
DROP INDEX IF EXISTS idx_tasks_api_provider;

-- 回滚配置
DELETE FROM settings WHERE key IN ('default_api_provider', 'volcengine_api_enabled', 'aihubmix_api_enabled');

-- 回滚触发器
DROP TRIGGER IF EXISTS validate_user_api_provider;

-- 重新创建旧表（如需要恢复数据）
-- 注意：这些表的结构基于迁移前的状态
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jimeng_session_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT DEFAULT '',
  session_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  is_enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, session_id)
);

-- 重新创建旧索引
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_jimeng_session_accounts_user_id ON jimeng_session_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jimeng_session_accounts_default_per_user
  ON jimeng_session_accounts(user_id)
  WHERE is_default = 1;
*/