import React from 'react';

interface ValueRowProps {
  label: string;
  value: number;
  math: string;
  color?: string;
}

const ValueRow: React.FC<ValueRowProps> = (props) => {
  const { label, value, math, color = 'text-slate-900 dark:text-white' } = props;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[7px] font-extrabold uppercase leading-none text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 font-mono text-[6px] font-bold uppercase leading-none text-slate-400 dark:text-slate-500">
          {math}
        </p>
      </div>
      <p className={`text-[11px] font-black tabular-nums ${color}`}>
        <span className="mr-0.5 font-light opacity-50">₱</span>
        {value.toLocaleString()}
      </p>
    </div>
  );
};

export default ValueRow;
