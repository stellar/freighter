export const TX_SEND_MAX = "922337203685.4775807" as const;

// Seconds. What Send and Swap start with, and what their Settings sheet's
// timeout Default restores.
export const DEFAULT_TX_TIMEOUT = 180;
// freighter-backend-v2's swap.MaxTimeoutSeconds; /swap/tx rejects more.
export const MAX_TX_TIMEOUT = 86400;
