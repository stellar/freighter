import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export type SendFeeBreakdownEntryPoint = "review" | "settings";

export const trackSendFeeBreakdownOpened = (
  entryPoint: SendFeeBreakdownEntryPoint,
) => {
  emitMetric(METRIC_NAMES.sendPaymentFeeBreakdownOpened, {
    entry_point: entryPoint,
  });
};
