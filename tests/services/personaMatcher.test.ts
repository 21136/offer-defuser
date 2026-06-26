import { describe, it, expect } from 'vitest';
import { euclideanDistance, matchPersona, toSimilarity } from '@/services/personaMatcher';
import { DISTANCE_SCALE } from '@/constants/scoreBounds';
import type { ScoreVector } from '@/models/score';
import type { Persona } from '@/models/persona';

const testPersonas: Persona[] = [
  {
    id: 'mass-applyer',
    name: '海投摆烂吗喽',
    vector: { delay: 85, apply: 20, perfect: 70, interview: 30 },
    tags: ['海投', '随缘'],
    description: '高投递量、低质量、随缘心态',
    strengths: ['投递量大'],
    weaknesses: ['质量低'],
    advice: '专注目标',
  },
  {
    id: 'resume-anxious',
    name: '简历空白焦虑者',
    vector: { delay: 60, apply: 15, perfect: 75, interview: 25 },
    tags: ['焦虑', '不敢投'],
    description: '项目少、不敢投、持续焦虑',
    strengths: ['认真'],
    weaknesses: ['行动力弱'],
    advice: '先投再说',
  },
  {
    id: 'ddl-sprinter',
    name: '截止日前一天突击人',
    vector: { delay: 15, apply: 70, perfect: 25, interview: 80 },
    tags: ['DDL', '突击'],
    description: 'DDL 驱动、最后一刻爆发',
    strengths: ['执行力强'],
    weaknesses: ['准备仓促'],
    advice: '提前规划',
  },
  {
    id: 'long-planner',
    name: '提前三个月长线规划党',
    vector: { delay: 10, apply: 80, perfect: 85, interview: 90 },
    tags: ['规划', '稳健'],
    description: '计划性强、按部就班',
    strengths: ['计划周全'],
    weaknesses: ['过度规划'],
    advice: '保持灵活',
  },
];

describe('euclideanDistance', () => {
  it('same vector should have distance 0', () => {
    const v: ScoreVector = { delay: 50, apply: 50, perfect: 50, interview: 50 };
    expect(euclideanDistance(v, v)).toBe(0);
  });

  it('single dimension difference should compute correctly', () => {
    const a: ScoreVector = { delay: 0, apply: 0, perfect: 0, interview: 0 };
    const b: ScoreVector = { delay: 3, apply: 4, perfect: 0, interview: 0 };
    expect(euclideanDistance(a, b)).toBe(5); // sqrt(3^2 + 4^2) = 5
  });

  it('four-dimension differences should compute correctly', () => {
    const a: ScoreVector = { delay: 0, apply: 0, perfect: 0, interview: 0 };
    const b: ScoreVector = { delay: 1, apply: 2, perfect: 3, interview: 4 };
    expect(euclideanDistance(a, b)).toBeCloseTo(Math.sqrt(1 + 4 + 9 + 16), 10); // sqrt(30)
  });

  it('should be symmetric', () => {
    const a: ScoreVector = { delay: 10, apply: 20, perfect: 30, interview: 40 };
    const b: ScoreVector = { delay: 90, apply: 80, perfect: 70, interview: 60 };
    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
  });
});

describe('toSimilarity', () => {
  it('distance 0 should give 100% similarity', () => {
    expect(toSimilarity(0)).toBe(100);
  });

  it('distance 200 should give 0% similarity', () => {
    expect(toSimilarity(200)).toBe(0);
  });

  it('distance 100 should give 50% similarity', () => {
    expect(toSimilarity(100)).toBe(50);
  });

  it('distance > 200 should clamp at 0', () => {
    expect(toSimilarity(300)).toBe(0);
  });
});

describe('matchPersona', () => {
  it('should return primary + secondary + top-3', () => {
    const user: ScoreVector = { delay: 80, apply: 25, perfect: 72, interview: 28 };
    const result = matchPersona(user, testPersonas);

    expect(result.persona).toBeDefined();
    expect(result.subPersona).toBeDefined();
    expect(result.top3).toHaveLength(3);
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.similarity).toBeLessThanOrEqual(100);
  });

  it('closest user should match correct persona', () => {
    // Very close to mass-applyer (85,20,70,30)
    const user: ScoreVector = { delay: 85, apply: 20, perfect: 70, interview: 30 };
    const result = matchPersona(user, testPersonas);

    expect(result.persona.id).toBe('mass-applyer');
    expect(result.distance).toBeCloseTo(0, 1);
    expect(result.similarity).toBeCloseTo(100, 0);
  });

  it('perfect match should have similarity 100', () => {
    const user: ScoreVector = { delay: 10, apply: 80, perfect: 85, interview: 90 };
    const result = matchPersona(user, testPersonas);

    expect(result.persona.id).toBe('long-planner');
    expect(result.distance).toBe(0);
    expect(result.similarity).toBe(100);
  });

  it('far distance should have low similarity', () => {
    const far: ScoreVector = { delay: 90, apply: 20, perfect: 15, interview: 10 };
    const result = matchPersona(far, testPersonas);

    expect(result.similarity).toBeLessThan(100);
  });

  it('fewer than 2 personas should throw', () => {
    const user: ScoreVector = { delay: 50, apply: 50, perfect: 50, interview: 50 };
    expect(() => matchPersona(user, [])).toThrow('at least 2 personas');
  });
});

describe('DISTANCE_SCALE', () => {
  it('should be 200', () => {
    expect(DISTANCE_SCALE).toBe(200);
  });
});
