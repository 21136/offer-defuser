import type { PersonaId } from './persona';

/** 分享 URL query 参数 */
export interface ShareParams {
  p: PersonaId; // required
  v?: [number, number, number, number]; // optional, 0-100, [delay, apply, perfect, interview]
}
