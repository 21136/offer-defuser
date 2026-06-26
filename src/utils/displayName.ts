import type { Persona } from '../models/persona';
import type { ToneMode } from '../stores/appStore';

/**
 * 返回人格的展示名称，根据命名风格模式选择
 * - fun: 梗名（如 "海投摆烂吗喽"）
 * - formal: 中性别名（如 "广泛投递型"），fallback 到梗名
 */
export function getDisplayName(persona: Persona, toneMode: ToneMode): string {
  if (toneMode === 'formal') {
    return persona.formalName ?? persona.name;
  }
  return persona.name;
}
