import {
  formatCompactCurrency,
  getAdjustedTarget,
  MONTHS,
} from '../data/kpiData';
import { KpiRecord, KpiStatus, KpiSummary } from '../types/kpi';
import { StatusLabel } from './StatusLabel';

export type TrendMetricKey = 'revenue' | 'margin' | 'pipeline';

interface KpiCardRowProps {
  records: KpiRecord[];
  summary: KpiSummary;
  targetAdjustmentPct: number;
  activeTrendMetric: TrendMetricKey;
  onSelectTrendMetric: (metric: TrendMetricKey) => void;
  onInspectRecords: () => void;
}

interface SparklineProps {
  values: number[];
  targetValue?: number;
  strokeColor: string;
}

function Sparkline({ values, targetValue, strokeColor }: SparklineProps) {
  if (values.length === 0) {
    return <div className="h-9" />;
  }
  const width = 160;
  const height = 34;
  const padY = 4;

  const allVals = targetValue !== undefined ? [...values, targetValue] : values;
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  const getY = (val: number) =>
    height - padY - ((val - min) / range) * (height - padY * 2);

  const points = values.map((v, i) => {
    const x =
      values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = getY(v);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`;
  const targetY = targetValue !== undefined ? getY(targetValue) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-9 overflow-visible"
      aria-hidden="true"
    >
      {targetY !== null && (
        <line
          x1={0}
          y1={targetY}
          x2={width}
          y2={targetY}
          stroke="#94A3B8"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      <polygon points={areaPoints} fill={strokeColor} fillOpacity="0.08" />
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

export function KpiCardRow({
  records,
  summary,
  targetAdjustmentPct,
  activeTrendMetric,
  onSelectTrendMetric,
  onInspectRecords,
}: KpiCardRowProps) {
  // Compute monthly series for sparklines
  const monthlySeries = MONTHS.map((_, idx) => {
    const slice = records.filter((r) => r.monthIndex === idx);
    if (slice.length === 0) return null;
    const rev = slice.reduce((a, b) => a + b.revenue, 0);
    const tgt = slice.reduce(
      (a, b) => a + getAdjustedTarget(b.targetRevenue, targetAdjustmentPct),
      0
    );
    const gp = slice.reduce((a, b) => a + b.grossProfit, 0);
    const nrrN = slice.reduce((a, b) => a + b.nrrNumerator, 0);
    const nrrD = slice.reduce((a, b) => a + b.nrrDenominator, 0);
    const cac = slice.reduce((a, b) => a + b.cacSpend, 0);
    const newArr = slice.reduce((a, b) => a + b.newArr, 0);
    const pipe = slice.reduce((a, b) => a + b.pipelineValue, 0);

    const marginPct = rev > 0 ? (gp / rev) * 100 : 0;
    const nrrPct = nrrD > 0 ? (nrrN / nrrD) * 100 : 0;
    const gmRatio = rev > 0 ? gp / rev : 0.66;
    const monthlyGmNewArr = (newArr * gmRatio) / 12;
    const payback = monthlyGmNewArr > 0 ? cac / monthlyGmNewArr : 0;
    const coverage = tgt > 0 ? pipe / tgt : 0;

    return { rev, tgt, marginPct, nrrPct, payback, coverage };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const revStatus: KpiStatus =
    summary.revenueAttainmentPct >= 100
      ? 'On Target'
      : summary.revenueAttainmentPct >= 93
        ? 'Watch'
        : 'Below Target';

  const marginDiff = summary.grossMarginPct - summary.targetMarginPct;
  const marginStatus: KpiStatus =
    marginDiff >= 0 ? 'On Target' : marginDiff >= -2.5 ? 'Watch' : 'Below Target';

  const nrrDiff = summary.nrrPct - summary.targetNrrPct;
  const nrrStatus: KpiStatus =
    nrrDiff >= 0 ? 'On Target' : nrrDiff >= -3 ? 'Watch' : 'Below Target';

  const cacDiff = summary.cacPaybackMonths - summary.targetCacPaybackMonths;
  const cacStatus: KpiStatus =
    cacDiff <= 0 ? 'On Target' : cacDiff <= 1.5 ? 'Watch' : 'Below Target';

  const pipeDiff = summary.pipelineCoverage - summary.targetPipelineCoverage;
  const pipeStatus: KpiStatus =
    pipeDiff >= 0 ? 'On Target' : pipeDiff >= -0.45 ? 'Watch' : 'Below Target';

  const cards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCompactCurrency(summary.totalRevenue),
      targetLabel: `Target ${formatCompactCurrency(summary.totalTarget)}`,
      deltaLabel: `${summary.revenueVariancePct >= 0 ? '+' : ''}${summary.revenueVariancePct.toFixed(1)}% vs target`,
      status: revStatus,
      sparkValues: monthlySeries.map((m) => m.rev),
      sparkTarget:
        monthlySeries.length > 0
          ? monthlySeries.reduce((a, b) => a + b.tgt, 0) / monthlySeries.length
          : undefined,
      color: '#0D6E6E',
      isSelected: activeTrendMetric === 'revenue',
      onClick: () => onSelectTrendMetric('revenue'),
    },
    {
      id: 'margin',
      title: 'Gross Margin',
      value: `${summary.grossMarginPct.toFixed(1)}%`,
      targetLabel: `Target ${summary.targetMarginPct.toFixed(1)}%`,
      deltaLabel: `${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)}pp`,
      status: marginStatus,
      sparkValues: monthlySeries.map((m) => m.marginPct),
      sparkTarget: summary.targetMarginPct,
      color: '#0284C7',
      isSelected: activeTrendMetric === 'margin',
      onClick: () => onSelectTrendMetric('margin'),
    },
    {
      id: 'nrr',
      title: 'Net Revenue Retention',
      value: `${summary.nrrPct.toFixed(1)}%`,
      targetLabel: `Target ${summary.targetNrrPct.toFixed(1)}%`,
      deltaLabel: `${nrrDiff >= 0 ? '+' : ''}${nrrDiff.toFixed(1)}pp`,
      status: nrrStatus,
      sparkValues: monthlySeries.map((m) => m.nrrPct),
      sparkTarget: summary.targetNrrPct,
      color: '#0D6E6E',
      isSelected: false,
      onClick: onInspectRecords,
    },
    {
      id: 'cac',
      title: 'CAC Payback Period',
      value: `${summary.cacPaybackMonths.toFixed(1)} mo`,
      targetLabel: `Target ≤ ${summary.targetCacPaybackMonths.toFixed(1)} mo`,
      deltaLabel: `${cacDiff >= 0 ? '+' : ''}${cacDiff.toFixed(1)} mo`,
      status: cacStatus,
      sparkValues: monthlySeries.map((m) => m.payback),
      sparkTarget: summary.targetCacPaybackMonths,
      color: '#475569',
      isSelected: false,
      onClick: onInspectRecords,
    },
    {
      id: 'pipeline',
      title: 'Pipeline Coverage',
      value: `${summary.pipelineCoverage.toFixed(2)}x`,
      targetLabel: `Target ${summary.targetPipelineCoverage.toFixed(1)}x`,
      deltaLabel: `${pipeDiff >= 0 ? '+' : ''}${pipeDiff.toFixed(2)}x`,
      status: pipeStatus,
      sparkValues: monthlySeries.map((m) => m.coverage),
      sparkTarget: summary.targetPipelineCoverage,
      color: '#D97706',
      isSelected: activeTrendMetric === 'pipeline',
      onClick: () => onSelectTrendMetric('pipeline'),
    },
  ];

  return (
    <section
      aria-label="Key Performance Indicators"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3"
    >
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={card.onClick}
          className={`text-left bg-white rounded-md border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-[#0D6E6E] ${
            card.isSelected
              ? 'border-[#0D6E6E] ring-1 ring-[#0D6E6E]/25'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 truncate">
              {card.title}
            </span>
            <StatusLabel status={card.status} compact />
          </div>

          <div className="mt-2 font-mono-tabular text-2xl font-semibold tracking-tight text-slate-900">
            {card.value}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono-tabular truncate">
            <span>{card.targetLabel}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                card.status === 'On Target'
                  ? 'text-[#15803D]'
                  : card.status === 'Watch'
                    ? 'text-[#B45309]'
                    : 'text-[#B91C1C]'
              }
            >
              {card.deltaLabel}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100">
            <Sparkline
              values={card.sparkValues}
              targetValue={card.sparkTarget}
              strokeColor={card.color}
            />
          </div>
        </button>
      ))}
    </section>
  );
}
