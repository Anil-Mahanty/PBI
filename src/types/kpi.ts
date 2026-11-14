export type RegionName = 'North America' | 'EMEA' | 'APAC' | 'LATAM';
export type SegmentName = 'Enterprise' | 'Mid-Market' | 'SMB' | 'Public Sector';
export type ProductLineName =
  | 'Cloud Platform'
  | 'Data Fabric'
  | 'Security Suite'
  | 'Managed Services';
export type QuarterName = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type KpiStatus = 'On Target' | 'Watch' | 'Below Target';
export type ReportPage = 'overview' | 'regional' | 'categories' | 'drillthrough';

export interface KpiRecord {
  id: string;
  accountName: string;
  owner: string;
  region: RegionName;
  subRegion: string;
  segment: SegmentName;
  productLine: ProductLineName;
  productSku: string;
  monthIndex: number; // 0 = Jan .. 11 = Dec
  monthLabel: string;
  quarter: QuarterName;
  closeDate: string;
  revenue: number;
  targetRevenue: number;
  priorYearRevenue: number;
  grossProfit: number;
  nrrNumerator: number;
  nrrDenominator: number;
  cacSpend: number;
  newArr: number;
  pipelineValue: number;
  salesCycleDays: number;
  wonDeal: boolean;
  dealCount: number;
}

export interface SlicerState {
  quarters: QuarterName[];
  monthRange: [number, number];
  regions: RegionName[];
  segments: SegmentName[];
  productLines: ProductLineName[];
  statusFilter: 'All' | KpiStatus;
  targetAdjustmentPct: number; // What-if parameter (-10 to +15)
}

export interface CrossFilter {
  dimension: 'region' | 'subRegion' | 'segment' | 'productLine' | 'productSku' | 'month';
  value: string;
  label: string;
}

export interface ExcludedItem {
  dimension: 'region' | 'segment' | 'productLine' | 'month';
  value: string;
  label: string;
}

export interface DrillThroughContext {
  sourcePage: ReportPage;
  filters: Array<{
    dimension: 'region' | 'subRegion' | 'segment' | 'productLine' | 'productSku' | 'month' | 'quarter';
    value: string;
    label: string;
  }>;
  title: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  dimension: 'region' | 'subRegion' | 'segment' | 'productLine' | 'productSku' | 'month';
  value: string;
  label: string;
  extraFilter?: {
    dimension: 'region' | 'segment' | 'productLine';
    value: string;
    label: string;
  };
}

export interface KpiSummary {
  totalRevenue: number;
  totalTarget: number;
  totalPriorYear: number;
  revenueAttainmentPct: number;
  revenueVariance: number;
  revenueVariancePct: number;
  yoyGrowthPct: number;
  grossMarginPct: number;
  targetMarginPct: number;
  nrrPct: number;
  targetNrrPct: number;
  cacPaybackMonths: number;
  targetCacPaybackMonths: number;
  pipelineCoverage: number;
  targetPipelineCoverage: number;
  winRatePct: number;
  avgCycleDays: number;
  recordCount: number;
}
