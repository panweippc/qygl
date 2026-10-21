// 资料中心权限工具：分类创建人拥有该分类下文件/文章/项目信息的增删改权，
// 管理员白名单保留全权，其他成员只读 + 下载（前端隐藏入口 + 后端逐接口校验双层防护）。
import { isBuiltinAdmin, resolveIdentity } from '../middleware/auth.js';

// 管理员白名单：与 knowledge.js / files.js / projects.js 同一口径
export const RESOURCE_MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

/**
 * 解析当前登录用户的资料中心身份。
 * 角色以数据库为准（resolveIdentity 查 employees/roles 表），不信任 token 内声明。
 * @returns {{ admin: boolean, name: string }} admin=管理员白名单；name=真实姓名
 */
export const getResourceIdentity = async (pool, req) => {
  try {
    const identity = await resolveIdentity(pool, req);
    if (!identity) return { admin: false, name: '' };
    return {
      admin: identity.isBuiltinAdmin || RESOURCE_MANAGER_ROLES.includes(identity.roleName),
      name: identity.username || ''
    };
  } catch (e) {
    return { admin: false, name: '' };
  }
};

// 取资料分类创建人（file_categories.createdBy）；分类不存在或无创建人返回 ''
export const getCategoryCreator = async (pool, categoryId) => {
  if (categoryId === null || categoryId === undefined || categoryId === '' || Number.isNaN(Number(categoryId))) return '';
  const [rows] = await pool.execute('SELECT createdBy FROM file_categories WHERE id = ?', [categoryId]);
  return rows.length > 0 ? String(rows[0].createdBy || '') : '';
};

/**
 * 当前用户是否可管理指定分类下的内容（管理员 或 分类创建人）。
 * 用于：上传文件、写文章、新增项目、调整归属等「写入目标分类」的校验。
 */
export const canManageCategoryContent = async (pool, req, categoryId) => {
  const { admin, name } = await getResourceIdentity(pool, req);
  if (admin) return true;
  if (!name) return false;
  const creator = await getCategoryCreator(pool, categoryId);
  return !!creator && creator === name;
};

// 同上，但按分类名匹配（项目信息按 category_name 字符串关联资料分类）
export const canManageCategoryContentByName = async (pool, req, categoryName) => {
  const { admin, name } = await getResourceIdentity(pool, req);
  if (admin) return true;
  if (!name || !categoryName) return false;
  const [rows] = await pool.execute('SELECT createdBy FROM file_categories WHERE name = ? LIMIT 1', [categoryName]);
  const creator = rows.length > 0 ? String(rows[0].createdBy || '') : '';
  return !!creator && creator === name;
};

// 统一 403 响应
export const denyCategoryWrite = (res, message) => {
  res.status(403).json({ success: false, message });
};
