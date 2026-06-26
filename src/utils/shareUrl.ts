import type { PersonaId } from '../models/persona';
import type { ScoreVector } from '../models/score';

/**
 * 分享 URL 编解码
 *
 * 路由: /#/result?p={personaId}&v={delay},{apply},{perfect},{interview}&tone={fun|formal}
 * (HashRouter — 兼容无服务端 SPA 路由配置的静态托管)
 * - p: required — personaId
 * - v: optional — 四维整数 0-100 逗号分隔
 * - tone: optional — 'fun' | 'formal'，中性别名模式
 *
 * 零后端实现：query 字符串客户端解析。
 */

export interface ShareParams {
  p: PersonaId;
  v?: [number, number, number, number];
  tone?: 'fun' | 'formal';
}

/** 编码分享 URL */
export function encodeShareUrl(personaId: PersonaId, vector?: ScoreVector): string {
  const params = new URLSearchParams();
  params.set('p', personaId);

  if (vector) {
    const v = [
      Math.round(vector.delay),
      Math.round(vector.apply),
      Math.round(vector.perfect),
      Math.round(vector.interview),
    ].join(',');
    params.set('v', v);
  }

  return `/#/result?${params.toString()}`;
}

/** 解码分享 URL query */
export function decodeShareParams(searchParams: URLSearchParams): ShareParams | null {
  const p = searchParams.get('p');
  if (!p) return null;

  const result: ShareParams = { p };

  const vRaw = searchParams.get('v');
  if (vRaw) {
    const parts = vRaw.split(',').map(Number);
    if (
      parts.length === 4 &&
      parts.every((n) => Number.isFinite(n) && n >= 0 && n <= 100)
    ) {
      result.v = parts as [number, number, number, number];
    }
  }

  const toneRaw = searchParams.get('tone');
  if (toneRaw === 'formal' || toneRaw === 'fun') {
    result.tone = toneRaw;
  }

  return result;
}

/** 从 ShareParams 还原 ScoreVector */
export function paramsToVector(v: [number, number, number, number]): ScoreVector {
  return {
    delay: v[0],
    apply: v[1],
    perfect: v[2],
    interview: v[3],
  };
}
