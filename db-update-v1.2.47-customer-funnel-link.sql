-- ============================================================
-- v1.2.47 客户管理 ↔ 销售漏斗 双向关联 + 成交联动
-- ============================================================
-- 说明：
--   应用启动后会通过 customers.js 的 ensureCustomerColumns 自动给
--   customers 表补 source 列（来源标记）。本脚本用于显式记录与手工补列，
--   以及把【已有】漏斗客户一次性回填到客户管理（可选，仅执行一次）。
--   关联键为「客户名称」(customers.name ↔ 漏斗 customer_name)，无需新增外键列。

-- 1) 补列（幂等，已存在则跳过）
ALTER TABLE `customers`
  ADD COLUMN `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL
  COMMENT '来源：销售漏斗 / 手动录入';
ALTER TABLE `customers`
  ADD INDEX `idx_customers_source` (`source` ASC);

-- 2) 可选回填：将漏斗中已存在的客户一次性同步进客户管理（按客户名称去重，不覆盖已有）
--    成交用户(sales_deal_customers) → 客户状态「成交」；其余 → 「意向」
INSERT INTO `customers` (name, contact, phone, status, tags, source, createdAt)
SELECT f.customer_name, f.contact, f.phone,
       CASE f.stage WHEN 'deal' THEN '成交' ELSE '意向' END,
       '来源:销售漏斗', '销售漏斗', NOW()
FROM (
  SELECT customer_name, contact, phone, 'intention' AS stage
    FROM sales_intention_funnel WHERE customer_name <> '' AND customer_name IS NOT NULL
  UNION ALL
  SELECT customer_name, contact, phone, 'key'
    FROM sales_key_funnel WHERE customer_name <> '' AND customer_name IS NOT NULL
  UNION ALL
  SELECT customer_name, contact, phone, 'deal'
    FROM sales_deal_customers WHERE customer_name <> '' AND customer_name IS NOT NULL
) f
WHERE NOT EXISTS (SELECT 1 FROM `customers` c WHERE c.name = f.customer_name);
