import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BarChart3, CalendarRange, TrendingUp } from 'lucide-react';
import {
  type Transaction,
  formatCompactRupiah,
  formatRupiah,
} from '../types';

export interface MonthlyIncomePoint {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  income: number;
  txCount: number;
}

interface MonthlyIncomeD3ChartProps {
  transactions: Transaction[];
  theme: 'light' | 'dark';
  accentHex: string;
}

export function MonthlyIncomeD3Chart({
  transactions,
  theme,
  accentHex,
}: MonthlyIncomeD3ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartMode, setChartMode] = useState<'combo' | 'area'>('combo');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const monthlyData: MonthlyIncomePoint[] = useMemo(() => {
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    const points: MonthlyIncomePoint[] = [];

    for (let offset = 5; offset >= 0; offset--) {
      const dt = new Date(baseYear, baseMonth - offset, 1);
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      const shortLabel = new Intl.DateTimeFormat('id-ID', { month: 'short' })
        .format(dt)
        .replace('.', '');
      const fullLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(dt);

      const matching = transactions.filter(
        (t) => t.type === 'pemasukan' && t.date.startsWith(monthKey)
      );
      const income = matching.reduce((sum, t) => sum + t.amount, 0);

      points.push({
        monthKey,
        shortLabel,
        fullLabel,
        income,
        txCount: matching.length,
      });
    }

    return points;
  }, [transactions]);

  const stats = useMemo(() => {
    const total = d3.sum(monthlyData, (d) => d.income);
    const avg = d3.mean(monthlyData, (d) => d.income) || 0;
    const peak = monthlyData.reduce(
      (best, cur) => (cur.income > best.income ? cur : best),
      monthlyData[0] || {
        monthKey: '',
        shortLabel: '-',
        fullLabel: '-',
        income: 0,
        txCount: 0,
      }
    );
    const current = monthlyData[monthlyData.length - 1]?.income || 0;
    const prev = monthlyData[monthlyData.length - 2]?.income || 0;
    const growthPct =
      prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;

    return { total, avg, peak, current, prev, growthPct };
  }, [monthlyData]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 760;
    const height = 248;
    const margin = { top: 22, right: 24, bottom: 34, left: 66 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(35,49,38,0.08)';
    const textMuted = isDark ? '#C2CEC4' : '#7D877E';
    const textStrong = isDark ? '#F8FAF7' : '#233126';
    const surfaceBg = isDark ? '#16201A' : '#FFFFFF';
    const goldColor = isDark ? '#F0C975' : '#C69C4D';

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Bar vertical gradient
    const barGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-income-bar-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    barGrad.append('stop').attr('offset', '0%').attr('stop-color', accentHex).attr('stop-opacity', 0.88);
    barGrad.append('stop').attr('offset', '100%').attr('stop-color', accentHex).attr('stop-opacity', 0.22);

    // Area vertical gradient
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-income-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', accentHex).attr('stop-opacity', 0.34);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', accentHex).attr('stop-opacity', 0.02);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxIncome = d3.max(monthlyData, (d) => d.income) || 0;
    const yMax = Math.max(maxIncome * 1.18, 1_000_000);

    const xBand = d3
      .scaleBand<string>()
      .domain(monthlyData.map((d) => d.monthKey))
      .range([0, innerW])
      .padding(0.36);

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice(4)
      .range([innerH, 0]);

    // Horizontal grid lines
    const yTicks = yScale.ticks(4);
    root
      .append('g')
      .attr('class', 'd3-grid')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '4 4');

    // Left Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickSize(0)
      .tickPadding(10)
      .tickFormat((val) => formatCompactRupiah(Number(val)));

    const yAxisGroup = root.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup
      .selectAll('text')
      .attr('fill', textMuted)
      .style('font-size', '11px')
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');

    // Bottom X Axis
    const labelMap = new Map(monthlyData.map((d) => [d.monthKey, d.shortLabel]));
    const xAxis = d3
      .axisBottom(xBand)
      .tickSize(0)
      .tickPadding(12)
      .tickFormat((key) => labelMap.get(key) || key);

    const xAxisGroup = root
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', gridColor);
    xAxisGroup
      .selectAll('text')
      .attr('fill', textStrong)
      .style('font-size', '11.5px')
      .style('font-weight', '600');

    // Helper for bar center X
    const xCenter = (d: MonthlyIncomePoint) =>
      (xBand(d.monthKey) || 0) + xBand.bandwidth() / 2;

    // Area fill under trend curve
    const areaGen = d3
      .area<MonthlyIncomePoint>()
      .x((d) => xCenter(d))
      .y0(innerH)
      .y1((d) => yScale(d.income))
      .curve(d3.curveCatmullRom.alpha(0.5));

    if (chartMode === 'area') {
      root
        .append('path')
        .datum(monthlyData)
        .attr('fill', 'url(#d3-income-area-grad)')
        .attr('d', areaGen);
    }

    // Bars in combo mode (rounded top using custom SVG path)
    if (chartMode === 'combo') {
      const barW = Math.min(xBand.bandwidth(), 46);
      const radius = 8;

      root
        .append('g')
        .selectAll('path')
        .data(monthlyData)
        .join('path')
        .attr('fill', 'url(#d3-income-bar-grad)')
        .attr('stroke', accentHex)
        .attr('stroke-opacity', 0.35)
        .attr('stroke-width', 1)
        .attr('d', (d) => {
          const bx = xCenter(d) - barW / 2;
          const by = yScale(d.income);
          const bh = Math.max(0, innerH - by);
          if (bh <= 1) {
            return `M${bx},${innerH} h${barW} v0 h-${barW} Z`;
          }
          const r = Math.min(radius, bh / 2, barW / 2);
          return [
            `M${bx},${innerH}`,
            `L${bx},${by + r}`,
            `Q${bx},${by} ${bx + r},${by}`,
            `L${bx + barW - r},${by}`,
            `Q${bx + barW},${by} ${bx + barW},${by + r}`,
            `L${bx + barW},${innerH}`,
            'Z',
          ].join(' ');
        })
        .style('opacity', (d, idx) =>
          hoveredIdx === null || hoveredIdx === idx ? 1 : 0.45
        );
    }

    // Average dashed reference line
    if (stats.avg > 0) {
      const avgY = yScale(stats.avg);
      root
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', avgY)
        .attr('y2', avgY)
        .attr('stroke', goldColor)
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '5 4')
        .attr('opacity', 0.85);

      root
        .append('text')
        .attr('x', innerW - 4)
        .attr('y', avgY - 6)
        .attr('text-anchor', 'end')
        .attr('fill', goldColor)
        .style('font-size', '10px')
        .style('font-weight', '600')
        .text(`Rata-rata ${formatCompactRupiah(stats.avg)}`);
    }

    // Smooth trend line
    const lineGen = d3
      .line<MonthlyIncomePoint>()
      .x((d) => xCenter(d))
      .y((d) => yScale(d.income))
      .curve(d3.curveCatmullRom.alpha(0.5));

    root
      .append('path')
      .datum(monthlyData)
      .attr('fill', 'none')
      .attr('stroke', chartMode === 'combo' ? goldColor : accentHex)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    // Value labels above peak or points when hovered
    root
      .append('g')
      .selectAll('circle')
      .data(monthlyData)
      .join('circle')
      .attr('cx', (d) => xCenter(d))
      .attr('cy', (d) => yScale(d.income))
      .attr('r', (_, idx) => (hoveredIdx === idx ? 6 : 4))
      .attr('fill', surfaceBg)
      .attr('stroke', chartMode === 'combo' ? goldColor : accentHex)
      .attr('stroke-width', 2.5);

    // Subtle compact value label above each point
    root
      .append('g')
      .selectAll('text')
      .data(monthlyData)
      .join('text')
      .attr('x', (d) => xCenter(d))
      .attr('y', (d) => Math.max(10, yScale(d.income) - 10))
      .attr('text-anchor', 'middle')
      .attr('fill', (_, idx) => (hoveredIdx === idx ? textStrong : textMuted))
      .style('font-size', '10px')
      .style('font-weight', (_, idx) => (hoveredIdx === idx ? '700' : '500'))
      .style('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => (d.income > 0 ? formatCompactRupiah(d.income) : 'Rp 0'));

    // Transparent hover hit columns per month
    const colW = innerW / Math.max(1, monthlyData.length);
    root
      .append('g')
      .selectAll('rect')
      .data(monthlyData)
      .join('rect')
      .attr('x', (_, idx) => idx * colW)
      .attr('y', 0)
      .attr('width', colW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('pointerenter', function (event: PointerEvent, d) {
        const idx = monthlyData.findIndex((p) => p.monthKey === d.monthKey);
        setHoveredIdx(idx);
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltipPos({
            x: event.clientX - containerRect.left,
            y: event.clientY - containerRect.top,
          });
        }
      })
      .on('pointermove', function (event: PointerEvent) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltipPos({
            x: event.clientX - containerRect.left,
            y: event.clientY - containerRect.top,
          });
        }
      })
      .on('pointerleave', () => {
        setHoveredIdx(null);
        setTooltipPos(null);
      });
  }, [monthlyData, stats.avg, theme, accentHex, chartMode, hoveredIdx]);

  const activeHover = hoveredIdx !== null ? monthlyData[hoveredIdx] : null;

  return (
    <section
      aria-label="Tren Pemasukan Bulanan 6 Bulan Terakhir"
      className="bg-white/88 dark:bg-[#16201A] backdrop-blur-sm rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-5 surface-3d"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent-fg flex items-center justify-center icon-3d shrink-0">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base text-[#233126] dark:text-[#F8FAF7]">
              Tren Pemasukan Bulanan (6 Bulan Terakhir)
            </h3>
            <p className="text-xs text-[#7D877E] dark:text-[#BCC8BF]">
              Visualisasi D3 arus pemasukan 6 bulan terakhir beserta garis rata-rata bulanan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F4] dark:bg-[#1F2B23] border border-[#EAE4DA] dark:border-[#344639] surface-3d-subtle"
            role="group"
            aria-label="Mode tampilan grafik D3"
          >
            <button
              type="button"
              onClick={() => setChartMode('combo')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                chartMode === 'combo'
                  ? 'bg-white dark:bg-[#16201A] text-[#233126] dark:text-[#F8FAF7] surface-3d-subtle border border-[#EAE4DA] dark:border-[#364439]'
                  : 'text-[#616E63] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-[#F3EFE6]'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              Batang &amp; Tren
            </button>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-white dark:bg-[#16201A] text-[#233126] dark:text-[#F8FAF7] surface-3d-subtle border border-[#EAE4DA] dark:border-[#364439]'
                  : 'text-[#616E63] dark:text-[#BCC8BF] hover:text-[#233126] dark:hover:text-[#F3EFE6]'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Kurva Area
            </button>
          </div>
        </div>
      </div>

      {/* D3 SVG Stage */}
      <div ref={containerRef} className="relative w-full">
        <svg
          ref={svgRef}
          viewBox="0 0 760 248"
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="Grafik D3 tren pemasukan 6 bulan terakhir"
        />

        {activeHover && tooltipPos && (
          <div
            style={{
              left: `${Math.min(Math.max(tooltipPos.x, 85), (containerRef.current?.clientWidth || 500) - 95)}px`,
              top: `${Math.max(tooltipPos.y - 68, 8)}px`,
              transform: 'translateX(-50%)',
            }}
            className="pointer-events-none absolute z-20 rounded-xl bg-white/95 dark:bg-[#16201A] backdrop-blur-md border border-[#EAE4DA] dark:border-[#344639] px-3 py-2 shadow-lg min-w-[165px]"
          >
            <p className="text-[11px] font-semibold text-[#233126] dark:text-[#F8FAF7] capitalize">
              {activeHover.fullLabel}
            </p>
            <p className="font-mono font-bold text-xs text-accent-fg tabular-nums mt-0.5">
              {formatRupiah(activeHover.income)}
            </p>
            <p className="text-[10px] text-[#7D877E] dark:text-[#BCC8BF] mt-0.5">
              {activeHover.txCount} transaksi masuk
            </p>
          </div>
        )}
      </div>

      {/* Bottom Summary Strip */}
      <div className="mt-3 pt-3.5 border-t border-[#EFEAE1] dark:border-[#344639] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Total 6 Bulan</p>
          <p className="font-display font-bold text-sm text-[#233126] dark:text-[#F8FAF7] tabular-nums mt-0.5">
            {formatRupiah(stats.total)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Rata-rata Bulanan</p>
          <p className="font-display font-bold text-sm text-accent-fg tabular-nums mt-0.5">
            {formatRupiah(stats.avg)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Puncak Pemasukan</p>
          <p className="font-display font-bold text-sm text-[#9E7628] dark:text-[#F0C975] tabular-nums mt-0.5">
            {formatCompactRupiah(stats.peak.income)} · {stats.peak.shortLabel}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#7D877E] dark:text-[#BCC8BF]">Bulan Ini vs Lalu</p>
          <p
            className={`font-display font-bold text-sm tabular-nums mt-0.5 ${
              stats.growthPct >= 0
                ? 'text-accent-fg'
                : 'text-[#B85D68] dark:text-[#F4B4BC]'
            }`}
          >
            {stats.growthPct >= 0 ? `+${stats.growthPct}%` : `${stats.growthPct}%`}
          </p>
        </div>
      </div>
    </section>
  );
}
