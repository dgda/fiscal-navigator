import React, { useEffect } from 'react';
import { useTreasury } from '../../context/TreasuryContext';
import { AlertTriangle, X } from 'lucide-react';

const AUTO_DISMISS_MS = 6000;

const Toast: React.FC = () => {
  const { notification, dismissNotification } = useTreasury();

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(dismissNotification, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [notification, dismissNotification]);

  if (!notification) return null;

  const palette =
    notification.kind === 'conflict'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
      : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed left-1/2 top-3 z-[10000] flex max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-md ${palette}`}
    >
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <p className="text-[11px] font-medium leading-snug">{notification.message}</p>
      <button
        onClick={dismissNotification}
        className="-mr-1 ml-auto shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
};

export default Toast;
