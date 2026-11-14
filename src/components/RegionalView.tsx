import { ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import {
  formatCompactCurrency,
  formatSignedPercent,
  getAdjustedTarget,
  getRecordStatus,
  REGIONS,
  SUB_REGIONS,
} from '../data/kpiData';
import {
  ContextMenuState,
  CrossFilter,
  KpiRecord,
  RegionName,
} from '../types/kpi';
import { StatusLabel } from './StatusLabel';

interface RegionalViewProps {
  baseRecords: KpiRecord[];
  filteredRecords: KpiRecord[];
  crossFilter: CrossFilter | null;
  targetAdjustmentPct: number;
  onToggleCrossFilter: (cf: CrossFilter) => void;
  onOpenContextMenu: (menu: ContextMenuState) => void;
  onQuickDrillThrough: (
    dimension: 'region' | 'subRegion',
    value: string,
    label: string
  ) => void;
}

export function RegionalView({
  baseRecords,
  filteredRecords,
  crossFilter,
  targetAdjustmentPct,
  onToggleCrossFilter,
  onOpenContextMenu,
  onQuickDrillThrough,
}: RegionalViewProps) {
  const [expandedRegions, setExpandedRegions] = useState<
    Record<string, boolean>
  >({
    'North America': true,
    EMEA: true,
    APAC: false,
    LATAM: false,
  });

  const source =
    crossFilter?.dimension === 'region' ||
    crossFilter?.dimension === 'subRegion'
      ? baseRecords
      : filteredRecords;

  const regionalStats = useMemo(() => {
    return REGIONS.map((region: RegionName) => {
      const slice = source.filter((r) => r.region === region);
      const revenue = slice.reduce((s, r) => s + r.revenue, 0);
      const target = slice.reduce(
        (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
        0
      );
      const pipeline = slice.reduce((s, r) => s + r.pipelineValue, 0);
      const gp = slice.reduce((s, r) => s + r.grossProfit, 0);
      const won = slice.filter((r) => r.wonDeal).length;
      const cycleSum = slice.reduce((s, r) => s + r.salesCycleDays, 0);

      const subRegions = SUB_REGIONS[region].map((sub) => {
        const subSlice = slice.filter((r) => r.subRegion === sub);
        const sRev = subSlice.reduce((s, r) => s + r.revenue, 0);
        const sTgt = subSlice.reduce(
          (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
          0
        );
        const sPipe = subSlice.reduce((s, r) => s + r.pipelineValue, 0);
        const sGp = subSlice.reduce((s, r) => s + r.grossProfit, 0);
        const sWon = subSlice.filter((r) => r.wonDeal).length;
        const sCycle = subSlice.reduce((s, r) => s + r.salesCycleDays, 0);
        return {
          sub,
          count: subSlice.length,
          revenue: sRev,
          target: sTgt,
          variance: sRev - sTgt,
          attainment: sTgt > 0 ? (sRev / sTgt) * 100 : 0,
          margin: sRev > 0 ? (sGp / sRev) * 100 : 0,
          coverage: sTgt > 0 ? sPipe / sTgt : 0,
          winRate: subSlice.length > 0 ? (sWon / subSlice.length) * 100 : 0,
          avgCycle: subSlice.length > 0 ? sCycle / subSlice.length : 0,
          status: getRecordStatus(sRev, sTgt),
        };
      });

      return {
        region,
        count: slice.length,
        revenue,
        target,
        variance: revenue - target,
        attainment: target > 0 ? (revenue / target) * 100 : 0,
        margin: revenue > 0 ? (gp / revenue) * 100 : 0,
        coverage: target > 0 ? pipeline / target : 0,
        winRate: slice.length > 0 ? (won / slice.length) * 100 : 0,
        avgCycle: slice.length > 0 ? cycleSum / slice.length : 0,
        status: getRecordStatus(revenue, target),
        subRegions,
      };
    });
  }, [source, targetAdjustmentPct]);

  // Waterfall Geometry
  const totalTarget = regionalStats.reduce((s, r) => s + r.target, 0);
  const totalActual = regionalStats.reduce((s, r) => s + r.revenue, 0);

  const waterfallBars = useMemo(() => {
    const bars: Array<{
      label: string;
      start: number;
      end: number;
      value: number;
      type: 'total' | 'pos' | 'neg';
      region?: RegionName;
    }> = [];

    bars.push({
      label: 'Total Target',
      start: 0,
      end: totalTarget,
      value: totalTarget,
      type: 'total',
    });

    let running = totalTarget;
    for (const r of regionalStats) {
      const next = running + r.variance;
      bars.push({
        label: r.region,
        start: Math.min(running, next),
        end: Math.max(running, next),
        value: r.variance,
        type: r.variance >= 0 ? 'pos' : 'neg',
        region: r.region,
      });
      running = next;
    }

    bars.push({
      label: 'Actual Revenue',
      start: 0,
      end: totalActual,
      value: totalActual,
      type: 'total',
    });

    return bars;
  }, [regionalStats, totalTarget, totalActual]);

  const maxWf = Math.max(...waterfallBars.map((b) => b.end), 1) * 1.1;
  const wfW = 680;
  const wfH = 230;
  const wfPadL = 56;
  const wfPadR = 16;
  const wfPadT = 22;
  const wfPadB = 34;
  const wfInnerW = wfW - wfPadL - wfPadR;
  const wfInnerH = wfH - wfPadT - wfPadB;

  return (
    <div className="space-y-4">
      {/* Regional Target Variance Waterfall */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Target-to-Actual Variance Bridge by Region
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Regional contributions to quota variance · Click a region bridge
              to filter or right-click to drill through
            </p>
          </div>
          <div className="font-mono-tabular text-xs text-slate-700">
            Net Variance:{' '}
            <span
              className={
                totalActual - totalTarget >= 0
                  ? 'font-semibold text-[#15803D]'
                  : 'font-semibold text-[#B91C1C]'
              }
            >
              {totalActual - totalTarget >= 0 ? '+' : ''}
              {formatCompactCurrency(totalActual - totalTarget)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <svg
            viewBox={`0 0 ${wfW} ${wfH}`}
            className="w-full max-h-[245px] overflow-visible select-none"
            role="img"
            aria-label="Regional target variance waterfall chart"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const val = maxWf * t;
              const y = wfPadT + wfInnerH - t * wfInnerH;
              return (
                <g key={t}>
                  <line
                    x1={wfPadL}
                    y1={y}
                    x2={wfW - wfPadR}
                    y2={y}
                    stroke={t === 0 ? '#CBD5E1' : '#F1F5F9'}
                    strokeWidth="1"
                  />
                  <text
                    x={wfPadL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {formatCompactCurrency(val)}
                  </text>
                </g>
              );
            })}

            {waterfallBars.map((bar, i) => {
              const slotW = wfInnerW / waterfallBars.length;
              const barW = Math.min(54, slotW * 0.55);
              const x = wfPadL + i * slotW + (slotW - barW) / 2;
              const topY = wfPadT + wfInnerH - (bar.end / maxWf) * wfInnerH;
              const botY = wfPadT + wfInnerH - (bar.start / maxWf) * wfInnerH;
              const barH = Math.max(3, botY - topY);

              const fill =
                bar.type === 'total'
                  ? '#1E293B'
                  : bar.type === 'pos'
                    ? '#0D6E6E'
                    : '#B91C1C';

              const isSelected =
                bar.region &&
                crossFilter?.dimension === 'region' &&
                crossFilter.value === bar.region;
              const isDimmed =
                bar.region &&
                crossFilter?.dimension === 'region' &&
                crossFilter.value !== bar.region;

              const labelVal =
                bar.type === 'total'
                  ? formatCompactCurrency(bar.value)
                  : `${bar.value >= 0 ? '+' : ''}${formatCompactCurrency(bar.value)}`;

              return (
                <g
                  key={bar.label}
                  className={bar.region ? 'cursor-pointer' : ''}
                  onClick={() => {
                    if (!bar.region) return;
                    onToggleCrossFilter({
                      dimension: 'region',
                      value: bar.region,
                      label: bar.region,
                    });
                  }}
                  onContextMenu={(e) => {
                    if (!bar.region) return;
                    e.preventDefault();
                    onOpenContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      dimension: 'region',
                      value: bar.region,
                      label: bar.region,
                    });
                  }}
                >
                  <rect
                    x={x}
                    y={topY}
                    width={barW}
                    height={barH}
                    rx={2}
                    fill={fill}
                    fillOpacity={isDimmed ? 0.3 : 0.92}
                    stroke={isSelected ? '#0F172A' : 'none'}
                    strokeWidth={isSelected ? 1.5 : 0}
                  />
                  <text
                    x={x + barW / 2}
                    y={topY - 6}
                    textAnchor="middle"
                    className="fill-slate-800 text-[10px] font-medium"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {labelVal}
                  </text>
                  <text
                    x={x + barW / 2}
                    y={wfH - 12}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px]"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* Regional & Sub-Region Territory Matrix */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Territory & Sub-Region KPI Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Expand regions to inspect sub-regions · Click any territory to
              drill through
            </p>
          </div>
        </div>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                <th className="py-2 pr-3">Region / Territory</th>
                <th className="py-2 px-2 text-right">Actual</th>
                <th className="py-2 px-2 text-right">Target</th>
                <th className="py-2 px-2 text-right">Variance</th>
                <th className="py-2 px-2 text-right">Attainment</th>
                <th className="py-2 px-2 text-right">Margin</th>
                <th className="py-2 px-2 text-right">Pipeline</th>
                <th className="py-2 px-2 text-right">Win Rate</th>
                <th className="py-2 px-2 text-right">Avg Cycle</th>
                <th className="py-2 pl-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {regionalStats.map((reg) => {
                const isExpanded = Boolean(expandedRegions[reg.region]);
                return (
                  <Fragment key={reg.region}>
                    <tr
                      onClick={() =>
                        onToggleCrossFilter({
                          dimension: 'region',
                          value: reg.region,
                          label: reg.region,
                        })
                      }
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onOpenContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          dimension: 'region',
                          value: reg.region,
                          label: reg.region,
                        });
                      }}
                      className="group h-10 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2 pr-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRegions((prev) => ({
                                ...prev,
                                [reg.region]: !prev[reg.region],
                              }));
                            }}
                            className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500"
                            aria-label={`Toggle ${reg.region}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span>{reg.region}</span>
                          <button
                            type="button"
                            title={`Drill through ${reg.region}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickDrillThrough(
                                'region',
                                reg.region,
                                reg.region
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#0D6E6E]"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular font-semibold text-slate-900">
                        {formatCompactCurrency(reg.revenue)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-600">
                        {formatCompactCurrency(reg.target)}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono-tabular ${
                          reg.variance >= 0
                            ? 'text-[#15803D]'
                            : 'text-[#B91C1C]'
                        }`}
                      >
                        {reg.variance >= 0 ? '+' : ''}
                        {formatCompactCurrency(reg.variance)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-900">
                        {reg.attainment.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-700">
                        {reg.margin.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-700">
                        {reg.coverage.toFixed(2)}x
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-700">
                        {reg.winRate.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-600">
                        {Math.round(reg.avgCycle)}d
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <StatusLabel status={reg.status} compact />
                      </td>
                    </tr>

                    {isExpanded &&
                      reg.subRegions.map((sub) => (
                        <tr
                          key={sub.sub}
                          onClick={() =>
                            onQuickDrillThrough('subRegion', sub.sub, sub.sub)
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onOpenContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              dimension: 'subRegion',
                              value: sub.sub,
                              label: sub.sub,
                            });
                          }}
                          className="group h-9 bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer"
                        >
                          <td className="py-1.5 pr-3 pl-7 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span>{sub.sub}</span>
                              <ArrowUpRight className="w-3 h-3 text-[#0D6E6E] opacity-0 group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-800">
                            {formatCompactCurrency(sub.revenue)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-500">
                            {formatCompactCurrency(sub.target)}
                          </td>
                          <td
                            className={`py-1.5 px-2 text-right font-mono-tabular ${
                              sub.variance >= 0
                                ? 'text-[#15803D]'
                                : 'text-[#B91C1C]'
                            }`}
                          >
                            {sub.variance >= 0 ? '+' : ''}
                            {formatCompactCurrency(sub.variance)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-700">
                            {formatSignedPercent(sub.attainment - 100)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-600">
                            {sub.margin.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-600">
                            {sub.coverage.toFixed(2)}x
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-600">
                            {sub.winRate.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-500">
                            {Math.round(sub.avgCycle)}d
                          </td>
                          <td className="py-1.5 pl-2 text-right">
                            <StatusLabel status={sub.status} compact />
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
