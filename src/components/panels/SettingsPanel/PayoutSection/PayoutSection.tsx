import React from 'react';
import { useTreasury } from '../../../../context/TreasuryContext';
import { Zap } from 'lucide-react';
import { PayoutArchetype } from '../../../../types';

interface PayoutSectionProps {
  sectionClass: string;
  headerClass: string;
}

const PayoutSection: React.FC<PayoutSectionProps> = (props) => {
  const { sectionClass, headerClass } = props;

  const { data, updatePayoutConfig } = useTreasury();

  const labelClass =
    'mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500';
  const inputClass =
    'w-full rounded-xl border border-black/5 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-white/5 dark:bg-[#2C2C2E] dark:text-white';

  return (
    <section className={sectionClass}>
      <header className={headerClass}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-sm">
            <Zap size={18} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-[13px] font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Payroll Protocol
            </h2>
            <p className="text-[10px] font-bold text-slate-400">System Payout Anchors</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-3">
        <div>
          <label className={labelClass}>Archetype</label>
          <select
            value={data.payoutConfig.archetype}
            onChange={(e) => updatePayoutConfig({ archetype: e.target.value as PayoutArchetype })}
            className={inputClass}
          >
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="semi-monthly">Semi-Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {data.payoutConfig.archetype === 'semi-monthly' && (
          <>
            <div>
              <label className={labelClass}>Primary Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={data.payoutConfig.semiMonthlyDays[0]}
                onChange={(e) =>
                  updatePayoutConfig({
                    semiMonthlyDays: [Number(e.target.value), data.payoutConfig.semiMonthlyDays[1]],
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Secondary Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={data.payoutConfig.semiMonthlyDays[1]}
                onChange={(e) =>
                  updatePayoutConfig({
                    semiMonthlyDays: [data.payoutConfig.semiMonthlyDays[0], Number(e.target.value)],
                  })
                }
                className={inputClass}
              />
            </div>
          </>
        )}

        {data.payoutConfig.archetype === 'bi-weekly' && (
          <>
            <div>
              <label className={labelClass}>Anchor Date</label>
              <input
                type="date"
                value={data.payoutConfig.anchorDate}
                onChange={(e) => updatePayoutConfig({ anchorDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cycle Days</label>
              <input
                type="number"
                value={data.payoutConfig.fixedIntervalDays}
                onChange={(e) => updatePayoutConfig({ fixedIntervalDays: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </>
        )}

        {data.payoutConfig.archetype === 'monthly' && (
          <div>
            <label className={labelClass}>Monthly Day</label>
            <input
              type="number"
              value={data.payoutConfig.monthlyDay}
              onChange={(e) => updatePayoutConfig({ monthlyDay: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default PayoutSection;
