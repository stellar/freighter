/**
 * One-time "Freighter is now Varial" announcement, shown to wallets that
 * existed before the rebrand: `PENDING` until shown, `SEEN` once shown or
 * never owed. Fresh installs are marked `SEEN` on first run.
 */
export enum REBRAND_ANNOUNCEMENT_STATUS {
  PENDING = "pending",
  SEEN = "seen",
}
