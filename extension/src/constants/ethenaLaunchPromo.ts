/**
 * One-time full-screen "Meet Ethena on Stellar" promo, shown to wallets that
 * existed when the launch build was installed: `PENDING` until shown, `SEEN`
 * once shown or never owed. Fresh installs are marked `SEEN` on first run.
 */
export enum ETHENA_LAUNCH_PROMO_STATUS {
  PENDING = "pending",
  SEEN = "seen",
}
