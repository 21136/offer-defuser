import { describe, it, expect } from 'vitest';
import { generatePlan, rerollStep } from '@/services/stepGenerator';
import type { StepLibrary, DefusePlan } from '@/models/step';
import type { PersonaId } from '@/models/persona';

/**
 * 构建最小步骤库用于测试
 * 2 人格 × 8 步骤 × 3 选项（简化为 3 以加速测试）
 */
function makeTestLibrary(): StepLibrary {
  const personas: Record<PersonaId, Array<{
    position: number;
    title: string;
    options: Array<{ text: string; weight: number }>;
  }>> = {};

  const pidList: PersonaId[] = ['mass-applyer', 'long-planner'];
  const slotTitles = [
    '搞清门槛', '改简历', '去投递', '笔试准备',
    '面试准备', '模拟练习', '跟进复盘', '心态复位',
  ];

  for (const pid of pidList) {
    personas[pid] = [];
    for (let pos = 1; pos <= 8; pos++) {
      personas[pid].push({
        position: pos,
        title: slotTitles[pos - 1],
        options: [
          { text: `[${pid}] {{jobName}} step${pos} — 方案A: 截止{{deadline}}，还有{{daysLeft}}天`, weight: 10 },
          { text: `[${pid}] {{jobName}} step${pos} — 方案B: {{personaName}}的专属建议`, weight: 7 },
          { text: `[${pid}] {{jobName}} step${pos} — 方案C: 彩蛋选项，轻松一下`, weight: 2 },
        ],
      });
    }
  }

  return { category: 'frontend', personas };
}

describe('generatePlan', () => {
  const library = makeTestLibrary();

  it('应生成包含 8 个步骤的完整方案', () => {
    const plan = generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '字节前端实习',
      deadline: '2026-07-15',
      stepLibrary: library,
    });

    expect(plan.steps).toHaveLength(8);
    expect(plan.personaId).toBe('mass-applyer');
    expect(plan.category).toBe('frontend');
    expect(plan.jobName).toBe('字节前端实习');
    expect(plan.deadline).toBe('2026-07-15');
    expect(plan.id).toBeDefined();
    expect(plan.id.length).toBeGreaterThanOrEqual(8);
  });

  it('生成的方案应包含有效的 daysLeft', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const deadline = futureDate.toISOString().split('T')[0];

    const plan = generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '测试岗位',
      deadline,
      stepLibrary: library,
    });

    expect(plan.daysLeft).toBeGreaterThanOrEqual(28);
    expect(plan.daysLeft).toBeLessThanOrEqual(31);
  });

  it('每个步骤应有 position 1-8、标题和渲染后的 content', () => {
    const plan = generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '字节前端实习',
      deadline: '2026-07-15',
      stepLibrary: library,
    });

    const positions = new Set<number>();
    for (const step of plan.steps) {
      expect(step.position).toBeGreaterThanOrEqual(1);
      expect(step.position).toBeLessThanOrEqual(8);
      expect(step.title).toBeTruthy();
      expect(step.content).toBeTruthy();
      expect(step.content).not.toContain('{{'); // 变量应已替换
      expect(step.optionIndex).toBeGreaterThanOrEqual(0);
      expect(step.optionIndex).toBeLessThan(3);
      positions.add(step.position);
    }
    expect(positions.size).toBe(8); // 所有位置唯一
  });

  it('content 中的变量应被正确插值', () => {
    const plan = generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '字节前端实习',
      deadline: '2026-07-15',
      stepLibrary: library,
    });

    // 至少有一个步骤包含 jobName
    const hasJobName = plan.steps.some((s) =>
      s.content.includes('字节前端实习'),
    );
    expect(hasJobName).toBe(true);
  });

  it('不同调用应产生不同结果（加权随机）', () => {
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const plan = generatePlan({
        personaId: 'mass-applyer',
        personaName: '海投摆烂吗喽',
        category: 'frontend',
        jobName: '字节前端实习',
        deadline: '2026-07-15',
        stepLibrary: library,
      });
      // 使用 optionIndex 序列检查多样性
      const key = plan.steps.map((s) => s.optionIndex).join(',');
      results.add(key);
    }
    // 3^8 = 6561 种可能，10 次调用应产生不止 1 个结果
    expect(results.size).toBeGreaterThan(1);
  });

  it('不应该直接使用已替换的变量名（如 {{jobName}}）', () => {
    const plan = generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '字节前端实习',
      deadline: '2026-07-15',
      stepLibrary: library,
    });

    for (const step of plan.steps) {
      expect(step.content).not.toContain('{{jobName}}');
      expect(step.content).not.toContain('{{deadline}}');
      expect(step.content).not.toContain('{{daysLeft}}');
    }
  });

  it('应包含 createdAt 时间戳', () => {
    const before = new Date().toISOString();
    const plan = generatePlan({
      personaId: 'long-planner',
      personaName: '提前三个月长线规划党',
      category: 'frontend',
      jobName: '测试',
      deadline: '2026-12-31',
      stepLibrary: library,
    });

    expect(plan.createdAt).toBeDefined();
    expect(plan.createdAt >= before).toBe(true);
    expect(plan.createdAt <= new Date().toISOString()).toBe(true);
  });

  it('persona 不在库中应抛出错误', () => {
    expect(() =>
      generatePlan({
        personaId: 'nonexistent' as PersonaId,
        personaName: '不存在',
        category: 'frontend',
        jobName: '测试',
        deadline: '2026-12-31',
        stepLibrary: library,
      }),
    ).toThrow('no valid steps');
  });
});

