'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type Brand = 'mattys_place' | 'ash_shahada' | 'reliance';

interface BrandConfig {
  id: Brand;
  label: string;
  subtitle: string;
  accentColor: string;
  textColor: string;
}

const BRANDS: BrandConfig[] = [
  {
    id: 'mattys_place',
    label: "Matty's Place",
    subtitle: 'Supported Housing & Community Services',
    accentColor: '#E8A84C',
    textColor: '#0F1C2E',
  },
  {
    id: 'ash_shahada',
    label: 'Ash Shahada Housing Association Ltd',
    subtitle: 'Birmingham HMO & Social Housing',
    accentColor: '#2A6496',
    textColor: '#FFFFFF',
  },
  {
    id: 'reliance',
    label: 'Reliance Housing',
    subtitle: 'Community Support Services, Birmingham',
    accentColor: '#1A7A4A',
    textColor: '#FFFFFF',
  },
];

interface Props {
  value: Brand;
  onChange: (brand: Brand) => void;
}

export default function LetterheadSwitcher({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const active = BRANDS.find((b) => b.id === value) ?? BRANDS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-navy-light hover:bg-navy-muted border border-navy-border
                   text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors
                   focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-navy"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Brand colour dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: active.accentColor }}
        />
        <span className="truncate max-w-[140px]">{active.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-amber flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* Click-away overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <ul
            role="listbox"
            className="absolute top-full left-0 mt-1 w-72 bg-navy-light border border-navy-border
                       rounded-xl shadow-2xl z-20 overflow-hidden"
          >
            {BRANDS.map((brand) => (
              <li
                key={brand.id}
                role="option"
                aria-selected={brand.id === value}
                onClick={() => {
                  onChange(brand.id);
                  setOpen(false);
                }}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-navy-muted
                           transition-colors group"
              >
                {/* Accent swatch */}
                <span
                  className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: brand.accentColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{brand.label}</p>
                  <p className="text-slate-400 text-xxs mt-0.5 truncate">{brand.subtitle}</p>
                </div>
                {brand.id === value && (
                  <Check className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
