'use client';

import shared from '@/styles/shared.module.css';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  options: FilterOption[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export default function FilterButtonGroup({ options, active, onChange, className, id }: Props) {
  return (
    <div className={className} id={id}>
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`${shared.filterBtn}${active === value ? ' ' + shared.filterBtnActive : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
