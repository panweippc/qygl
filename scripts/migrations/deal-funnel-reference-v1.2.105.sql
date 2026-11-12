-- v1.2.105 成交用户表新增「漏斗迁入参考值」列
-- 背景：方案A+ 把成交阈值从 91-100% 收窄为 100%（重点 41-99%）。
--       漏斗按 100% 迁入成交表时，成交特有的金额字段（合同额/实际金额/回款金额/
--       约定回款日期）在漏斗表单里根本不存在，新记录这些字段全为 0 或空，
--       需要明确提示用户随后补录；同时不能把漏斗的「预计值」当成实际财务数据写入。
-- 内容：sales_deal_customers 加 funnel_reference TEXT，存迁入时的漏斗预计值 JSON。
--       非空即代表「由漏斗自动迁入」，供列表「待补录」标签与编辑弹窗灰色参考展示使用。
-- 幂等：information_schema 预检 + PREPARE，重复执行不会报错。

SET @c1 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_deal_customers' AND column_name = 'funnel_reference');
SET @sql1 = IF(@c1 = 0, 'ALTER TABLE `sales_deal_customers` ADD COLUMN `funnel_reference` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT ''漏斗迁入参考值 JSON，仅作补录核对参照''', 'SELECT 1');
PREPARE _s1 FROM @sql1; EXECUTE _s1; DEALLOCATE PREPARE _s1;
