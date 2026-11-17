import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

// Shown by UnlockAccount on the way Home, or opened from Home's banner: the
// same two sources the mobile app reports.
export type EthenaLaunchPromoSource = "launch" | "banner";

export const emitEthenaLaunchPromoViewed = (
  source: EthenaLaunchPromoSource,
): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchPromoViewed, { source });
};

export const emitEthenaLaunchSwapTapped = (token: string): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchSwapTapped, { token });
};

// The extension's own: the mobile app has no Transfer to Stellar.
export const emitEthenaLaunchTransferTapped = (token: string): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchTransferTapped, { token });
};

export const emitEthenaLaunchReceiveTapped = (token: string): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchReceiveTapped, { token });
};

export const emitEthenaLaunchLearnMoreTapped = (): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchLearnMoreTapped);
};

export const emitEthenaLaunchBannerDismissed = (): void => {
  emitMetric(METRIC_NAMES.ethenaLaunchBannerDismissed);
};
