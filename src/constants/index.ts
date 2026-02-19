export const TOTAL_CYCLES = 52;
// In your TreasuryContext.tsx or API config
const getBaseUrl = () => {
  // If accessing via the Mac's IP on your phone, use that same IP for the API
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
};

export const API_URL = getBaseUrl();
// export const API_URL = 'http://localhost:3001/api';
export const CURRENCY_SYMBOL = '₱';

// These are now defaults used only for initial state or fallbacks
export const DEFAULT_ANCHOR_DATE = '2026-02-06';
export const DEFAULT_FIXED_INTERVAL = 14;

export const DEFAULT_HIDDEN_AMOUNT = 'XX,XXX.XX';
