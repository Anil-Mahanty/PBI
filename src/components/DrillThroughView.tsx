import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatCompactCurrency,
  formatCurrency,
  formatSignedPercent,
  getAdjustedTarget,
  getRecordStatus,
} from '../data/kpiData';
import {
  DrillThroughContext,
  KpiRecord,
  KpiSummary,
  ReportPage,
} from '../types/kpi';
import { StatusLabel } from './StatusLabel';

interface DrillThroughViewProps {
  records: KpiRecord[];
  summary: KpiSummary;
  targetAdjustmentPct: number;
  drillThrough: DrillThroughContext | null;
  onBack: (targetPage: ReportPage) => void;
  onRemoveDrillFilter: (dimension: string, value: string) => void;
  onClearDrillThrough: () => void;
}

type SortKey =
  | 'closeDate'
  | 'accountName'
  | 'revenue'
  | 'target'
  | 'variance'
  | 'margin'
  | 'cycle';

const PAGE_LABELS: Record<ReportPage, string> = {
  overview: 'Overview',
  regional: 'Regional',
  categories: 'Categories',
  drillthrough: 'Drill-Through',
};

export function DrillThroughView({
  records,
  summary,
  targetAdjustmentPct,
  drillThrough,
  onBack,
  onRemoveDrillFilter,
  onClearDrillThrough,
}: DrillThroughViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<KpiRecord | null>(null);

  const pageSize = 14;

  const searchedRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? records.filter(
          (r) =>
            r.accountName.toLowerCase().includes(q) ||
            r.owner.toLowerCase().includes(q) ||
            r.productSku.toLowerCase().includes(q) ||
            r.subRegion.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
        )
      : records;

    const sorted = [...list].sort((a, b) => {
      const aTgt = getAdjustedTarget(a.targetRevenue, targetAdjustmentPct);
      const bTgt = getAdjustedTarget(b.targetRevenue, targetAdjustmentPct);
      let diff = 0;
      switch (sortKey) {
        case 'closeDate':
          diff = a.closeDate.localeCompare(b.closeDate);
          break;
        case 'accountName':
          diff = a.accountName.localeCompare(b.accountName);
          break;
        case 'revenue':
          diff = a.revenue - b.revenue;
          break;
        case 'target':
          diff = aTgt - bTgt;
          break;
        case 'variance':
          diff = a.revenue - aTgt - (b.revenue - bTgt);
          break;
        case 'margin':
          diff =
            a.grossProfit / Math.max(a.revenue, 1) -
            b.grossProfit / Math.max(b.revenue, 1);
          break;
        case 'cycle':
          diff = a.salesCycleDays - b.salesCycleDays;
          break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });

    return sorted;
  }, [records, searchQuery, sortKey, sortDir, targetAdjustmentPct]);

  const totalPages = Math.max(1, Math.ceil(searchedRecords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = searchedRecords.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Power BI Drill-Through Header Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {drillThrough && (
            <button
              type="button"
              onClick={() => onBack(drillThrough.sourcePage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {PAGE_LABELS[drillThrough.sourcePage]}</span>
            </button>
          )}

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {drillThrough
                ? `Drill-Through Detail: ${drillThrough.title}`
                : 'Granular Account & Deal Ledger'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {searchedRecords.length.toLocaleString()} underlying deal
              records matching active slicers
              {drillThrough ? ' and drill-through context' : ''}
            </p>
          </div>
        </div>

        {/* Removable Drill-Through Filter Buttons */}
        {drillThrough && drillThrough.filters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {drillThrough.filters.map((df) => (
              <button
                key={`${df.dimension}-${df.value}`}
                type="button"
                onClick={() => onRemoveDrillFilter(df.dimension, df.value)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#0D6E6E]/10 text-[#0D6E6E] hover:bg-[#0D6E6E]/20 rounded transition-colors"
              >
                <span>
                  {df.dimension}: {df.label}
                </span>
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onClearDrillThrough}
              className="text-xs text-slate-500 hover:text-slate-900 underline ml-1"
            >
              Clear drill-through
            </button>
          </div>
        )}
      </div>

      {/* Scoped Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5">
          <div className="text-xs text-slate-500">Scoped Revenue</div>
          <div className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900">
            {formatCompactCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-500">
            Target {formatCompactCurrency(summary.totalTarget)} ·{' '}
            <span
              className={
                summary.revenueVariancePct >= 0
                  ? 'text-[#15803D]'
                  : 'text-[#B91C1C]'
              }
            >
              {formatSignedPercent(summary.revenueVariancePct)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5">
          <div className="text-xs text-slate-500">Gross Margin</div>
          <div className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900">
            {summary.grossMarginPct.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-500">
            Target {summary.targetMarginPct.toFixed(1)}% · YoY{' '}
            {formatSignedPercent(summary.yoyGrowthPct)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5">
          <div className="text-xs text-slate-500">Net Revenue Retention</div>
          <div className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900">
            {summary.nrrPct.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-500">
            Pipeline Coverage {summary.pipelineCoverage.toFixed(2)}x
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5">
          <div className="text-xs text-slate-500">Win Rate & Cycle</div>
          <div className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900">
            {summary.winRatePct.toFixed(1)}%
          </div>
          <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-500">
            Avg {Math.round(summary.avgCycleDays)} days · {summary.recordCount}{' '}
            deals
          </div>
        </div>
      </div>

      {/* Main Ledger + Optional Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <section
          className={`${
            selectedRecord ? 'xl:col-span-8' : 'xl:col-span-12'
          } bg-white border border-slate-200 rounded-md p-4`}
        >
          {/* Search & Pagination Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search account, owner, SKU, territory..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0D6E6E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono-tabular">
              <span>
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('closeDate')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('accountName')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Account & Owner</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2 px-2">Territory / Segment</th>
                  <th className="py-2 px-2">Product SKU</th>
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
                      onClick={() => toggleSort('variance')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Variance</span>
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
                  <th className="py-2 pl-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pagedRecords.map((rec) => {
                  const adjTarget = getAdjustedTarget(
                    rec.targetRevenue,
                    targetAdjustmentPct
                  );
                  const variance = rec.revenue - adjTarget;
                  const marginPct =
                    rec.revenue > 0 ? (rec.grossProfit / rec.revenue) * 100 : 0;
                  const status = getRecordStatus(rec.revenue, adjTarget);
                  const isSelected = selectedRecord?.id === rec.id;

                  return (
                    <tr
                      key={rec.id}
                      onClick={() =>
                        setSelectedRecord(isSelected ? null : rec)
                      }
                      className={`h-10 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-teal-50/70'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-2 pr-2 font-mono-tabular text-slate-600 whitespace-nowrap">
                        {rec.closeDate}
                      </td>
                      <td className="py-2 px-2">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {rec.accountName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {rec.owner}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-slate-800 whitespace-nowrap">
                          {rec.subRegion}
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">
                          {rec.region} · {rec.segment}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-slate-800 whitespace-nowrap">
                          {rec.productSku}
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">
                          {rec.productLine}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(rec.revenue)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-600 whitespace-nowrap">
                        {formatCurrency(adjTarget)}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono-tabular whitespace-nowrap ${
                          variance >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {variance >= 0 ? '+' : ''}
                        {formatCurrency(variance)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                        {marginPct.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <StatusLabel status={status} compact />
                      </td>
                    </tr>
                  );
                })}
                {pagedRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-xs text-slate-500"
                    >
                      No records match "{searchQuery}". Clear your search query
                      to see all {records.length} scoped records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Row Inspection Drawer (appears when a row is clicked) */}
        {selectedRecord && (
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-md p-4 space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="text-[11px] font-mono-tabular text-slate-500">
                  {selectedRecord.id} · {selectedRecord.closeDate}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                  {selectedRecord.accountName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedRecord.owner} · {selectedRecord.subRegion} (
                  {selectedRecord.region})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close record inspector"
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const tgt = getAdjustedTarget(
                selectedRecord.targetRevenue,
                targetAdjustmentPct
              );
              const attainment =
                tgt > 0 ? (selectedRecord.revenue / tgt) * 100 : 0;
              const margin =
                selectedRecord.revenue > 0
                  ? (selectedRecord.grossProfit / selectedRecord.revenue) * 100
                  : 0;
              const nrr =
                selectedRecord.nrrDenominator > 0
                  ? (selectedRecord.nrrNumerator /
                      selectedRecord.nrrDenominator) *
                    100
                  : 0;
              const yoy =
                selectedRecord.priorYearRevenue > 0
                  ? ((selectedRecord.revenue - selectedRecord.priorYearRevenue) /
                      selectedRecord.priorYearRevenue) *
                    100
                  : 0;
              const status = getRecordStatus(selectedRecord.revenue, tgt);

              return (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Attainment Status</span>
                    <StatusLabel status={status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-1">
                    <div>
                      <div className="text-slate-500">Actual Revenue</div>
                      <div className="font-mono-tabular text-base font-semibold text-slate-900 mt-0.5">
                        {formatCurrency(selectedRecord.revenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Adjusted Target</div>
                      <div className="font-mono-tabular text-base font-semibold text-slate-700 mt-0.5">
                        {formatCurrency(tgt)}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Target Attainment</span>
                      <span className="font-mono-tabular font-semibold text-slate-900">
                        {attainment.toFixed(1)}%
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">YoY Growth</span>
                      <span
                        className={`font-mono-tabular font-medium ${
                          yoy >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {formatSignedPercent(yoy)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Gross Profit & Margin</span>
                      <span className="font-mono-tabular text-slate-900">
                        {formatCurrency(selectedRecord.grossProfit)} (
                        {margin.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Account NRR</span>
                      <span className="font-mono-tabular text-slate-900">
                        {nrr.toFixed(1)}%
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Pipeline Assigned</span>
                      <span className="font-mono-tabular text-slate-900">
                        {formatCurrency(selectedRecord.pipelineValue)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Sales Cycle</span>
                      <span className="font-mono-tabular text-slate-900">
                        {selectedRecord.salesCycleDays} days
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Product Line / SKU</span>
                      <span className="text-slate-900 text-right">
                        {selectedRecord.productLine} · {selectedRecord.productSku}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-500">Segment</span>
                      <span className="text-slate-900">
                        {selectedRecord.segment}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </aside>
        )}
      </div>
    </div>
  );
}
