import { describe, it, expect } from 'vitest';
import { interpolate } from '@/services/templateEngine';

describe('interpolate', () => {
  it('应替换单个变量', () => {
    expect(interpolate('你好 {{name}}', { name: '张三' })).toBe('你好 张三');
  });

  it('应替换多个变量', () => {
    const result = interpolate('距离 {{jobName}} 截止还有 {{daysLeft}} 天', {
      jobName: '字节前端实习',
      daysLeft: 7,
    });
    expect(result).toBe('距离 字节前端实习 截止还有 7 天');
  });

  it('数字变量应转为字符串', () => {
    expect(interpolate('{{count}}天', { count: 5 })).toBe('5天');
  });

  it('缺失变量应保留原占位符', () => {
    expect(interpolate('你好 {{name}}', {})).toBe('你好 {{name}}');
  });

  it('无占位符应返回原字符串', () => {
    expect(interpolate('无变量文本', { name: 'test' })).toBe('无变量文本');
  });

  it('部分变量存在时应替换存在的、保留缺失的', () => {
    const result = interpolate('{{a}} and {{b}}', { a: 'hello' });
    expect(result).toBe('hello and {{b}}');
  });

  it('空模板应返回空字符串', () => {
    expect(interpolate('', {})).toBe('');
  });
});
