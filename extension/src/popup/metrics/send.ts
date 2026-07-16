import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export type SendFeeBreakdownEntryPoint = "review" | "settings";

export const trackSendFeeBreakdownOpened = (
  entryPoint: SendFeeBreakdownEntryPoint,
) => {
  emitMetric(METRIC_NAMES.paymentFeeBreakdownOpened, {
    entry_point: entryPoint,
  });
};
