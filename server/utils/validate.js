/**
 * 后端通用输入校验工具
 * 提供字段类型/长度/格式校验，作为各接口入参校验的统一入口。
 * 设计原则：
 *   - 只做边界与格式校验（防超长、防类型错误、防明显非法输入）
 *   - 不改变业务逻辑，仅在不符合时返回校验错误
 *   - 依赖 SQL 参数化（pool.execute 占位符）防注入，本工具补充字段合法性校验
 */

/** 校验结果对象：{ ok: boolean, error?: string } */
export const check = {
  /** 必填字符串：非空且长度在 [min, max] 之间 */
  str(value, label, { required = true, min = 1, max = 255 } = {}) {
    if (value === undefined || value === null) {
      if (required) return { ok: false, error: `${label}不能为空` };
      return { ok: true };
    }
    if (typeof value !== 'string') {
      return { ok: false, error: `${label}格式不正确` };
    }
    const v = value.trim();
    if (required && v.length === 0) return { ok: false, error: `${label}不能为空` };
    if (v.length < min) return { ok: false, error: `${label}长度不能少于${min}个字符` };
    if (v.length > max) return { ok: false, error: `${label}长度不能超过${max}个字符` };
    return { ok: true };
  },

  /** 可选字符串：若提供则校验长度上限 */
  strOptional(value, label, max = 255) {
    if (value === undefined || value === null || value === '') return { ok: true };
    if (typeof value !== 'string') return { ok: false, error: `${label}格式不正确` };
    if (value.length > max) return { ok: false, error: `${label}长度不能超过${max}个字符` };
    return { ok: true };
  },

  /** 纯数字（字符串形式的数字或数字类型），用于 id 等 */
  id(value, label = 'ID') {
    if (value === undefined || value === null || value === '') return { ok: true };
    if (typeof value === 'number' && Number.isFinite(value)) return { ok: true };
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) return { ok: true };
    return { ok: false, error: `${label}格式不正确` };
  },

  /** 整数范围校验 */
  int(value, label, { min, max } = {}) {
    if (value === undefined || value === null || value === '') return { ok: true };
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: `${label}必须是整数` };
    if (min !== undefined && n < min) return { ok: false, error: `${label}不能小于${min}` };
    if (max !== undefined && n > max) return { ok: false, error: `${label}不能大于${max}` };
    return { ok: true };
  },

  /** 邮箱格式（可选） */
  email(value, label = '邮箱') {
    if (value === undefined || value === null || value === '') return { ok: true };
    if (typeof value !== 'string' || value.length > 254) return { ok: false, error: `${label}格式不正确` };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return { ok: false, error: `${label}格式不正确` };
    return { ok: true };
  },

  /** 手机号（可选，简单校验） */
  phone(value, label = '手机号') {
    if (value === undefined || value === null || value === '') return { ok: true };
    if (typeof value !== 'string') return { ok: false, error: `${label}格式不正确` };
    if (value.length > 20) return { ok: false, error: `${label}长度不能超过20个字符` };
    return { ok: true };
  },

  /** 布尔值（0/1/true/false 兼容） */
  bool(value, label) {
    if (value === undefined || value === null || value === '') return { ok: true };
    const s = String(value);
    if (['0', '1', 'true', 'false', '是', '否'].includes(s)) return { ok: true };
    return { ok: false, error: `${label}格式不正确` };
  },
};

/** 便捷函数：校验并返回第一个错误；全部通过返回 null */
export function firstError(...results) {
  for (const r of results) {
    if (r && !r.ok) return r.error;
  }
  return null;
}

/** 便捷函数：校验文本字段长度（纯文本，用于 name/备注等），返回错误信息或 null */
export function checkTextField(value, label, max = 255, required = false) {
  const r = required ? check.str(value, label, { max }) : check.strOptional(value, label, max);
  return r.ok ? null : r.error;
}
