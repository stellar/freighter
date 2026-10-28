import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

export const emitRebrandAnnouncementViewed = (): void => {
  emitMetric(METRIC_NAMES.rebrandAnnouncementViewed);
};

// The extension's only way to dismiss; mobile also reports close and back.
export const emitRebrandAnnouncementDismissed = (): void => {
  emitMetric(METRIC_NAMES.rebrandAnnouncementDismissed, { source: "continue" });
};
