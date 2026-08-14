-- =====================================================
-- 数据库迁移：账号生命周期与登录异常检测字段
-- 兼容：MySQL 5.7 / 8.0（不使用 ADD COLUMN IF NOT EXISTS 等 8.0+ 专有语法，
--       改用存储过程 + information_schema 判断，幂等可重复执行）
-- 执行：在 qyglfb 库执行本脚本（可重复执行）
-- 用法：mysql -uHY -p qyglfb < db-add-account-fields.sql
-- =====================================================

-- 切换到目标库（请按实际库名修改）
USE `qyglfb`;

DELIMITER $$

DROP PROCEDURE IF EXISTS `add_account_fields`$$

CREATE PROCEDURE `add_account_fields`()
BEGIN
    -- 添加 lastLoginAt 列（若不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'lastLoginAt'
    ) THEN
        ALTER TABLE `users` ADD COLUMN `lastLoginAt` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间' AFTER `password`;
    END IF;

    -- 添加 lastLoginIp 列（若不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'lastLoginIp'
    ) THEN
        ALTER TABLE `users` ADD COLUMN `lastLoginIp` VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP' AFTER `lastLoginAt`;
    END IF;

    -- 添加 status 列（若不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status'
    ) THEN
        ALTER TABLE `users` ADD COLUMN `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态: 1正常, 0停用' AFTER `lastLoginIp`;
    END IF;

    -- 添加索引 idx_users_lastLoginAt（若不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_lastLoginAt'
    ) THEN
        ALTER TABLE `users` ADD INDEX `idx_users_lastLoginAt` (`lastLoginAt`);
    END IF;
END$$

DELIMITER ;

-- 执行迁移
CALL `add_account_fields`();

-- 清理：移除存储过程（避免重复定义）
DROP PROCEDURE IF EXISTS `add_account_fields`;

-- 初始化：把存量账号的 lastLoginAt 设为当前时间（避免首次部署误判为长期未登录）
UPDATE `users` SET `lastLoginAt` = NOW() WHERE `lastLoginAt` IS NULL;
