/**
 * localStorage 持久化封装
 *
 * 所有 key 使用 `offer-defuser:` 前缀命名空间，
 * JSON 序列化/反序列化自动处理，
 * 解析失败返回 null（不抛异常）。
 */

const PREFIX = 'offer-defuser:';

/** 存储键名常量 */
export const STORAGE_KEYS = {
  personaId: `${PREFIX}personaId`,
  scoreVector: `${PREFIX}scoreVector`,
  testHistory: `${PREFIX}testHistory`,
  defuseHistory: `${PREFIX}defuseHistory`,
  defuserForm: `${PREFIX}defuserForm`,
  testProgress: `${PREFIX}testProgress`,
  tracking: `${PREFIX}tracking`,
  theme: `${PREFIX}theme`,
} as const;

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 满或私密模式 — 静默失败
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 静默失败
  }
}

/** 清除所有 offer-defuser 数据 */
function clearAll(): void {
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
  } catch {
    // 静默失败
  }
}

export const storage = { get, set, remove, clearAll, keys: STORAGE_KEYS };
