import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import {
  formatCompactCurrency,
  formatSignedPercent,
  getAdjustedTarget,
  getRecordStatus,
  MONTHS,
  PRODUCT_LINES,
  PRODUCT_SKUS,
  REGIONS,
  SEGMENTS,
} from '../data/kpiData';
import {
  ContextMenuState,
  CrossFilter,
  KpiRecord,
  ProductLineName,
  RegionName,
  SegmentName,
} from '../types/kpi';
import { TrendMetricKey } from './KpiCardRow';
import { StatusLabel } from './StatusLabel';

interface ChartsOverviewProps {
  baseRecords: KpiRecord[]; // Filtered by slicers + exclusions (for source visual highlighting)
  filteredRecords: KpiRecord[]; // Filtered by slicers + exclusions + crossFilter
  crossFilter: CrossFilter | null;
  targetAdjustmentPct: number;
  activeTrendMetric: TrendMetricKey;
  onChangeTrendMetric: (metric: TrendMetricKey) => void;
  onToggleCrossFilter: (cf: CrossFilter) => void;
  onOpenContextMenu: (menu: ContextMenuState) => void;
  onQuickDrillThrough: (
    dimension: 'region' | 'segment' | 'productLine' | 'productSku' | 'month',
    value: string,
    label: string
  ) => void;
}

const SEGMENT_COLORS: Record<SegmentName, string> = {
  Enterprise: '#0D6E6E',
  'Mid-Market': '#0284C7',
  'Public Sector': '#475569',
  SMB: '#D97706',
};

