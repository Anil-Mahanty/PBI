import {
  ArrowUpRight,
  Download,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CategoriesView } from './components/CategoriesView';
import { ChartsOverview } from './components/ChartsOverview';
import { ContextMenu } from './components/ContextMenu';
import { DrillThroughView } from './components/DrillThroughView';
import { KpiCardRow, TrendMetricKey } from './components/KpiCardRow';
import { RegionalView } from './components/RegionalView';
import { SlicerSidebar } from './components/SlicerSidebar';
import {
  ALL_KPI_RECORDS,
  computeKpiSummary,
  DEFAULT_SLICERS,
  exportRecordsToCsv,
  filterRecords,
  MONTHS,
} from './data/kpiData';
import {
  ContextMenuState,
  CrossFilter,
  DrillThroughContext,
  ExcludedItem,
  ProductLineName,
  ReportPage,
  SegmentName,
  SlicerState,
} from './types/kpi';

export default function App() {
  const [activePage, setActivePage] = useState<ReportPage>('overview');
  const [slicers, setSlicers] = useState<SlicerState>(DEFAULT_SLICERS);
  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);
  const [excludedItems, setExcludedItems] = useState<ExcludedItem[]>([]);
  const [drillThrough, setDrillThrough] = useState<DrillThroughContext | null>(
    null
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeTrendMetric, setActiveTrendMetric] =
    useState<TrendMetricKey>('revenue');
  const [mobileSlicersOpen, setMobileSlicersOpen] = useState(false);

  // Records filtered by Slicers + Exclusions only (used to keep source visual context visible)
  const baseRecords = useMemo(
    () =>
      filterRecords(
        ALL_KPI_RECORDS,
        slicers,
        null,
        excludedItems,
        activePage === 'drillthrough' ? drillThrough : null
      ),
    [slicers, excludedItems, activePage, drillThrough]
  );

  // Records filtered by Slicers + Exclusions + Cross-Filter + (if on drillthrough page) DrillThrough
  const filteredRecords = useMemo(
    () =>
      filterRecords(
        ALL_KPI_RECORDS,
        slicers,
        activePage === 'drillthrough' ? null : crossFilter,
        excludedItems,
        activePage === 'drillthrough' ? drillThrough : null
      ),
    [slicers, crossFilter, excludedItems, activePage, drillThrough]
  );

  const summary = useMemo(
    () => computeKpiSummary(filteredRecords, slicers.targetAdjustmentPct),
    [filteredRecords, slicers.targetAdjustmentPct]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (slicers.quarters.length > 0) count += slicers.quarters.length;
    if (slicers.monthRange[0] !== 0 || slicers.monthRange[1] !== 11) count += 1;
    if (slicers.regions.length > 0) count += slicers.regions.length;
    if (slicers.segments.length > 0) count += slicers.segments.length;
    if (slicers.productLines.length > 0) count += slicers.productLines.length;
    if (slicers.statusFilter !== 'All') count += 1;
    if (slicers.targetAdjustmentPct !== 0) count += 1;
    if (excludedItems.length > 0) count += excludedItems.length;
    if (crossFilter) count += 1;
    return count;
  }, [slicers, excludedItems, crossFilter]);

  const handleResetAll = () => {
    setSlicers(DEFAULT_SLICERS);
    setCrossFilter(null);
    setExcludedItems([]);
    setDrillThrough(null);
  };

  const handleToggleCrossFilter = (next: CrossFilter) => {
    setCrossFilter((prev) =>
      prev && prev.dimension === next.dimension && prev.value === next.value
        ? null
        : next
    );
  };

  const handleDrillThrough = (
    dimension:
      | 'region'
      | 'subRegion'
      | 'segment'
      | 'productLine'
      | 'productSku'
      | 'month',
    value: string,
    label: string
  ) => {
    setDrillThrough({
      sourcePage: activePage === 'drillthrough' ? 'overview' : activePage,
      filters: [{ dimension, value, label }],
      title: label,
    });
    setActivePage('drillthrough');
  };

  const handleDrillIntersection = (
    segment: SegmentName,
    productLine: ProductLineName
  ) => {
    setDrillThrough({
      sourcePage: activePage === 'drillthrough' ? 'categories' : activePage,
      filters: [
        { dimension: 'segment', value: segment, label: segment },
        { dimension: 'productLine', value: productLine, label: productLine },
      ],
      title: `${segment} · ${productLine}`,
    });
    setActivePage('drillthrough');
  };

  const handleContextDrillThrough = (menu: ContextMenuState) => {
    handleDrillThrough(menu.dimension, menu.value, menu.label);
  };

  const handleContextCrossFilter = (menu: ContextMenuState) => {
    setCrossFilter({
      dimension: menu.dimension,
      value: menu.value,
      label: menu.label,
    });
  };

  const handleContextExclude = (menu: ContextMenuState) => {
    if (
      menu.dimension === 'region' ||
      menu.dimension === 'segment' ||
      menu.dimension === 'productLine' ||
      menu.dimension === 'month'
    ) {
      const dim = menu.dimension;
      setExcludedItems((prev) => {
        if (prev.some((x) => x.dimension === dim && x.value === menu.value)) {
          return prev;
        }
        return [...prev, { dimension: dim, value: menu.value, label: menu.label }];
      });
      if (
        crossFilter?.dimension === menu.dimension &&
        crossFilter.value === menu.value
      ) {
        setCrossFilter(null);
      }
    }
  };

  const handleRemoveExclusion = (item: ExcludedItem) => {
    setExcludedItems((prev) =>
      prev.filter(
        (x) => !(x.dimension === item.dimension && x.value === item.value)
      )
    );
  };

  const handleRemoveDrillFilter = (dimension: string, value: string) => {
    if (!drillThrough) return;
    const nextFilters = drillThrough.filters.filter(
      (f) => !(f.dimension === dimension && f.value === value)
    );
    if (nextFilters.length === 0) {
      setDrillThrough(null);
    } else {
      setDrillThrough({
        ...drillThrough,
        filters: nextFilters,
        title: nextFilters.map((f) => f.label).join(' · '),
      });
    }
  };

  const navPages: Array<{ id: ReportPage; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'regional', label: 'Regional' },
    { id: 'categories', label: 'Categories' },
    { id: 'drillthrough', label: 'Drill-Through' },
  ];

  const periodSummary =
    slicers.monthRange[0] === 0 && slicers.monthRange[1] === 11
      ? slicers.quarters.length > 0
        ? slicers.quarters.join(', ')
        : 'Jan – Dec 2026'
      : `${MONTHS[slicers.monthRange[0]]} – ${MONTHS[slicers.monthRange[1]]} 2026`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F7] text-[#111827]">
      {/* Strict 3-Zone Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActivePage('overview');
            }}
            className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Northstar BI
          </a>

          {/* Zone 2: Concise Single-Line Report Page Links */}
          <nav
            aria-label="Report pages"
            className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
          >
            {navPages.map((page) => {
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePage(page.id)}
                  className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#0D6E6E]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{page.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0D6E6E]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() =>
                exportRecordsToCsv(filteredRecords, slicers.targetAdjustmentPct)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0D6E6E] hover:bg-[#095555] rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Report Canvas */}
      <main
        id="top"
        className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5"
      >
        {/* Report Title & Context Toolbar */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 mb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 text-balance">
              FY 2026 Commercial KPI Performance Report
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{periodSummary}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {filteredRecords.length} of {ALL_KPI_RECORDS.length} records
              </span>
              {slicers.targetAdjustmentPct !== 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#B45309] font-medium font-mono-tabular">
                    What-If Quota:{' '}
                    {slicers.targetAdjustmentPct > 0
                      ? `+${slicers.targetAdjustmentPct}%`
                      : `${slicers.targetAdjustmentPct}%`}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Active Cross-Filter Banner */}
            {crossFilter && activePage !== 'drillthrough' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#0D6E6E]" />
                <span className="text-slate-600">
                  Cross-filter:{' '}
                  <strong className="text-slate-900 font-medium">
                    {crossFilter.label}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleDrillThrough(
                      crossFilter.dimension,
                      crossFilter.value,
                      crossFilter.label
                    )
                  }
                  className="inline-flex items-center gap-0.5 text-[#0D6E6E] font-medium hover:underline ml-1"
                >
                  <span>Drill through</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setCrossFilter(null)}
                  aria-label="Clear cross-filter"
                  className="text-slate-400 hover:text-slate-800 ml-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mobile Slicer Toggle */}
            <button
              type="button"
              onClick={() => setMobileSlicersOpen((v) => !v)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0D6E6E]" />
              <span>
                Slicers{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Two-Column Power BI Layout: Left Slicers + Right Report Canvas */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Slicer Pane (Always visible on lg+, toggleable on mobile) */}
          <div
            className={`${
              mobileSlicersOpen ? 'block w-full' : 'hidden lg:block'
            } lg:sticky lg:top-[72px]`}
          >
            <SlicerSidebar
              slicers={slicers}
              allRecords={ALL_KPI_RECORDS}
              excludedItems={excludedItems}
              onChangeSlicers={setSlicers}
              onRemoveExclusion={handleRemoveExclusion}
              onResetAll={handleResetAll}
              activeFilterCount={activeFilterCount}
            />
          </div>

          {/* Right Report Page Viewport */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {filteredRecords.length === 0 ? (
              <section className="bg-white border border-slate-200 rounded-md p-10 text-center">
                <h2 className="text-sm font-semibold text-slate-900">
                  No KPI records match the current slicer selection
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your combination of Fiscal Period, Region, Segment, Product
                  Line, or Status filters returned zero matching transactions.
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D6E6E] hover:bg-[#095555] rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset all slicers</span>
                </button>
              </section>
            ) : (
              <>
                {activePage === 'overview' && (
                  <>
                    <KpiCardRow
                      records={filteredRecords}
                      summary={summary}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      activeTrendMetric={activeTrendMetric}
                      onSelectTrendMetric={setActiveTrendMetric}
                      onInspectRecords={() => {
                        setDrillThrough(null);
                        setActivePage('drillthrough');
                      }}
                    />
                    <ChartsOverview
                      baseRecords={baseRecords}
                      filteredRecords={filteredRecords}
                      crossFilter={crossFilter}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      activeTrendMetric={activeTrendMetric}
                      onChangeTrendMetric={setActiveTrendMetric}
                      onToggleCrossFilter={handleToggleCrossFilter}
                      onOpenContextMenu={setContextMenu}
                      onQuickDrillThrough={handleDrillThrough}
                    />
                  </>
                )}

                {activePage === 'regional' && (
                  <>
                    <KpiCardRow
                      records={filteredRecords}
                      summary={summary}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      activeTrendMetric={activeTrendMetric}
                      onSelectTrendMetric={setActiveTrendMetric}
                      onInspectRecords={() => {
                        setDrillThrough(null);
                        setActivePage('drillthrough');
                      }}
                    />
                    <RegionalView
                      baseRecords={baseRecords}
                      filteredRecords={filteredRecords}
                      crossFilter={crossFilter}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      onToggleCrossFilter={handleToggleCrossFilter}
                      onOpenContextMenu={setContextMenu}
                      onQuickDrillThrough={handleDrillThrough}
                    />
                  </>
                )}

                {activePage === 'categories' && (
                  <>
                    <KpiCardRow
                      records={filteredRecords}
                      summary={summary}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      activeTrendMetric={activeTrendMetric}
                      onSelectTrendMetric={setActiveTrendMetric}
                      onInspectRecords={() => {
                        setDrillThrough(null);
                        setActivePage('drillthrough');
                      }}
                    />
                    <CategoriesView
                      baseRecords={baseRecords}
                      filteredRecords={filteredRecords}
                      crossFilter={crossFilter}
                      targetAdjustmentPct={slicers.targetAdjustmentPct}
                      onToggleCrossFilter={handleToggleCrossFilter}
                      onOpenContextMenu={setContextMenu}
                      onDrillIntersection={handleDrillIntersection}
                      onQuickDrillThrough={handleDrillThrough}
                    />
                  </>
                )}

                {activePage === 'drillthrough' && (
                  <DrillThroughView
                    records={filteredRecords}
                    summary={summary}
                    targetAdjustmentPct={slicers.targetAdjustmentPct}
                    drillThrough={drillThrough}
                    onBack={(targetPage) => setActivePage(targetPage)}
                    onRemoveDrillFilter={handleRemoveDrillFilter}
                    onClearDrillThrough={() => setDrillThrough(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Power BI Right-Click Context Menu */}
      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onDrillThrough={handleContextDrillThrough}
        onCrossFilter={handleContextCrossFilter}
        onExclude={handleContextExclude}
        onClearAll={() => setCrossFilter(null)}
        hasActiveCrossFilter={crossFilter !== null}
      />
    </div>
  );
}
