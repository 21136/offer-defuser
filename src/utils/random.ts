import type { StepOption } from '../models/step';

/**
 * 加权随机抽取
 *
 * 同一步骤 7 条文案配置权重（1-10），热门松弛文案权重高，
 * 小众文案权重低，避免纯均匀随机导致的碎片感。
 *
 * @returns 被选中选项的索引
 */
export function weightedRandomIndex(options: StepOption[]): number {
  if (options.length === 0) {
    throw new Error('weightedRandomIndex: options must not be empty');
  }
  if (options.length === 1) return 0;

  const total = options.reduce((sum, opt) => sum + opt.weight, 0);
  let r = Math.random() * total;

  for (let i = 0; i < options.length; i++) {
    r -= options[i].weight;
    if (r <= 0) return i;
  }

  // 浮点精度兜底：返回最后一个
  return options.length - 1;
}

/**
 * 加权随机抽取（排除指定索引）
 * 用于「换一句」功能 — 尽量不重复同一条
 */
export function weightedRandomIndexExcluding(
  options: StepOption[],
  excludeIndex: number,
): number {
  if (options.length <= 1) return 0;

  // 构建排除后的选项列表，保留原始索引映射
  const filtered = options
    .map((opt, i) => ({ ...opt, originalIndex: i }))
    .filter((_, i) => i !== excludeIndex);

  if (filtered.length === 0) {
    // 只有一条可选，返回它
    return 0;
  }

  const total = filtered.reduce((sum, opt) => sum + opt.weight, 0);
  let r = Math.random() * total;

  for (const item of filtered) {
    r -= item.weight;
    if (r <= 0) return item.originalIndex;
  }

  return filtered[filtered.length - 1].originalIndex;
}

/**
 * Fisher-Yates 洗牌
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
