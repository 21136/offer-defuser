import type { ScoreVector, RawScoreVector } from '../models/score';
import type { Question, QuestionOption } from '../models/question';
import { SCORE_BOUNDS } from '../constants/scoreBounds';

/**
 * 四维打分 + 归一化
 *
 * 1. 遍历答题记录，累加各选项在 4 个维度的分数
 * 2. 线性归一化到 [0, 100]
 */

/** 每题选中的选项索引（0-3） */
export type Answer = number;

/** 答题记录：题目 → 选中选项索引 */
export type AnswerRecord = Record<number, Answer>;

/**
 * 计算原始四维分数（累加各选项在各维度的分）
 */
export function calcRawScores(
  questions: Question[],
  answers: AnswerRecord,
): RawScoreVector {
  const raw: RawScoreVector = { delay: 0, apply: 0, perfect: 0, interview: 0 };

  for (const q of questions) {
    const answerIdx = answers[q.id];
    if (answerIdx === undefined) continue; // 未作答的题跳过

    const option: QuestionOption = q.options[answerIdx];
    if (!option) continue;

    const scores = option.scores;
    if (scores.delay !== undefined) raw.delay += scores.delay;
    if (scores.apply !== undefined) raw.apply += scores.apply;
    if (scores.perfect !== undefined) raw.perfect += scores.perfect;
    if (scores.interview !== undefined) raw.interview += scores.interview;
  }

  return raw;
}

/**
 * 线性归一化到 [0, 100]
 *
 * formula: normalized = (raw - rawMin) / (rawMax - rawMin) * 100
 */
export function normalize(raw: RawScoreVector): ScoreVector {
  const { rawMin, rawMax } = SCORE_BOUNDS;

  const norm = (value: number, min: number, max: number): number => {
    const range = max - min;
    if (range === 0) return 50; // 退化为中点
    return Math.round(((value - min) / range) * 100);
  };

  return {
    delay: clamp(norm(raw.delay, rawMin.delay, rawMax.delay), 0, 100),
    apply: clamp(norm(raw.apply, rawMin.apply, rawMax.apply), 0, 100),
    perfect: clamp(norm(raw.perfect, rawMin.perfect, rawMax.perfect), 0, 100),
    interview: clamp(
      norm(raw.interview, rawMin.interview, rawMax.interview),
      0,
      100,
    ),
  };
}

/**
 * 完整打分流程：原始分 → 归一化
 */
export function calcScores(
  questions: Question[],
  answers: AnswerRecord,
): ScoreVector {
  const raw = calcRawScores(questions, answers);
  return normalize(raw);
}

/** 钳位函数 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
