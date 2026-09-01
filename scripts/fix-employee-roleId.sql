-- =============================================
-- 员工角色分配修复脚本
-- 根据员工的部门和职位，自动分配正确的 roleId
-- 在 MySQL 中执行此脚本
-- =============================================

USE qyglfb;

-- 步骤1：根据部门+职位匹配角色，更新 roleId
-- 总经理
UPDATE employees e
JOIN roles r ON r.name = '总经理'
SET e.roleId = r.id
WHERE e.department = '管理部门' 
  AND e.position = '总经理'
  AND e.roleId IS NULL AND e.name <> '潘伟';

-- 财务总监
UPDATE employees e
JOIN roles r ON r.name = '财务总监'
SET e.roleId = r.id
WHERE e.department = '财务部' 
  AND e.position = '财务总监'
  AND e.roleId IS NULL AND e.name <> '潘伟';

-- 技术部经理
UPDATE employees e
JOIN roles r ON r.name = '技术部经理'
SET e.roleId = r.id
WHERE e.department = '技术部' 
  AND e.position LIKE '%经理%'
  AND e.roleId IS NULL AND e.name <> '潘伟';

-- 销售部经理
UPDATE employees e
JOIN roles r ON r.name = '销售部经理'
SET e.roleId = r.id
WHERE e.department = '销售部' 
  AND e.position LIKE '%经理%'
  AND e.roleId IS NULL AND e.name <> '潘伟';

-- 业务中心经理
UPDATE employees e
JOIN roles r ON r.name = '业务中心经理'
SET e.roleId = r.id
WHERE e.department = '业务中心' 
  AND e.position LIKE '%经理%'
  AND e.roleId IS NULL AND e.name <> '潘伟';

-- 其他所有普通员工（技术部/销售部/业务中心/人力资源部的非经理职位）
UPDATE employees e
JOIN roles r ON r.name = '普通员工'
SET e.roleId = r.id
WHERE e.roleId IS NULL AND e.name <> '潘伟';

-- 步骤2：验证结果
SELECT '=== 员工角色分配验证 ===' AS info;
SELECT 
  e.id,
  e.name AS '员工',
  e.department AS '部门',
  e.position AS '职位',
  r.name AS '角色',
  CASE WHEN e.roleId IS NULL THEN '❌ 未分配' ELSE '✅ 已分配' END AS '状态'
FROM employees e
LEFT JOIN roles r ON e.roleId = r.id
ORDER BY e.id;

SELECT '=== 未分配角色的员工 ===' AS info;
SELECT id, name, department, position FROM employees WHERE roleId IS NULL;
