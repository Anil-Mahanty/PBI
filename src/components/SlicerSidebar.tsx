import { ChevronDown, ChevronRight, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import {
  MONTHS,
  PRODUCT_LINES,
  QUARTERS,
  REGIONS,
  SEGMENTS,
} from '../data/kpiData';
import {
  ExcludedItem,
  KpiRecord,
  KpiStatus,
  ProductLineName,
  QuarterName,
  RegionName,
  SegmentName,
  SlicerState,
} from '../types/kpi';

interface SlicerSidebarProps {
  slicers: SlicerState;
  allRecords: KpiRecord[];
  excludedItems: ExcludedItem[];
  onChangeSlicers: (next: SlicerState) => void;
  onRemoveExclusion: (item: ExcludedItem) => void;
  onResetAll: () => void;
  activeFilterCount: number;
}

export function SlicerSidebar({
  slicers,
  allRecords,
  excludedItems,
  onChangeSlicers,
  onRemoveExclusion,
  onResetAll,
  activeFilterCount,
}: SlicerSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    period: true,
    region: true,
    segment: true,
    product: true,
    status: true,
    whatif: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleQuarter = (q: QuarterName) => {
    const exists = slicers.quarters.includes(q);
    const quarters = exists
      ? slicers.quarters.filter((item) => item !== q)
      : [...slicers.quarters, q];
    onChangeSlicers({ ...slicers, quarters });
  };

  const toggleRegion = (r: RegionName) => {
    const exists = slicers.regions.includes(r);
    const regions = exists
      ? slicers.regions.filter((item) => item !== r)
      : [...slicers.regions, r];
    onChangeSlicers({ ...slicers, regions });
  };

  const toggleSegment = (s: SegmentName) => {
    const exists = slicers.segments.includes(s);
    const segments = exists
      ? slicers.segments.filter((item) => item !== s)
      : [...slicers.segments, s];
    onChangeSlicers({ ...slicers, segments });
  };

  const toggleProductLine = (p: ProductLineName) => {
    const exists = slicers.productLines.includes(p);
    const productLines = exists
      ? slicers.productLines.filter((item) => item !== p)
      : [...slicers.productLines, p];
    onChangeSlicers({ ...slicers, productLines });
  };

  // Count records per dimension item for helpful Power BI slicer counts
  const regionCounts = REGIONS.reduce(
    (acc, r) => {
      acc[r] = allRecords.filter((rec) => rec.region === r).length;
      return acc;
    },
    {} as Record<RegionName, number>
  );

  const segmentCounts = SEGMENTS.reduce(
    (acc, s) => {
      acc[s] = allRecords.filter((rec) => rec.segment === s).length;
      return acc;
    },
    {} as Record<SegmentName, number>
  );

  const productCounts = PRODUCT_LINES.reduce(
    (acc, p) => {
      acc[p] = allRecords.filter((rec) => rec.productLine === p).length;
      return acc;
    },
    {} as Record<ProductLineName, number>
  );

  const statuses: Array<'All' | KpiStatus> = [
    'All',
    'On Target',
    'Watch',
    'Below Target',
  ];

  return (
    <aside
      aria-label="Report slicers"
      className="w-full lg:w-[264px] shrink-0 bg-white border border-slate-200 rounded-md flex flex-col divide-y divide-slate-200 self-start"
    >
      {/* Slicer Pane Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-[#0D6E6E] shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 truncate">
            Report Slicers
          </h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E6E] hover:text-[#094F4F] whitespace-nowrap shrink-0 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* Excluded Items (if any via right-click Exclude) */}
      {excludedItems.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50/60">
          <div className="text-xs font-medium text-slate-700 mb-1.5">
            Excluded from Visuals
          </div>
          <div className="flex flex-col gap-1">
            {excludedItems.map((ex) => (
              <button
                key={`${ex.dimension}-${ex.value}`}
                type="button"
                onClick={() => onRemoveExclusion(ex)}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 py-0.5 text-left"
              >
                <span className="truncate">
                  {ex.dimension}: {ex.label}
                </span>
                <X className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slicer 1: Fiscal Period (Quarter + Month Range) */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSection('period')}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
        >
          <span>Fiscal Period (FY 2026)</span>
          {openSections.period ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {openSections.period && (
          <div className="mt-2.5 space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                <span>Quarter</span>
                {slicers.quarters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChangeSlicers({ ...slicers, quarters: [] })}
                    className="text-[#0D6E6E] hover:underline"
                  >
                    All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded">
                {QUARTERS.map((q) => {
                  const active = slicers.quarters.includes(q);
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => toggleQuarter(q)}
                      aria-pressed={active}
                      className={`py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#0D6E6E] text-white'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                <span>Month Range</span>
                {(slicers.monthRange[0] !== 0 ||
                  slicers.monthRange[1] !== 11) && (
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSlicers({ ...slicers, monthRange: [0, 11] })
                    }
                    className="text-[#0D6E6E] hover:underline"
                  >
                    Full Year
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="sr-only">Start month</span>
                  <select
                    value={slicers.monthRange[0]}
                    onChange={(e) => {
                      const start = Number(e.target.value);
                      const end = Math.max(start, slicers.monthRange[1]);
                      onChangeSlicers({ ...slicers, monthRange: [start, end] });
                    }}
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-[#0D6E6E]"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        From {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">End month</span>
                  <select
                    value={slicers.monthRange[1]}
                    onChange={(e) => {
                      const end = Number(e.target.value);
                      const start = Math.min(slicers.monthRange[0], end);
                      onChangeSlicers({ ...slicers, monthRange: [start, end] });
                    }}
                    className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-[#0D6E6E]"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        To {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slicer 2: Region */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => toggleSection('region')}
            className="flex-1 flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
          >
            <span>Region</span>
            {openSections.region ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>

        {openSections.region && (
          <div className="mt-2 space-y-1">
            {slicers.regions.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSlicers({ ...slicers, regions: [] })}
                className="text-[11px] text-[#0D6E6E] hover:underline mb-1"
              >
                Select all regions
              </button>
            )}
            {REGIONS.map((region) => {
              const checked =
                slicers.regions.length === 0 ||
                slicers.regions.includes(region);
              const explicit = slicers.regions.includes(region);
              return (
                <label
                  key={region}
                  className="flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={explicit}
                      onChange={() => toggleRegion(region)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0D6E6E]"
                    />
                    <span
                      className={`truncate ${
                        checked ? 'text-slate-800 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {region}
                    </span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {regionCounts[region]}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Slicer 3: Business Segment */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSection('segment')}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
        >
          <span>Business Segment</span>
          {openSections.segment ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {openSections.segment && (
          <div className="mt-2 space-y-1">
            {slicers.segments.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSlicers({ ...slicers, segments: [] })}
                className="text-[11px] text-[#0D6E6E] hover:underline mb-1"
              >
                Select all segments
              </button>
            )}
            {SEGMENTS.map((segment) => {
              const checked =
                slicers.segments.length === 0 ||
                slicers.segments.includes(segment);
              const explicit = slicers.segments.includes(segment);
              return (
                <label
                  key={segment}
                  className="flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={explicit}
                      onChange={() => toggleSegment(segment)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0D6E6E]"
                    />
                    <span
                      className={`truncate ${
                        checked ? 'text-slate-800 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {segment}
                    </span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {segmentCounts[segment]}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Slicer 4: Product Line */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSection('product')}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
        >
          <span>Product Line</span>
          {openSections.product ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {openSections.product && (
          <div className="mt-2 space-y-1">
            {slicers.productLines.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSlicers({ ...slicers, productLines: [] })}
                className="text-[11px] text-[#0D6E6E] hover:underline mb-1"
              >
                Select all lines
              </button>
            )}
            {PRODUCT_LINES.map((line) => {
              const checked =
                slicers.productLines.length === 0 ||
                slicers.productLines.includes(line);
              const explicit = slicers.productLines.includes(line);
              return (
                <label
                  key={line}
                  className="flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={explicit}
                      onChange={() => toggleProductLine(line)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-[#0D6E6E]"
                    />
                    <span
                      className={`truncate ${
                        checked ? 'text-slate-800 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {line}
                    </span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {productCounts[line]}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Slicer 5: Attainment Status */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
        >
          <span>Deal Attainment Status</span>
          {openSections.status ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {openSections.status && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {statuses.map((st) => {
              const active = slicers.statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() =>
                    onChangeSlicers({ ...slicers, statusFilter: st })
                  }
                  className={`px-2 py-1.5 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                    active
                      ? 'bg-[#0D6E6E] text-white border-[#0D6E6E]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Slicer 6: What-If Parameter (Target Sensitivity) */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleSection('whatif')}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5"
        >
          <span>Quota Target Sensitivity</span>
          {openSections.whatif ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {openSections.whatif && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600">Target adjustment</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {slicers.targetAdjustmentPct > 0
                  ? `+${slicers.targetAdjustmentPct}%`
                  : `${slicers.targetAdjustmentPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={15}
              step={1}
              value={slicers.targetAdjustmentPct}
              aria-label="Quota target sensitivity percentage"
              onChange={(e) =>
                onChangeSlicers({
                  ...slicers,
                  targetAdjustmentPct: Number(e.target.value),
                })
              }
              className="w-full accent-[#0D6E6E] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-tabular mt-0.5">
              <span>-10%</span>
              <button
                type="button"
                onClick={() =>
                  onChangeSlicers({ ...slicers, targetAdjustmentPct: 0 })
                }
                className="hover:text-[#0D6E6E]"
              >
                0% Base
              </button>
              <span>+15%</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
