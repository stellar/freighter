/**
 * Marks an Earn entry that arrives with the deposit already configured — from a
 * Positions row, where the pool and token are both known.
 *
 * It has to travel in the URL rather than in Redux: `views/Earn` runs
 * `resetSubmission()` on mount, and that returns the whole slice to
 * `initialState`, so a prefill dispatched before navigating would be wiped
 * before the first render.
 */
export const EARN_PREFILL_KEY = "prefill";

export const EARN_PREFILL_QUERY = `?${EARN_PREFILL_KEY}=1`;

/** The two tabs of a supplied token's position screen. */
export type PoolDetailsTab = "your_position" | "overview";

/** Did this Earn entry arrive prefilled? Takes a `location.search`. */
export const isEarnPrefillSearch = (search: string) =>
  new URLSearchParams(search).get(EARN_PREFILL_KEY) === "1";

/**
 * Where a deposit flow began. Carried on the deposit outcomes so a deposit
 * started from Home's Earn button can be told from one started on the Positions
 * tab.
 *
 * Same shape as DISCOVER_SOURCE in popup/metrics/discover.ts — a const object
 * and a derived union, emitted as `source`.
 */
export const EARN_SOURCE = {
  HOME: "home",
  POSITION_ROW: "position_row",
  POSITIONS_EMPTY: "positions_empty",
  /** The Positions tab's Deposit button, under the pool cards. */
  POSITIONS_PILL: "positions_pill",
} as const;

export type EarnSource = (typeof EARN_SOURCE)[keyof typeof EARN_SOURCE];

export const EARN_SOURCE_KEY = "source";

/**
 * Which entry point opened the flow. Read once at mount by `views/Earn` — the
 * view rewrites its own search when the swap branch opens and closes, so a
 * later read finds nothing. An unrecognised or absent value means Home, which
 * is the entry point that passes no param at all.
 */
export const getEarnSourceFromSearch = (search: string): EarnSource => {
  const value = new URLSearchParams(search).get(EARN_SOURCE_KEY);
  return value === EARN_SOURCE.POSITION_ROW ||
    value === EARN_SOURCE.POSITIONS_EMPTY ||
    value === EARN_SOURCE.POSITIONS_PILL
    ? value
    : EARN_SOURCE.HOME;
};

/**
 * Steps in the Earn deposit flow.
 *
 * Modelled on Send (`constants/send-payment.ts`) rather than Swap: every visited
 * step stays mounted and inactive ones are hidden, because the token picker owns
 * a fetched list and scroll position, the amount screen owns formik state, and
 * the swap branch has to return to CHOOSE_TOKEN without a remount flash.
 *
 * Screens that are transient overlays are NOT steps — the pool details sheet,
 * the "not enough X" sheet, the network-fee sheet, the review sheet and the
 * whole swap branch are sheets owned by their host step, so that step's state
 * survives them. This mirrors how SendAmount hosts EditSettings and
 * ReviewTransaction.
 */
export enum STEPS {
  /** One-time interstitial; skipped once the user has seen it. */
  INTRO = "earn-intro",
  CHOOSE_TOKEN = "earn-choose-token",
  AMOUNT = "earn-amount",
  /** Both "Depositing" and "Deposited!" — loading vs success of one screen. */
  DEPOSIT_CONFIRM = "earn-deposit-confirm",
}

/**
 * Which button set the "Not enough X" sheet shows. Driven by whether the asset
 * can be bought via the onramp and whether the account holds anything it could
 * swap from. Each has its own frame in the design (Varial 4478:115689 and its
 * siblings).
 */
export enum NotEnoughVariant {
  SWAP_OR_TRANSFER = "swap-or-transfer",
  BUY_OR_TRANSFER = "buy-or-transfer",
  BUY_SWAP_OR_TRANSFER = "buy-swap-or-transfer",
  TRANSFER_ONLY = "transfer-only",
}

/**
 * Assets the Coinbase onramp can sell, by code.
 *
 * `useGetOnrampToken` builds `pay.coinbase.com/buy/select-asset?...&defaultAsset=`
 * from the code, so an unlisted asset produces a dead-end page rather than an
 * error. Freighter only ever passed "XLM" before Earn. EURC is deliberately
 * absent — it is not Coinbase-listed. (The designs use EURC as a placeholder
 * token on every variant, Buy included.)
 */
export const EARN_ONRAMP_ASSETS = new Set(["XLM", "USDC"]);
