import React from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';

interface CycleMathProps {
  label: string;
  val1: number;
  val2: number;
  result: number;
  sign: string;
  color: string;
}

const CycleMath: React.FC<CycleMathProps> = (props) => {
  const { label, val1, val2, result, sign, color } = props;
  const { currencySymbol } = useTreasury();

  return (
    <div>
      <p className="mb-1.5 text-[7px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="flex items-center gap-1 font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400">
        <span>
          {currencySymbol}
          {(val1 / 1000).toFixed(1)}k
        </span>
        <span className="font-black text-slate-400 dark:text-slate-500">{sign}</span>
        <span>{(val2 / 1000).toFixed(1)}k</span>
      </div>
      <p
        className={`mt-0.5 text-[11px] font-black tabular-nums text-${color}-600 dark:text-${color}-500`}
      >
        <span className="mr-0.5 text-[9px] font-bold opacity-70">=</span>
        <span className="mr-0.5 text-[9px] font-light opacity-50">{currencySymbol}</span>
        {result.toLocaleString()}
      </p>
    </div>
  );
};

export default CycleMath;
