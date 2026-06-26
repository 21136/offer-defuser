import { useRef, useCallback, useEffect } from 'react';
import type { Persona } from '../../models/persona';
import type { ScoreVector } from '../../models/score';
import type { DefusePlan } from '../../models/step';
import { track } from '../../utils/tracker';

export type PosterType = 'result' | 'plan';

export interface ShareCanvasProps {
  type: PosterType;
  persona: Persona;
  vector?: ScoreVector;
  plan?: DefusePlan;
  /** 用户与人格的匹配相似度 (0-100)，仅 result 类型使用 */
  similarity?: number;
  className?: string;
}

// ── Canvas dimensions ──
const W = 1080;
const H = 1920;

// ── Colors (fixed light theme) ──
const COLORS = {
  bgGradientTop: '#F8FAFC',
  bgGradientBottom: '#EFF6FF',
  textDark: '#1E293B',
  textGray: '#64748B',
  textLight: '#94A3B8',
  accent: '#3B82F6',
  accentBg: '#DBEAFE',
  accentText: '#1D4ED8',
  tagBg: '#DBEAFE',
  tagText: '#1D4ED8',
  gridStroke: '#CBD5E1',
  axisStroke: '#E2E8F0',
  userFill: 'rgba(59, 130, 246, 0.2)',
  userStroke: '#3B82F6',
  personaStroke: '#94A3B8',
  personaFill: 'rgba(148, 163, 184, 0.15)',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  barBg: '#E2E8F0',
};

// ── Text helpers ──
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines = wrapText(ctx, text, maxWidth);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
}

// ── Radar chart math (reused from RadarChart.tsx) ──
const DIMS = [
  { key: 'delay' as const, label: '拖延倾向' },
  { key: 'apply' as const, label: '投递策略' },
  { key: 'perfect' as const, label: '完美主义' },
  { key: 'interview' as const, label: '面试心态' },
];
const NUM_DIMS = DIMS.length;
const ANGLE_STEP = (2 * Math.PI) / NUM_DIMS;
const START_ANGLE = -Math.PI / 2;

function getRadarPoint(
  value: number,
  index: number,
  maxRadius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const angle = START_ANGLE + index * ANGLE_STEP;
  const r = (value / 100) * maxRadius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// ── Drawing functions ──

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, COLORS.bgGradientTop);
  gradient.addColorStop(1, COLORS.bgGradientBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Decorative top arc
  ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
  ctx.beginPath();
  ctx.arc(W / 2, -200, 600, 0, Math.PI);
  ctx.fill();
}

