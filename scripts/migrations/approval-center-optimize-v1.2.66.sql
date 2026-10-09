-- 审批中心优化迁移
-- 1) 历史数据归一化：meetings 早期提交写入「待审批」，统一为「审批中」（与其余 5 类申请一致）
UPDATE meetings SET status = '审批中' WHERE status = '待审批';

-- 2) 聚合接口（/home/approval-summary）加速索引：审批人+状态、申请人+状态
--    两列 VARCHAR(255) utf8mb4 全索引约 2040 字节，未超 InnoDB 3072 上限，故不使用前缀（ENUM 列不支持前缀）
CREATE INDEX idx_leave_approver_status        ON leave_applications (approver, status);
CREATE INDEX idx_leave_applicant_status      ON leave_applications (applicant, status);
CREATE INDEX idx_reimburse_approver_status    ON reimbursements (approver, status);
CREATE INDEX idx_reimburse_applicant_status  ON reimbursements (applicant, status);
CREATE INDEX idx_meetings_approver_status     ON meetings (approver, status);
CREATE INDEX idx_meetings_organizer_status    ON meetings (organizer, status);
CREATE INDEX idx_project_approver_status      ON project_applications (approver, status);
CREATE INDEX idx_project_applicant_status    ON project_applications (applicant_name, status);
CREATE INDEX idx_entertain_approver_status    ON entertainment_expenses (approver, status);
CREATE INDEX idx_entertain_applicant_status  ON entertainment_expenses (applicant, status);
CREATE INDEX idx_office_approver_status       ON office_supplies_applications (approver, status);
CREATE INDEX idx_office_applicant_status     ON office_supplies_applications (applicant, status);
CREATE INDEX idx_btrip_approver_status        ON business_trip_applications (approver, status);
CREATE INDEX idx_btrip_applicant_status      ON business_trip_applications (applicant_name, status);
