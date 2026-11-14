import { ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatCompactCurrency,
  getAdjustedTarget,
  PRODUCT_LINES,
  PRODUCT_SKUS,
  SEGMENTS,
} from '../data/kpiData';
import {
  ContextMenuState,
  CrossFilter,
  KpiRecord,
  ProductLineName,
  SegmentName,
} from '../types/kpi';

interface CategoriesViewProps {
  baseRecords: KpiRecord[];
  filteredRecords: KpiRecord[];
  crossFilter: CrossFilter | null;
  targetAdjustmentPct: number;
  onToggleCrossFilter: (cf: CrossFilter) => void;
  onOpenContextMenu: (menu: ContextMenuState) => void;
  onDrillIntersection: (segment: SegmentName, productLine: ProductLineName) => void;
  onQuickDrillThrough: (
    dimension: 'productSku' | 'productLine',
    value: string,
    label: string
  ) => void;
}

const LINE_COLORS: Record<ProductLineName, string> = {
  'Cloud Platform': '#0D6E6E',
  'Data Fabric': '#0284C7',
  'Security Suite': '#475569',
  'Managed Services': '#D97706',
};

export function CategoriesView({
  baseRecords,
  filteredRecords,
  crossFilter,
  targetAdjustmentPct,
  onToggleCrossFilter,
  onOpenContextMenu,
  onDrillIntersection,
  onQuickDrillThrough,
}: CategoriesViewProps) {
  const [hoveredSku, setHoveredSku] = useState<string | null>(null);

  const source =
    crossFilter?.dimension === 'productSku' ||
    crossFilter?.dimension === 'productLine'
      ? baseRecords
      : filteredRecords;

  // 12 SKU bubbles for Scatter Quadrant
  const skuPoints = useMemo(() => {
    const list: Array<{
      sku: string;
      line: ProductLineName;
      revenue: number;
      target: number;
      marginPct: number;
      deals: number;
      attainment: number;
    }> = [];

    for (const line of PRODUCT_LINES) {
      for (const sku of PRODUCT_SKUS[line]) {
        const slice = source.filter((r) => r.productSku === sku);
        if (slice.length === 0) continue;
        const revenue = slice.reduce((s, r) => s + r.revenue, 0);
        const target = slice.reduce(
          (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
          0
        );
        const gp = slice.reduce((s, r) => s + r.grossProfit, 0);
        const deals = slice.reduce((s, r) => s + r.dealCount, 0);
        list.push({
          sku,
          line,
          revenue,
          target,
          marginPct: revenue > 0 ? (gp / revenue) * 100 : 0,
          deals,
          attainment: target > 0 ? (revenue / target) * 100 : 0,
        });
      }
    }
    return list;
  }, [source, targetAdjustmentPct]);

  // Cross-tab Matrix: Segment x Product Line
  const crossTab = useMemo(() => {
    return SEGMENTS.map((segment) => {
      const cells = PRODUCT_LINES.map((line) => {
        const slice = filteredRecords.filter(
          (r) => r.segment === segment && r.productLine === line
        );
        const revenue = slice.reduce((s, r) => s + r.revenue, 0);
        const target = slice.reduce(
          (s, r) => s + getAdjustedTarget(r.targetRevenue, targetAdjustmentPct),
          0
        );
        const attainment = target > 0 ? (revenue / target) * 100 : 0;
        return {
          segment,
          line,
          count: slice.length,
          revenue,
          target,
          attainment,
        };
      });
      const rowTotal = cells.reduce((s, c) => s + c.revenue, 0);
      return { segment, cells, rowTotal };
    });
  }, [filteredRecords, targetAdjustmentPct]);

  // Scatter geometry
  const scW = 640;
  const scH = 290;
  const padL = 52;
  const padR = 24;
  const padT = 22;
  const padB = 34;
  const innerW = scW - padL - padR;
  const innerH = scH - padT - padB;

  const maxRev = Math.max(...skuPoints.map((p) => p.revenue), 1) * 1.15;
  const avgRev =
    skuPoints.length > 0
      ? skuPoints.reduce((s, p) => s + p.revenue, 0) / skuPoints.length
      : maxRev / 2;
  const minMargin = 45;
  const maxMargin = 80;
  const targetMargin = 66;

  const hoveredPoint = skuPoints.find((p) => p.sku === hoveredSku) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Scatter Quadrant Chart */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                SKU Margin vs. Revenue Quadrant
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bubble size = deal volume · Click SKU to cross-filter or
                right-click to drill through
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
              {PRODUCT_LINES.map((line) => (
                <span key={line} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: LINE_COLORS[line] }}
                  />
                  <span>{line}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="relative mt-3 flex-1">
            <svg
              viewBox={`0 0 ${scW} ${scH}`}
              className="w-full max-h-[300px] overflow-visible select-none"
              role="img"
              aria-label="Product SKU margin versus revenue scatter plot"
            >
              {/* Y-Axis Margin Ticks */}
              {[50, 60, 66, 70, 80].map((m) => {
                const y =
                  padT +
                  innerH -
                  ((m - minMargin) / (maxMargin - minMargin)) * innerH;
                const isTarget = m === targetMargin;
                return (
                  <g key={m}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={scW - padR}
                      y2={y}
                      stroke={isTarget ? '#D97706' : '#F1F5F9'}
                      strokeDasharray={isTarget ? '4 4' : undefined}
                      strokeWidth={isTarget ? 1.5 : 1}
                    />
                    <text
                      x={padL - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className={`text-[10px] ${
                        isTarget ? 'fill-[#B45309] font-medium' : 'fill-slate-400'
                      }`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {m}%
                    </text>
                  </g>
                );
              })}

              {/* Vertical Mean Revenue Line */}
              {skuPoints.length > 0 && (
                <line
                  x1={padL + (avgRev / maxRev) * innerW}
                  y1={padT}
                  x2={padL + (avgRev / maxRev) * innerW}
                  y2={padT + innerH}
                  stroke="#CBD5E1"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              )}

              {/* X-Axis */}
              <line
                x1={padL}
                y1={padT + innerH}
                x2={scW - padR}
                y2={padT + innerH}
                stroke="#CBD5E1"
                strokeWidth="1"
              />
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = maxRev * t;
                const x = padL + t * innerW;
                return (
                  <text
                    key={t}
                    x={x}
                    y={scH - 12}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {formatCompactCurrency(val)}
                  </text>
                );
              })}

              {/* Bubbles */}
              {skuPoints.map((pt) => {
                const cx = padL + (pt.revenue / maxRev) * innerW;
                const clampedM = Math.max(
                  minMargin,
                  Math.min(maxMargin, pt.marginPct)
                );
                const cy =
                  padT +
                  innerH -
                  ((clampedM - minMargin) / (maxMargin - minMargin)) * innerH;
                const r = Math.max(7, Math.min(20, Math.sqrt(pt.deals) * 1.4));
                const isSelected =
                  crossFilter?.dimension === 'productSku' &&
                  crossFilter.value === pt.sku;
                const isDimmed =
                  (crossFilter?.dimension === 'productSku' &&
                    crossFilter.value !== pt.sku) ||
                  (crossFilter?.dimension === 'productLine' &&
                    crossFilter.value !== pt.line);

                return (
                  <g
                    key={pt.sku}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredSku(pt.sku)}
                    onMouseLeave={() => setHoveredSku(null)}
                    onClick={() =>
                      onToggleCrossFilter({
                        dimension: 'productSku',
                        value: pt.sku,
                        label: pt.sku,
                      })
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onOpenContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        dimension: 'productSku',
                        value: pt.sku,
                        label: pt.sku,
                      });
                    }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={LINE_COLORS[pt.line]}
                      fillOpacity={isDimmed ? 0.22 : 0.78}
                      stroke={isSelected ? '#0F172A' : '#FFFFFF'}
                      strokeWidth={isSelected ? 2 : 1.5}
                    />
                  </g>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div className="pointer-events-none absolute top-2 right-2 bg-slate-900 text-white rounded px-3 py-2 text-xs shadow-md min-w-[205px]">
                <div className="font-semibold pb-1 mb-1 border-b border-slate-700">
                  {hoveredPoint.sku}
                </div>
                <div className="space-y-0.5 font-mono-tabular">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-300 font-sans">Line</span>
                    <span className="font-sans">{hoveredPoint.line}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-300 font-sans">Revenue</span>
                    <span>{formatCompactCurrency(hoveredPoint.revenue)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-300 font-sans">Margin</span>
                    <span>{hoveredPoint.marginPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-300 font-sans">Attainment</span>
                    <span>{hoveredPoint.attainment.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Segment x Product Line Cross-Tab Heatmap */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-md p-4 flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Segment × Product Attainment Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any intersection cell to drill through to matching deals
            </p>
          </div>

          <div className="mt-3 overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-2">Segment</th>
                  {PRODUCT_LINES.map((line) => (
                    <th key={line} className="py-2 px-1.5 text-right">
                      {line.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {crossTab.map((row) => (
                  <tr key={row.segment}>
                    <td className="py-2.5 pr-2 font-medium text-slate-800 whitespace-nowrap">
                      {row.segment}
                    </td>
                    {row.cells.map((cell) => {
                      const bgClass =
                        cell.count === 0
                          ? 'bg-slate-50 text-slate-400'
                          : cell.attainment >= 102
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950'
                            : cell.attainment >= 95
                              ? 'bg-teal-50/70 hover:bg-teal-100/70 text-slate-900'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-950';

                      return (
                        <td key={cell.line} className="p-1">
                          <button
                            type="button"
                            disabled={cell.count === 0}
                            onClick={() =>
                              onDrillIntersection(cell.segment, cell.line)
                            }
                            title={`Drill through ${cell.segment} × ${cell.line}`}
                            className={`w-full rounded px-2 py-2 text-right font-mono-tabular transition-colors ${bgClass} disabled:cursor-not-allowed`}
                          >
                            <div className="text-xs font-semibold">
                              {cell.count > 0
                                ? formatCompactCurrency(cell.revenue)
                                : '—'}
                            </div>
                            <div className="text-[10px] opacity-80 flex items-center justify-end gap-0.5">
                              <span>
                                {cell.count > 0
                                  ? `${cell.attainment.toFixed(0)}%`
                                  : '0%'}
                              </span>
                              {cell.count > 0 && (
                                <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cell shows Revenue & Target Attainment %</span>
            <button
              type="button"
              onClick={() =>
                onQuickDrillThrough('productLine', 'Cloud Platform', 'Cloud Platform')
              }
              className="text-[#0D6E6E] font-medium hover:underline"
            >
              Inspect Top Line →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
