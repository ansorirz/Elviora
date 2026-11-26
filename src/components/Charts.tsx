import React, { useMemo, useState } from 'react';
import { formatCompactRupiah, formatRupiah } from '../types';

export interface SparklineProps {
  data: number[];
  color: string;
  id: string;
}

export function Sparkline({ data, color, id }: SparklineProps) {
  const safeData = data.length >= 2 ? data : [0, 10, 5, 15, 12, 20];
  const width = 92;
  const height = 38;
  const pad = 4;
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;

  const points = safeData.map((val, idx) => {
    const x = pad + (idx / (safeData.length - 1)) * (width - pad * 2);
    const y = height - pad - ((val - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
  profit: number;
}

interface FinancialTrendChartProps {
  data: TrendPoint[];
  showIncome: boolean;
  showExpense: boolean;
  showProfit: boolean;
  accentColor?: string;
}

export function FinancialTrendChart({
  data,
  showIncome,
  showExpense,
  showProfit,
  accentColor = '#5F7D63',
}: FinancialTrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const chartW = 680;
  const chartH = 230;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const { maxVal, minVal, ticks, incomePts, expensePts, profitPts } = useMemo(() => {
    const safe = data.length > 0 ? data : [{ label: '-', income: 0, expense: 0, profit: 0 }];
    const allVals: number[] = [0];
    safe.forEach((d) => {
      if (showIncome) allVals.push(d.income);
      if (showExpense) allVals.push(d.expense);
      if (showProfit) allVals.push(d.profit);
    });
    const rawMax = Math.max(...allVals, 100000);
    const rawMin = Math.min(...allVals, 0);
    const stepBase = Math.pow(10, Math.floor(Math.log10(rawMax - rawMin || 1)));
    const niceMax = Math.ceil(rawMax / stepBase) * stepBase;
    const niceMin = rawMin < 0 ? Math.floor(rawMin / stepBase) * stepBase : 0;
    const span = niceMax - niceMin || 1;

    const tickCount = 4;
    const tickList: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      tickList.push(niceMin + (span * i) / tickCount);
    }

    const mapPts = (getter: (d: TrendPoint) => number) =>
      safe.map((d, i) => {
        const x =
          safe.length === 1
            ? padLeft + plotW / 2
            : padLeft + (i / (safe.length - 1)) * plotW;
        const y = padTop + plotH - ((getter(d) - niceMin) / span) * plotH;
        return { x, y };
      });

    return {
      maxVal: niceMax,
      minVal: niceMin,
      ticks: tickList,
      incomePts: mapPts((d) => d.income),
      expensePts: mapPts((d) => d.expense),
      profitPts: mapPts((d) => d.profit),
    };
  }, [data, showIncome, showExpense, showProfit, plotW, plotH]);

  const activeIdx = hoverIdx !== null && data[hoverIdx] ? hoverIdx : data.length > 0 ? data.length - 1 : null;
  const activePoint = activeIdx !== null ? data[activeIdx] : null;
  const activeX = activeIdx !== null && incomePts[activeIdx] ? incomePts[activeIdx].x : 0;
  const zeroY = padTop + plotH - ((0 - minVal) / (maxVal - minVal || 1)) * plotH;

  const incomePath = buildSmoothPath(incomePts);
  const incomeArea =
    incomePts.length > 0
      ? `${incomePath} L ${incomePts[incomePts.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${incomePts[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
      : '';
  const expensePath = buildSmoothPath(expensePts);
  const profitPath = buildSmoothPath(profitPts);

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full h-56 sm:h-64 overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
          </linearGradient>
          <filter id="lineDropShadow" x="-10%" y="-20%" width="120%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#233126" floodOpacity="0.18" />
          </filter>
        </defs>

        {ticks.map((t, idx) => {
          const y = padTop + plotH - ((t - minVal) / (maxVal - minVal || 1)) * plotH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={chartW - padRight}
                y2={y}
                className="stroke-[#EFEAE1] dark:stroke-[#344639]"
                strokeDasharray={t === 0 ? undefined : '4 4'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#7D877E] dark:fill-[#BCC8BF] text-[10px] font-mono tabular-nums"
              >
                {t === 0 ? '0' : formatCompactRupiah(t).replace('Rp ', '')}
              </text>
            </g>
          );
        })}

        {showIncome && incomeArea && <path d={incomeArea} fill="url(#incomeGrad)" />}
        {showIncome && incomePath && (
          <path
            d={incomePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            filter="url(#lineDropShadow)"
          />
        )}
        {showExpense && expensePath && (
          <path
            d={expensePath}
            fill="none"
            stroke="#D88C94"
            strokeWidth="2.4"
            strokeLinecap="round"
            filter="url(#lineDropShadow)"
          />
        )}
        {showProfit && profitPath && (
          <path
            d={profitPath}
            fill="none"
            stroke="#C69C4D"
            strokeWidth="2.4"
            strokeDasharray="5 3"
            strokeLinecap="round"
            filter="url(#lineDropShadow)"
          />
        )}

        {activeIdx !== null && (
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + plotH}
            className="stroke-[#D6CFC2] dark:stroke-[#3A473D]"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {data.map((d, i) => {
          const x = incomePts[i]?.x ?? 0;
          const sliceW = data.length > 1 ? plotW / (data.length - 1) : plotW;
          return (
            <g key={d.label + i}>
              <text
                x={x}
                y={chartH - 8}
                textAnchor="middle"
                className={`text-[10px] ${
                  activeIdx === i
                    ? 'fill-[#233126] dark:fill-[#F8FAF7] font-semibold'
                    : 'fill-[#7D877E] dark:fill-[#BCC8BF]'
                }`}
              >
                {d.label}
              </text>
              <rect
                x={x - sliceW / 2}
                y={padTop}
                width={sliceW}
                height={plotH + 20}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => setHoverIdx(i)}
              />
            </g>
          );
        })}

        {activeIdx !== null && showIncome && incomePts[activeIdx] && (
          <circle
            cx={incomePts[activeIdx].x}
            cy={incomePts[activeIdx].y}
            r="4.5"
            fill={accentColor}
            className="stroke-white dark:stroke-[#1A221C]"
            strokeWidth="2"
          />
        )}
        {activeIdx !== null && showExpense && expensePts[activeIdx] && (
          <circle
            cx={expensePts[activeIdx].x}
            cy={expensePts[activeIdx].y}
            r="4.5"
            fill="#D88C94"
            className="stroke-white dark:stroke-[#1A221C]"
            strokeWidth="2"
          />
        )}
        {activeIdx !== null && showProfit && profitPts[activeIdx] && (
          <circle
            cx={profitPts[activeIdx].x}
            cy={profitPts[activeIdx].y}
            r="4.5"
            fill="#C69C4D"
            className="stroke-white dark:stroke-[#1A221C]"
            strokeWidth="2"
          />
        )}
      </svg>

      {activePoint && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] px-3.5 py-2 text-xs surface-3d-subtle">
          <span className="font-semibold text-[#233126] dark:text-[#F8FAF7]">{activePoint.label}</span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            {showIncome && (
              <span className="text-accent-fg font-medium">
                Pemasukan: <strong className="font-mono">{formatRupiah(activePoint.income)}</strong>
              </span>
            )}
            {showExpense && (
              <span className="text-[#B85D68] dark:text-[#F4B4BC] font-medium">
                Pengeluaran: <strong className="font-mono">{formatRupiah(activePoint.expense)}</strong>
              </span>
            )}
            {showProfit && (
              <span className="text-[#9E7628] dark:text-[#F0C975] font-medium">
                Keuntungan: <strong className="font-mono">{formatRupiah(activePoint.profit)}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  count: number;
  revenue: number;
  color: string;
}

export function CategoryDonutChart({
  segments,
  totalCount,
}: {
  segments: DonutSegment[];
  totalCount: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const size = 164;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const validSegments = segments.filter((s) => s.count > 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible">
          <defs>
            <filter id="donut3dShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#233126" floodOpacity="0.18" />
            </filter>
            <radialGradient id="donutSpecular" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
            </radialGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-[#F2EDE4] dark:stroke-[#344639]"
            strokeWidth={strokeWidth}
          />
          {validSegments.map((seg) => {
            const pct = totalCount > 0 ? seg.count / totalCount : 0;
            const dash = pct * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += pct;
            const isActive = hovered === seg.label;
            return (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isActive ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={`${Math.max(0, dash - 2)} ${gap + 2}`}
                strokeDashoffset={offset}
                filter={isActive ? 'url(#donut3dShadow)' : undefined}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHovered(seg.label)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#donutSpecular)"
            strokeWidth={strokeWidth}
            className="pointer-events-none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold font-display text-[#233126] dark:text-[#F8FAF7] tabular-nums">
            {totalCount}
          </span>
          <span className="text-[10px] tracking-wide text-[#7D877E] dark:text-[#BCC8BF] font-medium">
            Total Pesanan
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg) => {
          const pct = totalCount > 0 ? Math.round((seg.count / totalCount) * 100) : 0;
          const isActive = hovered === seg.label;
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHovered(seg.label)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-all cursor-default ${
                isActive ? 'bg-[#FAF8F4] dark:bg-[#1F2B23] surface-3d-subtle' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#233126] dark:text-[#F8FAF7] truncate">
                    {seg.label}
                  </p>
                  <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF] tabular-nums">
                    {seg.count} pesanan
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#233126] dark:text-[#F8FAF7] tabular-nums shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderStatusGauge({
  completed,
  processing,
  pending,
  cancelled,
  accentColor = '#5F7D63',
}: {
  completed: number;
  processing: number;
  pending: number;
  cancelled: number;
  accentColor?: string;
}) {
  const total = completed + processing + pending + cancelled;
  const items = [
    { count: completed, color: accentColor },
    { count: processing, color: '#C69C4D' },
    { count: pending, color: '#D88C94' },
    { count: cancelled, color: '#8E968F' },
  ];

  const cx = 110;
  const cy = 104;
  const r = 82;
  const strokeW = 22;
  const halfCirc = Math.PI * r;
  let used = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="220" height="120" viewBox="0 0 220 120" className="overflow-visible" aria-label="Grafik Status Pesanan">
        <defs>
          <filter id="gauge3dShadow" x="-15%" y="-15%" width="130%" height="145%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#233126" floodOpacity="0.16" />
          </filter>
          <linearGradient id="gaugeBevelSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          className="stroke-[#F2EDE4] dark:stroke-[#344639]"
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />
        <g filter="url(#gauge3dShadow)">
          {total > 0 &&
            items.map((item, idx) => {
              if (item.count <= 0) return null;
              const segLen = (item.count / total) * halfCirc;
              const dashOffset = -used;
              used += segLen;
              return (
                <path
                  key={idx}
                  d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeW}
                  strokeDasharray={`${Math.max(0, segLen - 2)} ${halfCirc * 2}`}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
        </g>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeBevelSheen)"
          strokeWidth={strokeW}
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}
