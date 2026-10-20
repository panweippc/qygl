-- 资料中心文件分类：新增「创建人」字段，支撑「仅创建人或管理员可删除分类」
-- 创建人存登录账号（与后端 req.user.name/username 一致），区分大小写由账号规则保证
ALTER TABLE file_categories ADD COLUMN createdBy VARCHAR(100) NULL COMMENT '分类创建人登录账号';
