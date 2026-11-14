import {
  CrossFilter,
  DrillThroughContext,
  ExcludedItem,
  KpiRecord,
  KpiStatus,
  KpiSummary,
  ProductLineName,
  QuarterName,
  RegionName,
  SegmentName,
  SlicerState,
} from '../types/kpi';

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const QUARTERS: QuarterName[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const REGIONS: RegionName[] = ['North America', 'EMEA', 'APAC', 'LATAM'];

export const SEGMENTS: SegmentName[] = [
  'Enterprise',
  'Mid-Market',
  'SMB',
  'Public Sector',
];

export const PRODUCT_LINES: ProductLineName[] = [
  'Cloud Platform',
  'Data Fabric',
  'Security Suite',
  'Managed Services',
];

export const SUB_REGIONS: Record<RegionName, string[]> = {
  'North America': ['US East', 'US West', 'Canada'],
  EMEA: ['UK & Ireland', 'DACH', 'Nordics & Benelux'],
  APAC: ['Japan', 'ANZ', 'Singapore & SEA'],
  LATAM: ['Brazil', 'Mexico', 'Andean South'],
};

export const PRODUCT_SKUS: Record<ProductLineName, string[]> = {
  'Cloud Platform': ['Core Compute Grid', 'AI Runtime Cluster', 'Edge Mesh Nodes'],
  'Data Fabric': ['Lakehouse Engine', 'Streaming Ingestion', 'Semantic Catalog'],
  'Security Suite': ['Zero-Trust IAM', 'Cloud Posture Guard', 'Threat Telemetry'],
  'Managed Services': ['24/7 SRE Operations', 'Migration Advisory', 'FinOps Optimization'],
};

const ACCOUNTS = [
  'Meridian Financial',
  'Helios Logistics',
  'Aether Biopharma',
  'Kestrel Aerospace',
  'Borealis Energy',
  'Vanguard Freight',
  'Caldera Retail Group',
  'Solstice Telecom',
  'Redwood Health Systems',
  'Pacific Rail Corp',
  'Nordic Grid Authority',
  'Silverline Insurance',
  'Halcyon Robotics',
  'Atlas Semiconductors',
  'Crestview Banking',
  'Ironbridge Manufacturing',
  'Veridian Utilities',
  'Stratos Maritime',
  'Canyon Cloud Media',
  'Keystone Municipal',
  'Horizon AgroTech',
  'Cobalt BioLabs',
  'Pinnacle Transit',
  'Summit Mining Co',
];

const OWNERS = [
  'Elena Rostova',
  'Marcus Vance',
  'Priya Nair',
  'Henrik Lindqvist',
  'Sofia Mendoza',
  'David Chen',
  'Claire Beaumont',
  'Kenji Takahashi',
];

// Deterministic PRNG so report figures are stable across renders
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const REGION_MULTIPLIER: Record<RegionName, number> = {
  'North America': 1.55,
  EMEA: 1.18,
  APAC: 0.92,
  LATAM: 0.56,
};

const REGION_ATTAINMENT_BIAS: Record<RegionName, number> = {
  'North America': 1.07,
  EMEA: 1.04,
  APAC: 0.985,
  LATAM: 0.915,
};

const SEGMENT_MULTIPLIER: Record<SegmentName, number> = {
  Enterprise: 1.48,
  'Mid-Market': 1.02,
  SMB: 0.64,
  'Public Sector': 0.85,
};

const SEGMENT_MARGIN: Record<SegmentName, number> = {
  Enterprise: 0.72,
  'Mid-Market': 0.675,
  SMB: 0.635,
  'Public Sector': 0.655,
};

const PRODUCT_MULTIPLIER: Record<ProductLineName, number> = {
  'Cloud Platform': 1.42,
  'Data Fabric': 1.08,
  'Security Suite': 0.96,
  'Managed Services': 0.74,
};

const PRODUCT_MARGIN_OFFSET: Record<ProductLineName, number> = {
  'Cloud Platform': 0.035,
  'Data Fabric': 0.045,
  'Security Suite': 0.055,
  'Managed Services': -0.145,
};

const PRODUCT_ATTAINMENT_BIAS: Record<ProductLineName, number> = {
  'Cloud Platform': 1.09,
  'Data Fabric': 1.03,
  'Security Suite': 1.01,
  'Managed Services': 0.91,
};

const MONTHLY_SEASONALITY = [
  0.78, 0.83, 1.05, 0.89, 0.94, 1.12, 0.91, 0.96, 1.16, 1.02, 1.09, 1.28,
];

function generateKpiRecords(): KpiRecord[] {
  const rand = createSeededRandom(20260419);
  const records: KpiRecord[] = [];
  let counter = 1;

  for (let m = 0; m < 12; m++) {
    const quarter: QuarterName =
      m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4';
    const monthLabel = MONTHS[m];
    const season = MONTHLY_SEASONALITY[m];

    for (const region of REGIONS) {
      const subRegions = SUB_REGIONS[region];
      for (const segment of SEGMENTS) {
        // Generate 2 product-line records per region-segment-month to get 384 rich records
        const productIndices = [
          (m + REGIONS.indexOf(region) + SEGMENTS.indexOf(segment)) % 4,
          (m + REGIONS.indexOf(region) + SEGMENTS.indexOf(segment) + 2) % 4,
        ];

        for (const pIdx of productIndices) {
          const productLine = PRODUCT_LINES[pIdx];
          const skus = PRODUCT_SKUS[productLine];
          const subRegion = subRegions[Math.floor(rand() * subRegions.length)];
          const productSku = skus[Math.floor(rand() * skus.length)];
          const accountName =
            ACCOUNTS[Math.floor(rand() * ACCOUNTS.length)] +
            (region === 'EMEA'
              ? ' Europe'
              : region === 'APAC'
                ? ' Asia'
                : region === 'LATAM'
                  ? ' Sul'
                  : '');
          const owner = OWNERS[(REGIONS.indexOf(region) * 2 + Math.floor(rand() * 2)) % OWNERS.length];

          const baseTarget =
            68000 *
            season *
            REGION_MULTIPLIER[region] *
            SEGMENT_MULTIPLIER[segment] *
            PRODUCT_MULTIPLIER[productLine] *
            (0.86 + rand() * 0.28);

          const attainmentNoise = 0.88 + rand() * 0.22;
          const quarterMomentum = m >= 8 ? 1.03 : m >= 5 ? 1.01 : 0.99;
          const actualFactor =
            REGION_ATTAINMENT_BIAS[region] *
            PRODUCT_ATTAINMENT_BIAS[productLine] *
            quarterMomentum *
            attainmentNoise;

          const targetRevenue = Math.round(baseTarget / 100) * 100;
          const revenue = Math.round((targetRevenue * actualFactor) / 100) * 100;
          const priorYearRevenue =
            Math.round((revenue / (1.08 + rand() * 0.14)) / 100) * 100;

          const marginPct = Math.min(
            0.84,
            Math.max(
              0.42,
              SEGMENT_MARGIN[segment] +
                PRODUCT_MARGIN_OFFSET[productLine] +
                (rand() - 0.5) * 0.06
            )
          );
          const grossProfit = Math.round(revenue * marginPct);

          const nrrDenominator = Math.round(revenue * (0.72 + rand() * 0.12));
          const nrrFactor =
            (segment === 'Enterprise'
              ? 1.18
              : segment === 'Mid-Market'
                ? 1.13
                : segment === 'Public Sector'
                  ? 1.11
                  : 1.05) +
            (rand() - 0.48) * 0.08;
          const nrrNumerator = Math.round(nrrDenominator * nrrFactor);

          const newArr = Math.round(revenue * (0.34 + rand() * 0.16));
          const paybackTargetFactor =
            segment === 'Enterprise' ? 12.6 : segment === 'SMB' ? 9.4 : 11.2;
          const cacSpend = Math.round(
            (newArr * (grossProfit / Math.max(revenue, 1)) * paybackTargetFactor) /
              12 *
              (0.88 + rand() * 0.24)
          );

          const pipelineCoverageMult =
            region === 'North America'
              ? 3.45
              : region === 'EMEA'
                ? 3.2
                : region === 'APAC'
                  ? 2.95
                  : 2.55;
          const pipelineValue = Math.round(
            targetRevenue * pipelineCoverageMult * (0.85 + rand() * 0.3)
          );

          const salesCycleDays = Math.round(
            (segment === 'Enterprise'
              ? 78
              : segment === 'Public Sector'
                ? 88
                : segment === 'Mid-Market'
                  ? 46
                  : 24) *
              (0.82 + rand() * 0.36)
          );

          const wonDeal = actualFactor >= 0.94 || rand() > 0.28;
          const day = String(Math.min(28, 3 + Math.floor(rand() * 25))).padStart(2, '0');
          const monthNum = String(m + 1).padStart(2, '0');

          records.push({
            id: `KPI-${String(counter++).padStart(4, '0')}`,
            accountName,
            owner,
            region,
            subRegion,
            segment,
            productLine,
            productSku,
            monthIndex: m,
            monthLabel,
            quarter,
            closeDate: `2026-${monthNum}-${day}`,
            revenue,
            targetRevenue,
            priorYearRevenue,
            grossProfit,
            nrrNumerator,
            nrrDenominator,
            cacSpend,
            newArr,
            pipelineValue,
            salesCycleDays,
            wonDeal,
            dealCount: Math.max(1, Math.round(revenue / 48000)),
          });
        }
      }
    }
  }

  return records;
}

export const ALL_KPI_RECORDS: KpiRecord[] = generateKpiRecords();

export const DEFAULT_SLICERS: SlicerState = {
  quarters: [],
  monthRange: [0, 11],
  regions: [],
  segments: [],
  productLines: [],
  statusFilter: 'All',
  targetAdjustmentPct: 0,
};

export function getRecordStatus(
  revenue: number,
  target: number
): KpiStatus {
  if (target <= 0) return 'On Target';
  const ratio = revenue / target;
  if (ratio >= 1.0) return 'On Target';
  if (ratio >= 0.93) return 'Watch';
  return 'Below Target';
}

export function getAdjustedTarget(
  targetRevenue: number,
  targetAdjustmentPct: number
): number {
  return targetRevenue * (1 + targetAdjustmentPct / 100);
}

export function filterRecords(
  records: KpiRecord[],
  slicers: SlicerState,
  crossFilter: CrossFilter | null = null,
  excludedItems: ExcludedItem[] = [],
  drillThrough: DrillThroughContext | null = null
): KpiRecord[] {
  return records.filter((rec) => {
    if (
      slicers.quarters.length > 0 &&
      !slicers.quarters.includes(rec.quarter)
    ) {
      return false;
    }
    if (
      rec.monthIndex < slicers.monthRange[0] ||
      rec.monthIndex > slicers.monthRange[1]
    ) {
      return false;
    }
    if (slicers.regions.length > 0 && !slicers.regions.includes(rec.region)) {
      return false;
    }
    if (
      slicers.segments.length > 0 &&
      !slicers.segments.includes(rec.segment)
    ) {
      return false;
    }
    if (
      slicers.productLines.length > 0 &&
      !slicers.productLines.includes(rec.productLine)
    ) {
      return false;
    }

    const adjTarget = getAdjustedTarget(
      rec.targetRevenue,
      slicers.targetAdjustmentPct
    );
    if (slicers.statusFilter !== 'All') {
      if (getRecordStatus(rec.revenue, adjTarget) !== slicers.statusFilter) {
        return false;
      }
    }

    for (const ex of excludedItems) {
      if (ex.dimension === 'region' && rec.region === ex.value) return false;
      if (ex.dimension === 'segment' && rec.segment === ex.value) return false;
      if (ex.dimension === 'productLine' && rec.productLine === ex.value)
        return false;
      if (ex.dimension === 'month' && rec.monthLabel === ex.value) return false;
    }

    if (crossFilter) {
      if (
        crossFilter.dimension === 'region' &&
        rec.region !== crossFilter.value
      )
        return false;
      if (
        crossFilter.dimension === 'subRegion' &&
        rec.subRegion !== crossFilter.value
      )
        return false;
      if (
        crossFilter.dimension === 'segment' &&
        rec.segment !== crossFilter.value
      )
        return false;
      if (
        crossFilter.dimension === 'productLine' &&
        rec.productLine !== crossFilter.value
      )
        return false;
      if (
        crossFilter.dimension === 'productSku' &&
        rec.productSku !== crossFilter.value
      )
        return false;
      if (
        crossFilter.dimension === 'month' &&
        rec.monthLabel !== crossFilter.value
      )
        return false;
    }

    if (drillThrough && drillThrough.filters.length > 0) {
      for (const df of drillThrough.filters) {
        if (df.dimension === 'region' && rec.region !== df.value) return false;
        if (df.dimension === 'subRegion' && rec.subRegion !== df.value)
          return false;
        if (df.dimension === 'segment' && rec.segment !== df.value)
          return false;
        if (df.dimension === 'productLine' && rec.productLine !== df.value)
          return false;
        if (df.dimension === 'productSku' && rec.productSku !== df.value)
          return false;
        if (df.dimension === 'month' && rec.monthLabel !== df.value)
          return false;
        if (df.dimension === 'quarter' && rec.quarter !== df.value)
          return false;
      }
    }

    return true;
  });
}

export function computeKpiSummary(
  records: KpiRecord[],
  targetAdjustmentPct: number
): KpiSummary {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      totalTarget: 0,
      totalPriorYear: 0,
      revenueAttainmentPct: 0,
      revenueVariance: 0,
      revenueVariancePct: 0,
      yoyGrowthPct: 0,
      grossMarginPct: 0,
      targetMarginPct: 66.0,
      nrrPct: 0,
      targetNrrPct: 112.0,
      cacPaybackMonths: 0,
      targetCacPaybackMonths: 12.0,
      pipelineCoverage: 0,
      targetPipelineCoverage: 3.3,
      winRatePct: 0,
      avgCycleDays: 0,
      recordCount: 0,
    };
  }

  let totalRevenue = 0;
  let totalTarget = 0;
  let totalPriorYear = 0;
  let totalGrossProfit = 0;
  let totalNrrNum = 0;
  let totalNrrDen = 0;
  let totalCac = 0;
  let totalNewArr = 0;
  let totalPipeline = 0;
  let totalCycleDays = 0;
  let wonCount = 0;

  for (const r of records) {
    totalRevenue += r.revenue;
    totalTarget += getAdjustedTarget(r.targetRevenue, targetAdjustmentPct);
    totalPriorYear += r.priorYearRevenue;
    totalGrossProfit += r.grossProfit;
    totalNrrNum += r.nrrNumerator;
    totalNrrDen += r.nrrDenominator;
    totalCac += r.cacSpend;
    totalNewArr += r.newArr;
    totalPipeline += r.pipelineValue;
    totalCycleDays += r.salesCycleDays;
    if (r.wonDeal) wonCount += 1;
  }

  const revenueAttainmentPct =
    totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
  const revenueVariance = totalRevenue - totalTarget;
  const revenueVariancePct =
    totalTarget > 0 ? ((totalRevenue - totalTarget) / totalTarget) * 100 : 0;
  const yoyGrowthPct =
    totalPriorYear > 0
      ? ((totalRevenue - totalPriorYear) / totalPriorYear) * 100
      : 0;
  const grossMarginPct =
    totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const nrrPct = totalNrrDen > 0 ? (totalNrrNum / totalNrrDen) * 100 : 0;

  const avgMarginRatio = totalRevenue > 0 ? totalGrossProfit / totalRevenue : 0.66;
  const monthlyGrossNewArr = (totalNewArr * avgMarginRatio) / 12;
  const cacPaybackMonths =
    monthlyGrossNewArr > 0 ? totalCac / monthlyGrossNewArr : 0;

  const pipelineCoverage = totalTarget > 0 ? totalPipeline / totalTarget : 0;
  const winRatePct = (wonCount / records.length) * 100;
  const avgCycleDays = totalCycleDays / records.length;

  return {
    totalRevenue,
    totalTarget,
    totalPriorYear,
    revenueAttainmentPct,
    revenueVariance,
    revenueVariancePct,
    yoyGrowthPct,
    grossMarginPct,
    targetMarginPct: 66.0,
    nrrPct,
    targetNrrPct: 112.0,
    cacPaybackMonths,
    targetCacPaybackMonths: 12.0,
    pipelineCoverage,
    targetPipelineCoverage: 3.3,
    winRatePct,
    avgCycleDays,
    recordCount: records.length,
  };
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

