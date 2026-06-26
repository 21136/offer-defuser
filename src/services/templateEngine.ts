/**
 * 轻量插值模板引擎
 *
 * 支持的变量: {{jobName}} {{deadline}} {{daysLeft}} {{personaName}}
 * 无第三方依赖，纯正则替换。
 */

export type TemplateVars = Record<string, string | number>;

/**
 * 模板插值：将 {{key}} 替换为 vars 中对应的值
 * 未匹配的占位符原样保留
 */
export function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? `{{${key}}}`),
  );
}

/**
 * 格式化截止日期为友好文案
 */
export function formatDeadline(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

/**
 * 计算剩余天数
 */
export function calcDaysLeft(isoDeadline: string): number {
  const now = new Date();
  const deadline = new Date(isoDeadline);
  // 取日期部分（忽略时分秒）
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
  );
  return Math.ceil(
    (deadlineStart.getTime() - todayStart.getTime()) / 86400000,
  );
}
