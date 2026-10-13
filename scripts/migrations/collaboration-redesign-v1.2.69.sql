-- 协同申请重构 v1.2.69
-- 去掉审批模型，改为「意见征集 / 通知」两种轻量协作模式。
-- 发起方(project_applicants) 与 协同对象(project_collaborators) 均支持多条，
-- 自然覆盖 一对一 / 一对多 / 多对一。
-- 幂等：加列前校验 information_schema；建表使用 IF NOT EXISTS。

-- 1. project_applications 主表增加「模式」与「进行/结束」字段
SET @db = DATABASE();
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_applications' AND COLUMN_NAME='collaboration_mode');
SET @s1 = IF(@c1=0, 'ALTER TABLE project_applications ADD COLUMN collaboration_mode VARCHAR(20) NOT NULL DEFAULT ''opinion'' COMMENT ''协同模式: opinion=意见征集, notify=通知''', 'SELECT 1');
PREPARE stmt1 FROM @s1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_applications' AND COLUMN_NAME='expire_at');
SET @s2 = IF(@c2=0, 'ALTER TABLE project_applications ADD COLUMN expire_at DATETIME DEFAULT NULL COMMENT ''意见征集截止时间''', 'SELECT 1');
PREPARE stmt2 FROM @s2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SET @c3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='project_applications' AND COLUMN_NAME='close_status');
SET @s3 = IF(@c3=0, 'ALTER TABLE project_applications ADD COLUMN close_status VARCHAR(20) NOT NULL DEFAULT ''open'' COMMENT ''open=进行中, closed=已结束''', 'SELECT 1');
PREPARE stmt3 FROM @s3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 2. 发起方子表（多人联合发起 → 多对一 / 多对多）
CREATE TABLE IF NOT EXISTS project_applicants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  employee_id VARCHAR(50) DEFAULT NULL,
  name VARCHAR(50) NOT NULL,
  department VARCHAR(50) DEFAULT NULL,
  is_primary TINYINT NOT NULL DEFAULT 0 COMMENT '是否主发起人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pa_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协同申请-发起方';

-- 3. 协同对象子表（一对多 / 多对一；人员或部门）
CREATE TABLE IF NOT EXISTS project_collaborators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  target_type ENUM('user','dept') NOT NULL COMMENT 'user=人员, dept=部门',
  target_id VARCHAR(50) DEFAULT NULL,
  target_name VARCHAR(50) NOT NULL,
  dept VARCHAR(50) DEFAULT NULL,
  expected_role VARCHAR(200) DEFAULT NULL COMMENT '配合职责说明',
  ack_status ENUM('pending','acknowledged') NOT NULL DEFAULT 'pending' COMMENT '通知模式: 已知晓状态',
  ack_at DATETIME DEFAULT NULL,
  opinion_text TEXT DEFAULT NULL COMMENT '意见征集模式: 填写的意见',
  opinion_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pc_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='协同申请-协同对象';