export function formatCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

export function formatSignedPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function exportRecordsToCsv(
  records: KpiRecord[],
  targetAdjustmentPct: number
) {
  const headers = [
    'ID',
    'Close Date',
    'Quarter',
    'Month',
    'Account',
    'Owner',
    'Region',
    'Sub-Region',
    'Segment',
    'Product Line',
    'Product SKU',
    'Revenue ($)',
    'Target ($)',
    'Prior Year ($)',
    'Attainment (%)',
    'Gross Margin (%)',
    'Pipeline ($)',
    'Cycle Days',
    'Status',
  ];

  const rows = records.map((r) => {
    const adjTarget = Math.round(
      getAdjustedTarget(r.targetRevenue, targetAdjustmentPct)
    );
    const attainment = adjTarget > 0 ? (r.revenue / adjTarget) * 100 : 0;
    const margin = r.revenue > 0 ? (r.grossProfit / r.revenue) * 100 : 0;
    const status = getRecordStatus(r.revenue, adjTarget);

    return [
      r.id,
      r.closeDate,
      r.quarter,
      r.monthLabel,
      `"${r.accountName.replace(/"/g, '""')}"`,
      `"${r.owner.replace(/"/g, '""')}"`,
      r.region,
      `"${r.subRegion}"`,
      r.segment,
      r.productLine,
      `"${r.productSku}"`,
      r.revenue,
      adjTarget,
      r.priorYearRevenue,
      attainment.toFixed(1),
      margin.toFixed(1),
      r.pipelineValue,
      r.salesCycleDays,
      status,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `northstar-kpi-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
