-- 协同申请增强 v1.2.70
-- 目标：参与人/抄送 角色细分 + 链式转发(追加协同对象)。
-- 1) project_collaborators 增加 collab_role：participant=参与人(需响应) / cc=抄送(仅知会)。
--    旧数据默认 participant，向后兼容（原有协同对象均为需响应方）。
-- 2) project_collaborators 增加 added_by：记录"由谁追加"（链式转发场景）；
--    初始发起时写入的协同对象 added_by 为 NULL，以区分"初始"与"链上加的人"。
-- 幂等：加列前校验 information_schema；建表使用 IF NOT EXISTS。

SET @db = DATABASE();

SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_collaborators' AND COLUMN_NAME='collab_role');
SET @s1 = IF(@c1=0, 'ALTER TABLE project_collaborators ADD COLUMN collab_role VARCHAR(20) NOT NULL DEFAULT ''participant'' COMMENT ''participant=参与人(需响应), cc=抄送(仅知会)'' AFTER expected_role', 'SELECT 1');
PREPARE stmt1 FROM @s1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_collaborators' AND COLUMN_NAME='added_by');
SET @s2 = IF(@c2=0, 'ALTER TABLE project_collaborators ADD COLUMN added_by VARCHAR(50) DEFAULT NULL COMMENT ''追加人(链式转发)；初始协同对象为 NULL'' AFTER collab_role', 'SELECT 1');
PREPARE stmt2 FROM @s2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
