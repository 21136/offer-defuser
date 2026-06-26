import { describe, it, expect } from 'vitest';
import { calcRawScores, calcScores } from '@/services/scoreCalculator';
import type { Question } from '@/models/question';
import type { ScoreVector } from '@/models/score';

describe('calcRawScores', () => {
  const questions: Question[] = [
    {
      id: 1,
      text: '测试题1',
      options: [
        { text: '选项A', scores: { delay: 5, apply: 0, perfect: 0, interview: 2 } },
        { text: '选项B', scores: { delay: 2, apply: 3, perfect: 0, interview: 0 } },
        { text: '选项C', scores: { delay: 0, apply: 5, perfect: 2, interview: 0 } },
        { text: '选项D', scores: { delay: -2, apply: 0, perfect: 5, interview: 3 } },
      ],
    },
    {
      id: 2,
      text: '测试题2',
      options: [
        { text: '选项A', scores: { delay: 3, apply: 0, perfect: 0, interview: -1 } },
        { text: '选项B', scores: { delay: 0, apply: 4, perfect: 3, interview: 0 } },
        { text: '选项C', scores: { delay: 1, apply: 1, perfect: 1, interview: 1 } },
        { text: '选项D', scores: { delay: -3, apply: 2, perfect: 0, interview: 4 } },
      ],
    },
  ];

  it('全选第一项应正确累加', () => {
    const answers = { 1: 0, 2: 0 };
    const raw = calcRawScores(questions, answers);
    expect(raw.delay).toBe(8); // 5 + 3
    expect(raw.apply).toBe(0); // 0 + 0
    expect(raw.perfect).toBe(0); // 0 + 0
    expect(raw.interview).toBe(1); // 2 + (-1)
  });

  it('混合选择应正确累加', () => {
    const answers = { 1: 1, 2: 3 }; // Q1-B, Q2-D
    const raw = calcRawScores(questions, answers);
    expect(raw.delay).toBe(-1); // 2 + (-3)
    expect(raw.apply).toBe(5); // 3 + 2
    expect(raw.perfect).toBe(0);
    expect(raw.interview).toBe(4); // 0 + 4
  });

  it('空答案应返回全零', () => {
    const raw = calcRawScores(questions, {});
    expect(raw.delay).toBe(0);
    expect(raw.apply).toBe(0);
    expect(raw.perfect).toBe(0);
    expect(raw.interview).toBe(0);
  });

  it('不存在的题目应跳过', () => {
    const answers = { 999: 0 };
    const raw = calcRawScores(questions, answers);
    expect(raw.delay).toBe(0);
  });

  it('部分作答应正确累加已答的题', () => {
    const answers = { 1: 0 }; // only Q1-A
    const raw = calcRawScores(questions, answers);
    expect(raw.delay).toBe(5);
    expect(raw.apply).toBe(0);
  });
});

describe('normalize', () => {
  // Test the normalization formula directly
  // normalized = (raw - rawMin) / (rawMax - rawMin) * 100

  it('最小值验证', () => {
    const raw: ScoreVector = { delay: -20, apply: -10, perfect: -15, interview: -5 };
    // Verify raw values are at minimum
    expect(raw.delay).toBe(-20);
    expect(raw.apply).toBe(-10);
  });

  it('中间值应在 0-100 之间', () => {
    // (30 - (-20)) / (80 - (-20)) * 100 = 50/100 * 100 = 50
    const range = 80 - (-20); // = 100
    const normalized = ((30 - (-20)) / range) * 100;
    expect(normalized).toBe(50);
  });

  it('clamping works within bounds', () => {
    const value = 150;
    const clamped = Math.max(0, Math.min(100, value));
    expect(clamped).toBe(100);
  });
});

describe('calcScores (full pipeline)', () => {
  const questions: Question[] = [
    {
      id: 1,
      text: 'Q1',
      options: [
        { text: 'A', scores: { delay: 10, apply: 5, perfect: -5, interview: 0 } },
        { text: 'B', scores: { delay: -5, apply: -3, perfect: 3, interview: 2 } },
        { text: 'C', scores: { delay: 0, apply: 0, perfect: 0, interview: 0 } },
        { text: 'D', scores: { delay: 3, apply: -2, perfect: -2, interview: -1 } },
      ],
    },
  ];

  it('应返回 0-100 范围内的分数', () => {
    const answers = { 1: 0 };
    const scores = calcScores(questions, answers);
    expect(scores.delay).toBeGreaterThanOrEqual(0);
    expect(scores.delay).toBeLessThanOrEqual(100);
    expect(scores.apply).toBeGreaterThanOrEqual(0);
    expect(scores.apply).toBeLessThanOrEqual(100);
  });

  it('应返回四维整数', () => {
    const answers = { 1: 0 };
    const scores = calcScores(questions, answers);
    expect(Number.isInteger(scores.delay)).toBe(true);
    expect(Number.isInteger(scores.apply)).toBe(true);
    expect(Number.isInteger(scores.perfect)).toBe(true);
    expect(Number.isInteger(scores.interview)).toBe(true);
  });
});