function drawResultPoster(
  ctx: CanvasRenderingContext2D,
  persona: Persona,
  vector?: ScoreVector,
  similarity?: number,
) {
  drawBackground(ctx);

  let y = 0;

  // ── Header ──
  y = 140;
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('你的求职内耗人格', W / 2, y);

  y += 70;
  ctx.fillStyle = COLORS.textDark;
  ctx.font = 'bold 52px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(persona.name, W / 2, y);

  // Tag chips
  y += 60;
  const chipW = 120;
  const chipH = 42;
  const chipGap = 16;
  const totalChipW = persona.tags.length * chipW + (persona.tags.length - 1) * chipGap;
  let chipX = (W - totalChipW) / 2;

  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  for (const tag of persona.tags) {
    ctx.fillStyle = COLORS.tagBg;
    ctx.beginPath();
    const r = 21;
    ctx.moveTo(chipX + r, y);
    ctx.lineTo(chipX + chipW - r, y);
    ctx.arc(chipX + chipW - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(chipX + r, y + chipH);
    ctx.arc(chipX + r, y + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.tagText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, chipX + chipW / 2, y + chipH / 2);

    chipX += chipW + chipGap;
  }
  ctx.textBaseline = 'alphabetic';

  // ── Radar chart ──
  y += 90;
  const radarCx = W / 2;
  const radarCy = y + 250;
  const radarR = 220;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  for (const ratio of rings) {
    ctx.beginPath();
    for (let i = 0; i < NUM_DIMS; i++) {
      const angle = START_ANGLE + i * ANGLE_STEP;
      const r = radarR * ratio;
      const px = radarCx + r * Math.cos(angle);
      const py = radarCy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = COLORS.gridStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < NUM_DIMS; i++) {
    const angle = START_ANGLE + i * ANGLE_STEP;
    ctx.beginPath();
    ctx.moveTo(radarCx, radarCy);
    ctx.lineTo(
      radarCx + radarR * Math.cos(angle),
      radarCy + radarR * Math.sin(angle),
    );
    ctx.strokeStyle = COLORS.axisStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Persona standard vector (dashed)
  if (persona.vector) {
    const pp: { x: number; y: number }[] = [];
    for (let i = 0; i < NUM_DIMS; i++) {
      pp.push(getRadarPoint(persona.vector[DIMS[i].key], i, radarR, radarCx, radarCy));
    }
    ctx.beginPath();
    ctx.moveTo(pp[0].x, pp[0].y);
    for (let i = 1; i < pp.length; i++) ctx.lineTo(pp[i].x, pp[i].y);
    ctx.closePath();
    ctx.fillStyle = COLORS.personaFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.personaStroke;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // User vector
  if (vector) {
    const up: { x: number; y: number }[] = [];
    for (let i = 0; i < NUM_DIMS; i++) {
      up.push(getRadarPoint(vector[DIMS[i].key], i, radarR, radarCx, radarCy));
    }
    ctx.beginPath();
    ctx.moveTo(up[0].x, up[0].y);
    for (let i = 1; i < up.length; i++) ctx.lineTo(up[i].x, up[i].y);
    ctx.closePath();
    ctx.fillStyle = COLORS.userFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.userStroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Vertex circles
    for (const p of up) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.userStroke;
      ctx.fill();
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Dimension labels
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = COLORS.textGray;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < NUM_DIMS; i++) {
    const angle = START_ANGLE + i * ANGLE_STEP;
    const lr = radarR + 42;
    const lx = radarCx + lr * Math.cos(angle);
    const ly = radarCy + lr * Math.sin(angle);
    ctx.fillText(DIMS[i].label, lx, ly);
  }
  ctx.textBaseline = 'alphabetic';

  y = radarCy + radarR + 80;

  // ── Personality description ──
  ctx.fillStyle = COLORS.textDark;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  drawMultilineText(ctx, persona.description, W / 2, y, W - 160, 36);
  const descLines = wrapText(ctx, persona.description, W - 160);
  y += descLines.length * 36 + 50;

  // ── Similarity bar (if similarity provided) ──
  if (similarity !== undefined) {
    const barWidth = 400;
    const barX = (W - barWidth) / 2;
    const barH = 24;

    ctx.fillStyle = COLORS.textGray;
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`与你最匹配的人格 · 相似度 ${similarity}%`, W / 2, y);
    y += 40;

    ctx.fillStyle = COLORS.barBg;
    ctx.fillRect(barX, y, barWidth, barH);
    const fillW = barWidth * (similarity / 100);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(barX, y, fillW, barH);
    y += barH + 30;
  }

  // ── Strengths ──
  ctx.fillStyle = COLORS.textDark;
  ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('✨ 你的优势', 120, y);
  y += 44;

  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = COLORS.textDark;
  for (const s of persona.strengths) {
    ctx.fillText(`• ${s}`, 140, y);
    y += 38;
  }

  y += 30;

  // ── Advice ──
  ctx.fillStyle = COLORS.textDark;
  ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('💡 一句话建议', 120, y);
  y += 44;

  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = COLORS.textGray;
  drawMultilineText(ctx, persona.advice, 120, y, W - 240, 34);
  const adviceLines = wrapText(ctx, persona.advice, W - 240);
  y += adviceLines.length * 34 + 60;

  // ── Slogan ──
  ctx.fillStyle = COLORS.accent;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('把崩溃的求职流程拆成今日可执行小事', W / 2, y);
  ctx.fillText('测你的求职内耗人格', W / 2, y + 36);

  // ── Disclaimer ──
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('本测试基于娱乐化模型，仅供求职心态自嘲与参考', W / 2, H - 80);
  ctx.fillText('不构成心理或职业咨询', W / 2, H - 56);
}

function drawPlanPoster(
  ctx: CanvasRenderingContext2D,
  persona: Persona,
  plan?: DefusePlan,
) {
  drawBackground(ctx);

  let y = 120;

  // ── Header ──
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Offer 拆解方案', W / 2, y);

  y += 60;
  ctx.fillStyle = COLORS.textDark;
  ctx.font = 'bold 42px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(persona.name, W / 2, y);

  y += 54;
  ctx.fillStyle = COLORS.textGray;
  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  const planInfo = plan
    ? `${plan.jobName} · 倒计时 ${plan.daysLeft} 天`
    : '你的专属求职行动方案';
  ctx.fillText(planInfo, W / 2, y);

  y += 70;

  // ── 8 Steps ──
  const cardX = 80;
  const cardW = W - 160;
  const cardH = 160;
  const cardGap = 18;
  const maxCards = plan ? plan.steps.length : 8;

  ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';

  for (let i = 0; i < maxCards; i++) {
    if (y + cardH > H - 120) break; // Don't overflow

    // Card background
    ctx.fillStyle = COLORS.cardBg;
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 1;
    const r = 16;
    ctx.beginPath();
    ctx.moveTo(cardX + r, y);
    ctx.lineTo(cardX + cardW - r, y);
    ctx.arc(cardX + cardW - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(cardX + r, y + cardH);
    ctx.arc(cardX + r, y + r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Step number
    const numX = cardX + 30;
    const numY = y + 36;
    ctx.fillStyle = COLORS.accentBg;
    ctx.beginPath();
    ctx.arc(numX + 16, numY + 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.accentText;
    ctx.font = 'bold 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), numX + 16, numY + 2);
    ctx.textBaseline = 'alphabetic';

    // Step title
    ctx.fillStyle = COLORS.textDark;
    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    const stepTitle = plan ? plan.steps[i].title : `步骤 ${i + 1}`;
    ctx.fillText(stepTitle, numX + 50, y + 36);

    // Step content
    ctx.fillStyle = COLORS.textGray;
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
    const content = plan ? plan.steps[i].content : '尚未生成方案';
    drawMultilineText(ctx, content, numX + 50, y + 72, cardW - 120, 34);

    y += cardH + cardGap;
  }

  // ── Disclaimer ──
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('本方案基于娱乐化模型生成，仅供求职参考', W / 2, H - 80);
  ctx.fillText('具体行动请结合自身情况调整', W / 2, H - 56);
}

// ── Component ──

export function ShareCanvas({
  type,
  persona,
  vector,
  plan,
  similarity,
  className = '',
}: ShareCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef(false);

  // Draw on mount and when props change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    if (type === 'result') {
      drawResultPoster(ctx, persona, vector, similarity);
    } else {
      drawPlanPoster(ctx, persona, plan);
    }

    drawnRef.current = true;
  }, [type, persona, vector, plan, similarity]);

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawnRef.current) return;

    track('poster_download', { personaId: persona.id, type });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offer-defuser-${type}-${persona.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [type, persona.id]);

  const typeLabel = type === 'result' ? '人格结果海报' : '拆解方案海报';

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: `${W * 0.15}px`,
          height: `${H * 0.15}px`,
        }}
        className="rounded-lg shadow-lg border border-gray-200"
        aria-label={type === 'result' ? '人格结果海报预览' : '拆解方案海报预览'}
      />
      <button
        onClick={downloadPNG}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        📸 下载海报
      </button>
      <p className="text-xs text-gray-400">
        {typeLabel} · 9:16 · PNG
      </p>
    </div>
  );
}