describe('rerollStep', () => {
  const library = makeTestLibrary();

  function makePlan(): DefusePlan {
    return generatePlan({
      personaId: 'mass-applyer',
      personaName: '海投摆烂吗喽',
      category: 'frontend',
      jobName: '字节前端实习',
      deadline: '2026-07-15',
      stepLibrary: library,
    });
  }

  it('应更换指定步骤的内容', () => {
    const plan = makePlan();

    // 可能相同（3 个选项中有 1/3 概率），多次运行降低偶然性
    let changed = false;
    for (let i = 0; i < 20; i++) {
      const r = rerollStep(
        plan,
        1,
        library.personas['mass-applyer'],
        '海投摆烂吗喽',
      );
      if (r.steps[0].content !== plan.steps[0].content) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('其他步骤应保持不变', () => {
    const plan = makePlan();
    const rerolled = rerollStep(
      plan,
      1,
      library.personas['mass-applyer'],
      '海投摆烂吗喽',
    );

    for (let i = 1; i < 8; i++) {
      expect(rerolled.steps[i]).toEqual(plan.steps[i]);
    }
  });

  it('指定步骤的 optionIndex 应更新', () => {
    const plan = makePlan();
    const oldIdx = plan.steps[0].optionIndex;

    // 多次 reroll 确保换到不同选项
    let newIdx = oldIdx;
    for (let i = 0; i < 30; i++) {
      const rerolled = rerollStep(
        plan,
        1,
        library.personas['mass-applyer'],
        '海投摆烂吗喽',
      );
      if (rerolled.steps[0].optionIndex !== oldIdx) {
        newIdx = rerolled.steps[0].optionIndex;
        break;
      }
    }
    expect(newIdx).not.toBe(oldIdx);
  });

  it('不存在的步骤位置应返回原 plan', () => {
    const plan = makePlan();
    const rerolled = rerollStep(
      plan,
      99,
      library.personas['mass-applyer'],
      '海投摆烂吗喽',
    );

    expect(rerolled).toBe(plan);
  });

  it('应保留 plan 的元数据', () => {
    const plan = makePlan();
    const rerolled = rerollStep(
      plan,
      2,
      library.personas['mass-applyer'],
      '海投摆烂吗喽',
    );

    expect(rerolled.id).toBe(plan.id);
    expect(rerolled.personaId).toBe(plan.personaId);
    expect(rerolled.jobName).toBe(plan.jobName);
    expect(rerolled.deadline).toBe(plan.deadline);
    expect(rerolled.daysLeft).toBe(plan.daysLeft);
    expect(rerolled.createdAt).toBe(plan.createdAt);
  });
});
