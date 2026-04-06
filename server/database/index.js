import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/seedance.db');

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

/**
 * 初始化数据库
 */
export function initDatabase() {
  if (db) return db;

  db = new Database(DB_PATH);

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 确保applied_migrations表存在（用于迁移系统）
  db.exec(`
    CREATE TABLE IF NOT EXISTS applied_migrations (
      file TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingTableCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'applied_migrations'
  `).get().count;

  if (existingTableCount === 0) {
    // 读取并执行 Schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // 执行 Schema（支持多条 SQL 语句）
    db.exec(schema);
  }

  // 应用迁移
  applyMigrations(db);

  console.log(`[database] 数据库初始化成功：${DB_PATH}`);
  return db;
}

/**
 * 应用数据库迁移
 */
function shouldSkipMigration(db, file) {
  // 检查我们的新迁移是否已经应用
  const hasNewMigration = db.prepare(`
    SELECT 1 FROM applied_migrations WHERE file = '20260406_migrate_to_api_providers.sql'
  `).get();

  if (hasNewMigration) {
    // 如果新迁移已应用，跳过所有jimeng_session相关的迁移
    if (file.includes('jimeng_session')) {
      return true;
    }
  }

  if (file === '20260325_add_batch_task_persistence.sql') {
    const columns = db.prepare(`PRAGMA table_info(tasks)`).all();
    const columnNames = new Set(columns.map((column) => column.name));

    return [
      'task_kind',
      'source_task_id',
      'row_group_id',
      'row_index',
      'video_count',
      'output_index',
      'submit_id',
      'item_id',
      'submitted_at',
    ].every((columnName) => columnNames.has(columnName));
  }

  if (file === '20260330_add_jimeng_session_account_activation.sql') {
    // 检查表是否存在，如果表不存在说明已经被新的API供应商迁移删除
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='jimeng_session_accounts'
    `).get();

    if (!tableExists) {
      // 表已被删除，跳过此迁移
      return true;
    }

    const columns = db.prepare(`PRAGMA table_info(jimeng_session_accounts)`).all();
    const columnNames = new Set(columns.map((column) => column.name));
    return ['is_enabled', 'priority'].every((columnName) => columnNames.has(columnName));
  }

  return false;
}

function applyMigrations(db) {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  // 创建迁移记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const insertAppliedMigration = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  // 获取已应用的迁移
  const stmt = db.prepare('SELECT version FROM schema_migrations ORDER BY version');
  const applied = stmt.all().map(row => row.version);

  // 读取迁移文件
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // 应用未应用的迁移
  for (const file of files) {
    if (applied.includes(file)) {
      continue;
    }

    if (shouldSkipMigration(db, file)) {
      console.log(`[database] 跳过已包含于基线 schema 的迁移：${file}`);
      insertAppliedMigration.run(file);
      continue;
    }

    console.log(`[database] 应用迁移：${file}`);
    const migrationPath = path.join(migrationsDir, file);
    const migration = fs.readFileSync(migrationPath, 'utf-8');
    db.exec(migration);
    insertAppliedMigration.run(file);
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[database] 数据库连接已关闭');
  }
}

/**
 * 以事务方式执行多个操作
 */
export function transaction(fn) {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction();
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  transaction,
};
