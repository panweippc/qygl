-- 审批生命周期审计日志表（方案D 迁移）
-- 记录每一条 OA 申请从「提交」到「最终归档」的完整动作链，
-- 覆盖 提交/批准/拒绝/转发/退回/撤回/重新提交/下发/处理，
-- 用于纠纷留证与完整生命周期回溯。
CREATE TABLE IF NOT EXISTS approval_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_type VARCHAR(32) NOT NULL COMMENT 'leave/reimbursement/entertainment/meeting/businessTrip/project',
  application_id INT NOT NULL,
  actor VARCHAR(64) NOT NULL COMMENT '操作人姓名',
  actor_role VARCHAR(32) NOT NULL DEFAULT '' COMMENT '申请人/审批人/系统',
  action VARCHAR(32) NOT NULL COMMENT 'submit/approve/reject/return/forward/withdraw/resubmit/distribute/process',
  from_status VARCHAR(32) NOT NULL DEFAULT '',
  to_status VARCHAR(32) NOT NULL DEFAULT '',
  comment TEXT,
  target_user VARCHAR(64) NOT NULL DEFAULT '' COMMENT '转发/下发目标人',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app (application_type, application_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批生命周期审计日志';
