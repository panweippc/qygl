-- =====================================================
-- 数据库迁移：账号生命周期与登录异常检测字段
-- 用途：支持"长期未登录自动停用"和"新IP登录异常检测"
-- 执行：在 qyglfb 库执行本脚本（幂等，可重复执行）
-- =====================================================

-- 1. users 表：添加最后登录时间、最后登录IP、账号状态字段
--    status: 1=正常, 0=停用（长期未登录自动停用后置0）
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `lastLoginAt` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间' AFTER `password`,
  ADD COLUMN IF NOT EXISTS `lastLoginIp` VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP' AFTER `lastLoginAt`,
  ADD COLUMN IF NOT EXISTS `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态: 1正常, 0停用' AFTER `lastLoginIp`,
  ADD INDEX IF NOT EXISTS `idx_users_lastLoginAt` (`lastLoginAt`);

-- 2. 初始化：把现有未停用账号的 lastLoginAt 设为当前时间（避免首次部署时把存量账号误判为长期未登录）
--    仅当 lastLoginAt 为空时填充
UPDATE `users`
SET `lastLoginAt` = NOW()
WHERE `lastLoginAt` IS NULL;
