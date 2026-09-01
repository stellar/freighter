/**
 * The empty state of an amount field, shared by every screen that hosts
 * `AmountCard`.
 *
 * They are strings, not numbers, because the amount lives in redux and formik as
 * the user typed it. `"0"` is what an empty crypto input commits and what the
 * screens compare against to decide whether an amount has been entered;
 * `"0.00"` is its fiat counterpart, kept at cent precision so the fiat line
 * never renders a bare "0".
 */
export const DEFAULT_AMOUNT = "0";
export const DEFAULT_AMOUNT_USD = "0.00";
