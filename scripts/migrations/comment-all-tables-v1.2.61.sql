-- 自动生成的表注释 SQL
-- 来源：数据库表说明.md
-- 生成脚本：scripts/generate-table-comments-sql.js
-- 表数量：69
-- 说明：为所有业务表统一设置表级注释；幂等，可重复执行。
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE `departments` COMMENT = '部门字典';
ALTER TABLE `employee_roles` COMMENT = '员工角色关联';
ALTER TABLE `menus` COMMENT = '系统导航菜单';
ALTER TABLE `operation_logs` COMMENT = '操作日志';
ALTER TABLE `role_button_permissions` COMMENT = '角色按钮权限';
ALTER TABLE `role_permissions` COMMENT = '角色菜单权限';
ALTER TABLE `roles` COMMENT = '角色定义';
ALTER TABLE `users` COMMENT = '登录账号';
ALTER TABLE `announcements` COMMENT = '系统公告';
ALTER TABLE `employees` COMMENT = '员工详细信息';
ALTER TABLE `approval_history` COMMENT = '通用审批历史（工作流引擎）';
ALTER TABLE `approval_logs` COMMENT = '审批生命周期审计日志';
ALTER TABLE `business_trip_applications` COMMENT = '出差申请';
ALTER TABLE `distributed_records` COMMENT = '审批下发记录';
ALTER TABLE `entertainment_expenses` COMMENT = '招待费申请';
ALTER TABLE `leave_applications` COMMENT = '请假申请';
ALTER TABLE `meetings` COMMENT = '会议申请';
ALTER TABLE `oa_approval_flows` COMMENT = '审批流程定义';
ALTER TABLE `oa_approval_history` COMMENT = '审批操作历史';
ALTER TABLE `oa_approval_instances` COMMENT = 'OA审批实例核心表';
ALTER TABLE `oa_approver_configs` COMMENT = '审批人配置';
ALTER TABLE `office_supplies_applications` COMMENT = '办公用品申请';
ALTER TABLE `project_applications` COMMENT = '协同/项目立项申请';
ALTER TABLE `reimbursements` COMMENT = '报销申请';
ALTER TABLE `branch_contexts` COMMENT = '分支上下文';
ALTER TABLE `process_definitions` COMMENT = '流程定义（可拖拽配置）';
ALTER TABLE `process_instances` COMMENT = '流程实例';
ALTER TABLE `process_tasks` COMMENT = '流程任务';
ALTER TABLE `weeklyreports` COMMENT = '月报（周报表）';
ALTER TABLE `city_sales` COMMENT = '市级销售数据';
ALTER TABLE `county_sales` COMMENT = '区县级销售数据';
ALTER TABLE `sales_deal_customers` COMMENT = '成交用户表';
ALTER TABLE `sales_funnel_data` COMMENT = '销售漏斗数据（通用四表底层）';
ALTER TABLE `sales_funnel_stages` COMMENT = '销售漏斗阶段字典';
ALTER TABLE `sales_intention_funnel` COMMENT = '意向漏斗表';
ALTER TABLE `sales_key_funnel` COMMENT = '重点漏斗表';
ALTER TABLE `sales_project_analysis` COMMENT = '大项目进展主表';
ALTER TABLE `sales_project_competitors` COMMENT = '大项目·竞争对手子表';
ALTER TABLE `sales_project_key_persons` COMMENT = '大项目·关键人物子表';
ALTER TABLE `sales_project_visit_records` COMMENT = '大项目·拜访记录子表';
ALTER TABLE `sales_table_versions` COMMENT = '销售四表版本快照';
ALTER TABLE `sales_targets` COMMENT = '销售目标';
ALTER TABLE `town_sales` COMMENT = '乡镇级销售数据';
ALTER TABLE `customer_activities` COMMENT = '客户跟进活动';
ALTER TABLE `customers` COMMENT = '客户基本信息';
ALTER TABLE `visit_records` COMMENT = '客户拜访记录';
ALTER TABLE `category_projects` COMMENT = '资料中心·项目信息';
ALTER TABLE `closing_projects` COMMENT = '成交项目';
ALTER TABLE `projects` COMMENT = '项目基本信息';
ALTER TABLE `file_categories` COMMENT = '文件分类字典';
ALTER TABLE `files` COMMENT = '文件存储记录';
ALTER TABLE `knowledge_articles` COMMENT = '知识库文章';
ALTER TABLE `knowledge_categories` COMMENT = '知识库分类';
ALTER TABLE `tools` COMMENT = '工具入库';
ALTER TABLE `asset_categories` COMMENT = '资产分类';
ALTER TABLE `asset_inventories` COMMENT = '资产盘点单';
ALTER TABLE `asset_inventory_items` COMMENT = '盘点明细';
ALTER TABLE `asset_logs` COMMENT = '资产操作流水';
ALTER TABLE `assets` COMMENT = '资产台账';
ALTER TABLE `chat_conversations` COMMENT = '聊天会话';
ALTER TABLE `chat_members` COMMENT = '会话成员';
ALTER TABLE `chat_messages` COMMENT = '聊天消息';
ALTER TABLE `notifications` COMMENT = '系统通知';
ALTER TABLE `monitor_alerts` COMMENT = '监控告警记录';
ALTER TABLE `monitor_metrics` COMMENT = '监控指标采集';
ALTER TABLE `cities` COMMENT = '城市字典';
ALTER TABLE `counties` COMMENT = '区县字典';
ALTER TABLE `provinces` COMMENT = '省份字典';
ALTER TABLE `schema_migrations` COMMENT = '数据库迁移执行跟踪';

SET FOREIGN_KEY_CHECKS = 1;
