import { ArrowRight, EyeOff, Filter, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ContextMenuState } from '../types/kpi';

interface ContextMenuProps {
  menu: ContextMenuState | null;
  onClose: () => void;
  onDrillThrough: (menu: ContextMenuState) => void;
  onCrossFilter: (menu: ContextMenuState) => void;
  onExclude: (menu: ContextMenuState) => void;
  onClearAll: () => void;
  hasActiveCrossFilter: boolean;
}

export function ContextMenu({
  menu,
  onClose,
  onDrillThrough,
  onCrossFilter,
  onExclude,
  onClearAll,
  hasActiveCrossFilter,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  // Keep menu inside viewport
  const left = Math.min(menu.x, window.innerWidth - 260);
  const top = Math.min(menu.y, window.innerHeight - 210);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Data point actions"
      style={{ left, top }}
      className="fixed z-50 w-60 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 text-sm text-slate-800"
    >
      <div className="px-3 py-1.5 border-b border-slate-100">
        <div className="text-[11px] font-medium text-slate-500">
          Selected Data Point
        </div>
        <div className="text-xs font-semibold text-slate-900 truncate">
          {menu.label}
          {menu.extraFilter ? ` · ${menu.extraFilter.label}` : ''}
        </div>
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDrillThrough(menu);
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#0D6E6E] hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Drill through to Detail</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onCrossFilter(menu);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span>Cross-filter report</span>
      </button>

      {menu.dimension !== 'subRegion' && menu.dimension !== 'productSku' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onExclude(menu);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
          <span>Exclude {menu.label}</span>
        </button>
      )}

      {hasActiveCrossFilter && (
        <div className="mt-1 pt-1 border-t border-slate-100">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClearAll();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear cross-filter</span>
          </button>
        </div>
      )}
    </div>
  );
}
