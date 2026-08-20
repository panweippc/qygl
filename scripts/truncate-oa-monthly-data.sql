-- ============================================================
-- 一键清空 OA办公模块 + 月报模块 所有业务数据
-- 说明：
--   1. 仅清空业务数据表，保留表结构
--   2. 保留配置表：oa_approval_flows（审批流程定义）、
--      oa_approver_configs（审批人配置），避免影响下次申请
--   3. 因 weeklyReports 有外键引用 users，执行前临时禁用外键检查
--   4. 执行后自增 ID 从 1 重新开始
-- 使用方式：
--   mysql -u root -p qygl < scripts/truncate-oa-monthly-data.sql
-- 或在 Navicat / DBeaver 中直接运行
-- ============================================================

-- 关闭外键检查，避免因引用关系导致 TRUNCATE 失败
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- OA办公模块 业务数据表
-- ============================================================

-- 请假申请
TRUNCATE TABLE `leave_applications`;

-- 报销申请
TRUNCATE TABLE `reimbursements`;

-- 会议申请
TRUNCATE TABLE `meetings`;

-- 项目申请
TRUNCATE TABLE `project_applications`;

-- 办公用品申请
TRUNCATE TABLE `office_supplies_applications`;

-- 出差申请
TRUNCATE TABLE `business_trip_applications`;

-- 业务招待费申请
TRUNCATE TABLE `entertainment_expenses`;

-- 下发记录（OA审批下发）
TRUNCATE TABLE `distributed_records`;

-- OA审批实例（流转中的审批单）
TRUNCATE TABLE `oa_approval_instances`;

-- OA审批历史记录
TRUNCATE TABLE `oa_approval_history`;

-- 通用审批历史
TRUNCATE TABLE `approval_history`;

-- 通知消息（含请假审批提醒等）
TRUNCATE TABLE `notifications`;

-- ============================================================
-- 月报模块
-- ============================================================

-- 月报 / 周报
TRUNCATE TABLE `weeklyReports`;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 执行结果提示（可选，用于在客户端查看清空后状态）
-- ============================================================
SELECT '清空完成，各表当前数据量：' AS `结果`;

SELECT 'leave_applications' AS `表名`, COUNT(*) AS `剩余行数` FROM `leave_applications`
UNION ALL SELECT 'reimbursements', COUNT(*) FROM `reimbursements`
UNION ALL SELECT 'meetings', COUNT(*) FROM `meetings`
UNION ALL SELECT 'project_applications', COUNT(*) FROM `project_applications`
UNION ALL SELECT 'office_supplies_applications', COUNT(*) FROM `office_supplies_applications`
UNION ALL SELECT 'business_trip_applications', COUNT(*) FROM `business_trip_applications`
UNION ALL SELECT 'entertainment_expenses', COUNT(*) FROM `entertainment_expenses`
UNION ALL SELECT 'distributed_records', COUNT(*) FROM `distributed_records`
UNION ALL SELECT 'oa_approval_instances', COUNT(*) FROM `oa_approval_instances`
UNION ALL SELECT 'oa_approval_history', COUNT(*) FROM `oa_approval_history`
UNION ALL SELECT 'approval_history', COUNT(*) FROM `approval_history`
UNION ALL SELECT 'notifications', COUNT(*) FROM `notifications`
UNION ALL SELECT 'weeklyReports', COUNT(*) FROM `weeklyReports`;