export function ChartsOverview({
  baseRecords,
  filteredRecords,
  crossFilter,
  targetAdjustmentPct,
  activeTrendMetric,
  onChangeTrendMetric,
  onToggleCrossFilter,
  onOpenContextMenu,
  onQuickDrillThrough,
}: ChartsOverviewProps) {
  const [showPriorYear, setShowPriorYear] = useState(true);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<SegmentName | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<
    Record<string, boolean>
  >({ 'Cloud Platform': true });
  const [matrixSort, setMatrixSort] = useState<{
    key: 'revenue' | 'target' | 'attainment' | 'margin' | 'yoy';
    dir: 'asc' | 'desc';
  }>({ key: 'revenue', dir: 'desc' });

  // 1. Monthly Trend Data (use baseRecords if crossFilter is on month, else filteredRecords)
  const monthlySource =
    crossFilter?.dimension === 'month' ? baseRecords : filteredRecords;

  const monthlyData = useMemo(() => {
    return MONTHS.map((label, idx) => {
      const slice = monthlySource.filter((r) => r.monthIndex === idx);
      const revenue = slice.reduce((s, r) => s + r.revenue, 0);
      const target = slice.reduce(
        (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
        0
      );
      const priorYear = slice.reduce((s, r) => s + r.priorYearRevenue, 0);
      const grossProfit = slice.reduce((s, r) => s + r.grossProfit, 0);
      const pipeline = slice.reduce((s, r) => s + r.pipelineValue, 0);
      const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const pipeCoverage = target > 0 ? pipeline / target : 0;
      return {
        idx,
        label,
        count: slice.length,
        revenue,
        target,
        priorYear,
        marginPct,
        pipeCoverage,
      };
    });
  }, [monthlySource, targetAdjustmentPct]);

  const activeMonthlyPoints = monthlyData.filter((m) => m.count > 0);
  const maxTrendVal = useMemo(() => {
    if (activeMonthlyPoints.length === 0) return 100;
    if (activeTrendMetric === 'revenue') {
      return (
        Math.max(
          ...activeMonthlyPoints.flatMap((m) => [
            m.revenue,
            m.target,
            showPriorYear ? m.priorYear : 0,
          ]),
          1
        ) * 1.12
      );
    }
    if (activeTrendMetric === 'margin') {
      return 85;
    }
    return Math.max(...activeMonthlyPoints.map((m) => m.pipeCoverage), 4) * 1.15;
  }, [activeMonthlyPoints, activeTrendMetric, showPriorYear]);

  // 2. Regional Attainment Data
  const regionSource =
    crossFilter?.dimension === 'region' ? baseRecords : filteredRecords;

  const regionData = useMemo(() => {
    return REGIONS.map((region: RegionName) => {
      const slice = regionSource.filter((r) => r.region === region);
      const revenue = slice.reduce((s, r) => s + r.revenue, 0);
      const target = slice.reduce(
        (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
        0
      );
      const priorYear = slice.reduce((s, r) => s + r.priorYearRevenue, 0);
      const attainment = target > 0 ? (revenue / target) * 100 : 0;
      const variancePct = target > 0 ? ((revenue - target) / target) * 100 : 0;
      const yoyPct =
        priorYear > 0 ? ((revenue - priorYear) / priorYear) * 100 : 0;
      const status = getRecordStatus(revenue, target);
      return {
        region,
        count: slice.length,
        revenue,
        target,
        attainment,
        variancePct,
        yoyPct,
        status,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [regionSource, targetAdjustmentPct]);

  const maxRegionScale = useMemo(() => {
    return (
      Math.max(
        ...regionData.flatMap((r) => [r.revenue, r.target]),
        1
      ) * 1.08
    );
  }, [regionData]);

  // 3. Segment Donut Data
  const segmentSource =
    crossFilter?.dimension === 'segment' ? baseRecords : filteredRecords;

  const segmentData = useMemo(() => {
    const total = segmentSource.reduce((s, r) => s + r.revenue, 0);
    return SEGMENTS.map((segment) => {
      const slice = segmentSource.filter((r) => r.segment === segment);
      const revenue = slice.reduce((s, r) => s + r.revenue, 0);
      const target = slice.reduce(
        (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
        0
      );
      const gp = slice.reduce((s, r) => s + r.grossProfit, 0);
      const share = total > 0 ? (revenue / total) * 100 : 0;
      const marginPct = revenue > 0 ? (gp / revenue) * 100 : 0;
      const attainment = target > 0 ? (revenue / target) * 100 : 0;
      return {
        segment,
        count: slice.length,
        revenue,
        target,
        share,
        marginPct,
        attainment,
        color: SEGMENT_COLORS[segment],
      };
    });
  }, [segmentSource, targetAdjustmentPct]);

  const totalSegmentRev = segmentData.reduce((s, d) => s + d.revenue, 0);

  // 4. Product Line Hierarchy Matrix
  const productSource =
    crossFilter?.dimension === 'productLine' ||
    crossFilter?.dimension === 'productSku'
      ? baseRecords
      : filteredRecords;

  const productMatrix = useMemo(() => {
    const rows = PRODUCT_LINES.map((line: ProductLineName) => {
      const slice = productSource.filter((r) => r.productLine === line);
      const revenue = slice.reduce((s, r) => s + r.revenue, 0);
      const target = slice.reduce(
        (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
        0
      );
      const priorYear = slice.reduce((s, r) => s + r.priorYearRevenue, 0);
      const gp = slice.reduce((s, r) => s + r.grossProfit, 0);
      const attainment = target > 0 ? (revenue / target) * 100 : 0;
      const margin = revenue > 0 ? (gp / revenue) * 100 : 0;
      const yoy = priorYear > 0 ? ((revenue - priorYear) / priorYear) * 100 : 0;
      const status = getRecordStatus(revenue, target);

      const children = PRODUCT_SKUS[line].map((sku) => {
        const skuSlice = slice.filter((r) => r.productSku === sku);
        const sRev = skuSlice.reduce((s, r) => s + r.revenue, 0);
        const sTgt = skuSlice.reduce(
          (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
          0
        );
        const sPy = skuSlice.reduce((s, r) => s + r.priorYearRevenue, 0);
        const sGp = skuSlice.reduce((s, r) => s + r.grossProfit, 0);
        return {
          sku,
          count: skuSlice.length,
          revenue: sRev,
          target: sTgt,
          attainment: sTgt > 0 ? (sRev / sTgt) * 100 : 0,
          margin: sRev > 0 ? (sGp / sRev) * 100 : 0,
          yoy: sPy > 0 ? ((sRev - sPy) / sPy) * 100 : 0,
          status: getRecordStatus(sRev, sTgt),
        };
      });

      return {
        line,
        count: slice.length,
        revenue,
        target,
        attainment,
        margin,
        yoy,
        status,
        children,
      };
    });

    rows.sort((a, b) => {
      const diff = a[matrixSort.key] - b[matrixSort.key];
      return matrixSort.dir === 'asc' ? diff : -diff;
    });
    return rows;
  }, [productSource, targetAdjustmentPct, matrixSort]);

  const toggleSort = (
    key: 'revenue' | 'target' | 'attainment' | 'margin' | 'yoy'
  ) => {
    setMatrixSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' }
    );
  };

  // SVG Donut geometry
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  // Chart dimensions for Monthly Combo
  const chartW = 680;
  const chartH = 240;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const hoveredMonth =
    hoveredMonthIdx !== null ? monthlyData[hoveredMonthIdx] : null;

  return (
    <div className="space-y-4">
      {/* Row 2: Dominant Focal Anchor (8 cols) + Regional Attainment (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Monthly Revenue vs Target & YoY Combo Chart */}
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Monthly Performance vs. Target
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click a month bar to cross-filter · Right-click for drill-through
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {activeTrendMetric === 'revenue' && (
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPriorYear}
                    onChange={(e) => setShowPriorYear(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0D6E6E]"
                  />
                  <span>Prior Year</span>
                </label>
              )}

              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded">
                {(
                  [
                    ['revenue', 'Revenue'],
                    ['margin', 'Margin %'],
                    ['pipeline', 'Pipeline'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeTrendMetric(key)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap ${
                      activeTrendMetric === key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between gap-4 pt-3 pb-1 text-xs text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-2.5 bg-[#0D6E6E] rounded-[1px] inline-block" />
                <span>
                  {activeTrendMetric === 'revenue'
                    ? 'Actual Revenue'
                    : activeTrendMetric === 'margin'
                      ? 'Gross Margin %'
                      : 'Pipeline Coverage (x)'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[#D97706] inline-block" />
                <span>Target</span>
              </span>
              {activeTrendMetric === 'revenue' && showPriorYear && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-[#0284C7] inline-block" />
                  <span>FY 2025 Prior Year</span>
                </span>
              )}
            </div>

            {crossFilter?.dimension === 'month' && (
              <button
                type="button"
                onClick={() =>
                  onQuickDrillThrough(
                    'month',
                    crossFilter.value,
                    crossFilter.label
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E6E] hover:underline whitespace-nowrap"
              >
                <span>Drill through {crossFilter.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* SVG Combo Chart */}
          <div className="relative mt-1 flex-1 min-h-[245px]">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-full max-h-[260px] select-none overflow-visible"
              role="img"
              aria-label="Monthly KPI performance versus target chart"
            >
              {/* Horizontal Gridlines & Y-Axis Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const val = maxTrendVal * tick;
                const y = padT + innerH - tick * innerH;
                const label =
                  activeTrendMetric === 'revenue'
                    ? formatCompactCurrency(val)
                    : activeTrendMetric === 'margin'
                      ? `${val.toFixed(0)}%`
                      : `${val.toFixed(1)}x`;
                return (
                  <g key={tick}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'}
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {monthlyData.map((m, i) => {
                const slotW = innerW / 12;
                const barW = Math.min(28, slotW * 0.56);
                const x = padL + i * slotW + (slotW - barW) / 2;

                const val =
                  activeTrendMetric === 'revenue'
                    ? m.revenue
                    : activeTrendMetric === 'margin'
                      ? m.marginPct
                      : m.pipeCoverage;

                const barH =
                  m.count > 0
                    ? Math.max(2, (val / maxTrendVal) * innerH)
                    : 0;
                const y = padT + innerH - barH;

                const isSelected =
                  crossFilter?.dimension === 'month' &&
                  crossFilter.value === m.label;
                const isDimmed =
                  crossFilter?.dimension === 'month' &&
                  crossFilter.value !== m.label;

                const targetVal =
                  activeTrendMetric === 'revenue'
                    ? m.target
                    : activeTrendMetric === 'margin'
                      ? 66
                      : 3.3;
                const metTarget = val >= targetVal;

                return (
                  <g
                    key={m.label}
                    className={m.count > 0 ? 'cursor-pointer' : 'opacity-30'}
                    onMouseEnter={() => m.count > 0 && setHoveredMonthIdx(i)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    onClick={() => {
                      if (m.count === 0) return;
                      onToggleCrossFilter({
                        dimension: 'month',
                        value: m.label,
                        label: `${m.label} 2026`,
                      });
                    }}
                    onContextMenu={(e) => {
                      if (m.count === 0) return;
                      e.preventDefault();
                      onOpenContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        dimension: 'month',
                        value: m.label,
                        label: `${m.label} 2026`,
                      });
                    }}
                  >
                    {/* Hover hit area */}
                    <rect
                      x={padL + i * slotW}
                      y={padT}
                      width={slotW}
                      height={innerH + padB}
                      fill={
                        hoveredMonthIdx === i
                          ? 'rgba(15, 23, 42, 0.03)'
                          : 'transparent'
                      }
                    />
                    {m.count > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={2}
                        fill={metTarget ? '#0D6E6E' : '#64748B'}
                        fillOpacity={isDimmed ? 0.25 : isSelected ? 1 : 0.88}
                        stroke={isSelected ? '#0F172A' : 'none'}
                        strokeWidth={isSelected ? 1.5 : 0}
                      />
                    )}
                    <text
                      x={padL + i * slotW + slotW / 2}
                      y={chartH - 10}
                      textAnchor="middle"
                      className={`text-[11px] ${
                        isSelected
                          ? 'fill-slate-900 font-semibold'
                          : 'fill-slate-500'
                      }`}
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}

              {/* Target Line */}
              {activeMonthlyPoints.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  pointerEvents="none"
                  points={monthlyData
                    .filter((m) => m.count > 0)
                    .map((m) => {
                      const slotW = innerW / 12;
                      const cx = padL + m.idx * slotW + slotW / 2;
                      const tgt =
                        activeTrendMetric === 'revenue'
                          ? m.target
                          : activeTrendMetric === 'margin'
                            ? 66
                            : 3.3;
                      const cy =
                        padT + innerH - (tgt / maxTrendVal) * innerH;
                      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              )}

              {/* Prior Year Line (for Revenue view) */}
              {activeTrendMetric === 'revenue' &&
                showPriorYear &&
                activeMonthlyPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="1.75"
                    pointerEvents="none"
                    points={monthlyData
                      .filter((m) => m.count > 0)
                      .map((m) => {
                        const slotW = innerW / 12;
                        const cx = padL + m.idx * slotW + slotW / 2;
                        const cy =
                          padT + innerH - (m.priorYear / maxTrendVal) * innerH;
                        return `${cx.toFixed(1)},${cy.toFixed(1)}`;
                      })
                      .join(' ')}
                  />
                )}
            </svg>

            {/* Hover Tooltip */}
            {hoveredMonth && hoveredMonth.count > 0 && (
              <div
                className="pointer-events-none absolute top-2 right-2 bg-slate-900 text-white rounded px-3 py-2 text-xs shadow-md z-10 min-w-[196px]"
              >
                <div className="font-semibold text-slate-100 pb-1 mb-1 border-b border-slate-700 flex items-center justify-between">
                  <span>{hoveredMonth.label} 2026</span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {hoveredMonth.count} deals
                  </span>
                </div>
                {activeTrendMetric === 'revenue' && (
                  <div className="space-y-0.5 font-mono-tabular">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Actual</span>
                      <span>{formatCompactCurrency(hoveredMonth.revenue)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Target</span>
                      <span>{formatCompactCurrency(hoveredMonth.target)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Prior Yr</span>
                      <span>{formatCompactCurrency(hoveredMonth.priorYear)}</span>
                    </div>
                  </div>
                )}
                {activeTrendMetric === 'margin' && (
                  <div className="space-y-0.5 font-mono-tabular">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Gross Margin</span>
                      <span>{hoveredMonth.marginPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Target</span>
                      <span>66.0%</span>
                    </div>
                  </div>
                )}
                {activeTrendMetric === 'pipeline' && (
                  <div className="space-y-0.5 font-mono-tabular">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Coverage</span>
                      <span>{hoveredMonth.pipeCoverage.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-300 font-sans">Target</span>
                      <span>3.30x</span>
                    </div>
                  </div>
                )}
                <div className="mt-1.5 pt-1 border-t border-slate-700 text-[10px] text-slate-400">
                  Click to filter · Right-click to drill through
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Regional Target Attainment Bullet Chart (4 cols) */}
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Attainment by Region
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Actual bar vs. target line · Click to filter
              </p>
            </div>
            {crossFilter?.dimension === 'region' && (
              <button
                type="button"
                onClick={() =>
                  onQuickDrillThrough(
                    'region',
                    crossFilter.value,
                    crossFilter.label
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E6E] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Drill</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 space-y-4 flex-1 flex flex-col justify-center">
            {regionData.map((item) => {
              const actualPct = Math.min(
                100,
                (item.revenue / maxRegionScale) * 100
              );
              const targetPct = Math.min(
                100,
                (item.target / maxRegionScale) * 100
              );
              const isSelected =
                crossFilter?.dimension === 'region' &&
                crossFilter.value === item.region;
              const isDimmed =
                crossFilter?.dimension === 'region' &&
                crossFilter.value !== item.region;

              return (
                <div
                  key={item.region}
                  onClick={() =>
                    onToggleCrossFilter({
                      dimension: 'region',
                      value: item.region,
                      label: item.region,
                    })
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onOpenContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      dimension: 'region',
                      value: item.region,
                      label: item.region,
                    });
                  }}
                  className={`group rounded p-2 -mx-2 cursor-pointer transition-opacity ${
                    isSelected ? 'bg-slate-50 ring-1 ring-[#0D6E6E]/35' : 'hover:bg-slate-50'
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-900 truncate">
                        {item.region}
                      </span>
                      <button
                        type="button"
                        title={`Drill through ${item.region}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickDrillThrough('region', item.region, item.region);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#0D6E6E] hover:text-[#094F4F] p-0.5 rounded transition-opacity"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono-tabular">
                      <span className="font-semibold text-slate-900">
                        {formatCompactCurrency(item.revenue)}
                      </span>
                      <span
                        className={
                          item.variancePct >= 0
                            ? 'text-[#15803D]'
                            : item.variancePct >= -7
                              ? 'text-[#B45309]'
                              : 'text-[#B91C1C]'
                        }
                      >
                        {formatSignedPercent(item.variancePct)}
                      </span>
                    </div>
                  </div>

                  {/* Bullet Bar */}
                  <div className="relative h-4 bg-slate-100 rounded-sm overflow-visible">
                    <div
                      className="h-full rounded-sm transition-all duration-200"
                      style={{
                        width: `${actualPct}%`,
                        backgroundColor:
                          item.status === 'On Target'
                            ? '#0D6E6E'
                            : item.status === 'Watch'
                              ? '#D97706'
                              : '#B91C1C',
                      }}
                    />
                    {/* Target marker */}
                    <div
                      className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-slate-900"
                      style={{ left: `${targetPct}%` }}
                      title={`Target: ${formatCompactCurrency(item.target)}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono-tabular">
                    <span>
                      Target {formatCompactCurrency(item.target)} ·{' '}
                      {item.attainment.toFixed(1)}%
                    </span>
                    <StatusLabel status={item.status} compact />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Row 3: Segment Mix Donut (5 cols) + Product Line Expandable Matrix (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Business Segment Mix */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Revenue Mix by Segment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click a segment to cross-filter · Right-click to drill through
              </p>
            </div>
            {crossFilter?.dimension === 'segment' && (
              <button
                type="button"
                onClick={() =>
                  onQuickDrillThrough(
                    'segment',
                    crossFilter.value,
                    crossFilter.label
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E6E] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Drill</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-6 flex-1">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 shrink-0">
              <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
                {segmentData.map((seg) => {
                  const dashLen = (seg.share / 100) * circumference;
                  const dashOffset = -accumulatedPct * (circumference / 100);
                  accumulatedPct += seg.share;

                  const isSelected =
                    crossFilter?.dimension === 'segment' &&
                    crossFilter.value === seg.segment;
                  const isDimmed =
                    crossFilter?.dimension === 'segment' &&
                    crossFilter.value !== seg.segment;
                  const isHover = hoveredSegment === seg.segment;

                  return (
                    <circle
                      key={seg.segment}
                      cx="72"
                      cy="72"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHover || isSelected ? 22 : 18}
                      strokeDasharray={`${dashLen} ${circumference}`}
                      strokeDashoffset={dashOffset}
                      strokeOpacity={isDimmed ? 0.28 : 1}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredSegment(seg.segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() =>
                        onToggleCrossFilter({
                          dimension: 'segment',
                          value: seg.segment,
                          label: seg.segment,
                        })
                      }
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onOpenContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          dimension: 'segment',
                          value: seg.segment,
                          label: seg.segment,
                        });
                      }}
                    />
                  );
                })}
              </svg>
              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-[11px] text-slate-500 truncate max-w-full">
                  {hoveredSegment ||
                    (crossFilter?.dimension === 'segment'
                      ? crossFilter.label
                      : 'All Segments')}
                </span>
                <span className="font-mono-tabular text-sm font-semibold text-slate-900 mt-0.5">
                  {formatCompactCurrency(
                    hoveredSegment
                      ? segmentData.find((s) => s.segment === hoveredSegment)
                          ?.revenue ?? 0
                      : totalSegmentRev
                  )}
                </span>
              </div>
            </div>

            {/* Segment Legend Table */}
            <div className="w-full flex-1 divide-y divide-slate-100">
              {segmentData.map((seg) => {
                const isSelected =
                  crossFilter?.dimension === 'segment' &&
                  crossFilter.value === seg.segment;
                const isDimmed =
                  crossFilter?.dimension === 'segment' &&
                  crossFilter.value !== seg.segment;

                return (
                  <div
                    key={seg.segment}
                    onMouseEnter={() => setHoveredSegment(seg.segment)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() =>
                      onToggleCrossFilter({
                        dimension: 'segment',
                        value: seg.segment,
                        label: seg.segment,
                      })
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onOpenContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        dimension: 'segment',
                        value: seg.segment,
                        label: seg.segment,
                      });
                    }}
                    className={`group flex items-center justify-between py-2 px-1.5 -mx-1.5 rounded cursor-pointer transition-opacity ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                    } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs font-medium text-slate-800 truncate">
                        {seg.segment}
                      </span>
                      <button
                        type="button"
                        title={`Drill through ${seg.segment}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickDrillThrough(
                            'segment',
                            seg.segment,
                            seg.segment
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#0D6E6E]"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right font-mono-tabular text-xs shrink-0">
                      <span className="font-semibold text-slate-900">
                        {formatCompactCurrency(seg.revenue)}
                      </span>
                      <span className="text-slate-400 ml-2">
                        {seg.share.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product Line Expandable Hierarchy Matrix (7 cols) */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Product Line & SKU KPI Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Expand rows for SKU breakdown · Click row to filter or drill
                through
              </p>
            </div>
            {(crossFilter?.dimension === 'productLine' ||
              crossFilter?.dimension === 'productSku') && (
              <button
                type="button"
                onClick={() =>
                  onQuickDrillThrough(
                    crossFilter.dimension as 'productLine' | 'productSku',
                    crossFilter.value,
                    crossFilter.label
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E6E] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Drill through {crossFilter.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Product Line / SKU</th>
                  <th className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('revenue')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Actual</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('target')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Target</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('attainment')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Attainment</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('margin')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Margin</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('yoy')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>YoY</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 pl-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {productMatrix.map((row) => {
                  const isExpanded = Boolean(expandedProducts[row.line]);
                  const isRowSelected =
                    crossFilter?.dimension === 'productLine' &&
                    crossFilter.value === row.line;
                  const isRowDimmed =
                    (crossFilter?.dimension === 'productLine' &&
                      crossFilter.value !== row.line) ||
                    (crossFilter?.dimension === 'productSku' &&
                      !row.children.some((c) => c.sku === crossFilter.value));

                  return (
                    <Fragment key={row.line}>
                      <tr
                        onClick={() =>
                          onToggleCrossFilter({
                            dimension: 'productLine',
                            value: row.line,
                            label: row.line,
                          })
                        }
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onOpenContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            dimension: 'productLine',
                            value: row.line,
                            label: row.line,
                          });
                        }}
                        className={`group h-10 cursor-pointer transition-opacity ${
                          isRowSelected ? 'bg-slate-50' : 'hover:bg-slate-50/80'
                        } ${isRowDimmed ? 'opacity-40' : 'opacity-100'}`}
                      >
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={
                                isExpanded
                                  ? `Collapse ${row.line}`
                                  : `Expand ${row.line}`
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProducts((prev) => ({
                                  ...prev,
                                  [row.line]: !prev[row.line],
                                }));
                              }}
                              className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="truncate">{row.line}</span>
                            <button
                              type="button"
                              title={`Drill through ${row.line}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickDrillThrough(
                                  'productLine',
                                  row.line,
                                  row.line
                                );
                              }}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#0D6E6E] ml-0.5"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular font-semibold text-slate-900">
                          {formatCompactCurrency(row.revenue)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular text-slate-600">
                          {formatCompactCurrency(row.target)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-sm overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-sm"
                                style={{
                                  width: `${Math.min(100, row.attainment)}%`,
                                  backgroundColor:
                                    row.status === 'On Target'
                                      ? '#0D6E6E'
                                      : row.status === 'Watch'
                                        ? '#D97706'
                                        : '#B91C1C',
                                }}
                              />
                            </div>
                            <span className="text-slate-900">
                              {row.attainment.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-mono-tabular text-slate-700">
                          {row.margin.toFixed(1)}%
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono-tabular ${
                            row.yoy >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {formatSignedPercent(row.yoy)}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <StatusLabel status={row.status} compact />
                        </td>
                      </tr>

                      {isExpanded &&
                        row.children.map((sku) => {
                          const isSkuSelected =
                            crossFilter?.dimension === 'productSku' &&
                            crossFilter.value === sku.sku;
                          const isSkuDimmed =
                            crossFilter?.dimension === 'productSku' &&
                            crossFilter.value !== sku.sku;

                          return (
                            <tr
                              key={sku.sku}
                              onClick={() =>
                                onToggleCrossFilter({
                                  dimension: 'productSku',
                                  value: sku.sku,
                                  label: sku.sku,
                                })
                              }
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onOpenContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  dimension: 'productSku',
                                  value: sku.sku,
                                  label: sku.sku,
                                });
                              }}
                              className={`group h-9 bg-slate-50/50 cursor-pointer transition-opacity ${
                                isSkuSelected
                                  ? 'bg-teal-50/60'
                                  : 'hover:bg-slate-100/70'
                              } ${isSkuDimmed ? 'opacity-40' : 'opacity-100'}`}
                            >
                              <td className="py-1.5 pr-3 pl-7 text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate">{sku.sku}</span>
                                  <button
                                    type="button"
                                    title={`Drill through ${sku.sku}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onQuickDrillThrough(
                                        'productSku',
                                        sku.sku,
                                        sku.sku
                                      );
                                    }}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#0D6E6E]"
                                  >
                                    <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-800">
                                {formatCompactCurrency(sku.revenue)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-500">
                                {formatCompactCurrency(sku.target)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-700">
                                {sku.attainment.toFixed(1)}%
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-600">
                                {sku.margin.toFixed(1)}%
                              </td>
                              <td
                                className={`py-1.5 px-2 text-right font-mono-tabular ${
                                  sku.yoy >= 0
                                    ? 'text-[#15803D]'
                                    : 'text-[#B91C1C]'
                                }`}
                              >
                                {formatSignedPercent(sku.yoy)}
                              </td>
                              <td className="py-1.5 pl-2 text-right">
                                <StatusLabel status={sku.status} compact />
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
