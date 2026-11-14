import { KpiStatus } from '../types/kpi';

interface StatusLabelProps {
  status: KpiStatus;
  compact?: boolean;
}

export function StatusLabel({ status, compact = false }: StatusLabelProps) {
  if (status === 'On Target') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#15803D] whitespace-nowrap">
        <span aria-hidden="true" className="text-[10px] leading-none">
          ▲
        </span>
        <span>{compact ? 'Target' : 'On Target'}</span>
      </span>
    );
  }
  if (status === 'Watch') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B45309] whitespace-nowrap">
        <span aria-hidden="true" className="text-[10px] leading-none">
          ◆
        </span>
        <span>Watch</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B91C1C] whitespace-nowrap">
      <span aria-hidden="true" className="text-[10px] leading-none">
        ▼
      </span>
      <span>{compact ? 'Below' : 'Below Target'}</span>
    </span>
  );
}
