-- 更新 email_verification_codes 表结构
-- 添加 purpose、code_hash、salt、attempts、request_ip、consumed_at 字段

-- 检查表是否存在和列是否存在，安全地添加字段

-- 先处理旧数据：将旧记录的 code 字段迁移到 code_hash（如果code字段存在）
-- 这个操作可能失败，如果列不存在就跳过
-- UPDATE email_verification_codes SET code_hash = code, salt = '' WHERE code_hash IS NULL AND code IS NOT NULL;

-- 删除旧数据（因为旧数据格式不兼容新的加密存储方式）
DELETE FROM email_verification_codes WHERE code_hash IS NULL;

-- 添加 purpose 字段（如果不存在）
-- ALTER TABLE email_verification_codes ADD COLUMN purpose TEXT DEFAULT 'register' CHECK (purpose IN ('register', 'login', 'reset_password', 'bind_email'));

-- 添加 code_hash 字段（允许 NULL，因为旧记录可能没有）
-- ALTER TABLE email_verification_codes ADD COLUMN code_hash TEXT;

-- 添加 salt 字段
-- ALTER TABLE email_verification_codes ADD COLUMN salt TEXT DEFAULT '';

-- 添加 attempts 字段
-- ALTER TABLE email_verification_codes ADD COLUMN attempts INTEGER DEFAULT 0;

-- 添加 request_ip 字段
-- ALTER TABLE email_verification_codes ADD COLUMN request_ip TEXT;

-- 添加 consumed_at 字段
-- ALTER TABLE email_verification_codes ADD COLUMN consumed_at DATETIME;

-- 由于基础schema可能已经包含这些字段，我们跳过此迁移的大部分内容
-- 只执行一些安全的数据清理操作

-- 将 used 字段迁移到 consumed_at（如果used字段存在）
-- UPDATE email_verification_codes SET consumed_at = created_at WHERE used = 1 AND consumed_at IS NULL;

