-- v1.2.84：资料分类增加负责人字段
-- file_categories 增加 owner 列（负责人，可空），创建/编辑分类时填写，资料中心左侧分类列表展示
-- 幂等写法：information_schema 预检，列已存在则跳过
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'file_categories' AND column_name = 'owner');
SET @sql = IF(@col = 0, 'ALTER TABLE `file_categories` ADD COLUMN `owner` VARCHAR(255) DEFAULT '''' COMMENT ''资料分类负责人（创建分类时填写，资料中心分类列表展示）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
