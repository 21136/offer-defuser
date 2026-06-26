import { useMemo } from 'react';
import type { ScoreVector } from '../../models/score';

interface RadarChartProps {
  userVector: ScoreVector;
  personaVector?: ScoreVector;
  size?: number;
  className?: string;
}

const DIMENSIONS = [
  { key: 'delay' as const, label: '拖延倾向' },
  { key: 'apply' as const, label: '投递策略' },
  { key: 'perfect' as const, label: '完美主义' },
  { key: 'interview' as const, label: '面试心态' },
];

const NUM_DIMS = DIMENSIONS.length;
const ANGLE_STEP = (2 * Math.PI) / NUM_DIMS;
const START_ANGLE = -Math.PI / 2;

function getPoint(
  value: number,
  index: number,
  maxRadius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const angle = START_ANGLE + index * ANGLE_STEP;
  const r = (value / 100) * maxRadius;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

export function RadarChart({
  userVector,
  personaVector,
  size = 280,
  className = '',
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.35;

  const userPoints = useMemo(
    () =>
      DIMENSIONS.map((d, i) =>
        getPoint(userVector[d.key], i, maxRadius, cx, cy),
      ),
    [userVector, maxRadius, cx, cy],
  );

  const personaPoints = useMemo(() => {
    if (!personaVector) return null;
    return DIMENSIONS.map((d, i) =>
      getPoint(personaVector[d.key], i, maxRadius, cx, cy),
    );
  }, [personaVector, maxRadius, cx, cy]);

  const gridRings = [0.25, 0.5, 0.75, 1.0];

  const axisLines = DIMENSIONS.map((_, i) => {
    const angle = START_ANGLE + i * ANGLE_STEP;
    return {
      x2: cx + maxRadius * Math.cos(angle),
      y2: cy + maxRadius * Math.sin(angle),
    };
  });

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label="四维雷达图"
      >
        {gridRings.map((ratio) => (
          <polygon
            key={ratio}
            points={DIMENSIONS.map((_, i) => {
              const angle = START_ANGLE + i * ANGLE_STEP;
              const r = maxRadius * ratio;
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-gray-200 dark:text-gray-700"
          />
        ))}

        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-gray-300 dark:text-gray-600"
          />
        ))}

        {personaPoints && (
          <polygon
            points={personaPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(156, 163, 175, 0.2)"
            stroke="rgb(156, 163, 175)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
        )}

        <polygon
          points={userPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
        />

        {userPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="rgb(59, 130, 246)"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {DIMENSIONS.map((d, i) => {
          const angle = START_ANGLE + i * ANGLE_STEP;
          const labelR = maxRadius + 24;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          return (
            <text
              key={d.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-500 dark:fill-gray-400"
              style={{ fontSize: '10px' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
