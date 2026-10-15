-- 删除 project_applicants 表：协同申请不再支持多对一联合发起人
-- 多对一逻辑已整体移除，该子表不再使用
DROP TABLE IF EXISTS project_applicants;
