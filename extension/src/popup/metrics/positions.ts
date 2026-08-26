import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

/**
 * Emitters for the Positions tab.
 *
 * The top of the positions-to-deposit funnel: a pool card opens My position
 * (`positions.pool_selected`), and a supplied-asset row inside it opens the
 * pool-details sheet on Your position (`positions.row_selected`) — the sheet's
 * own Deposit button is what actually leads into Earn. Everything downstream of
 * that button is an `earn.*` event carrying `source: "position_row"`, which is
 * what joins the two halves.
 *
 * Note the funnel is genuinely shorter on this path than from Home: a prefilled
 * entry skips CHOOSE_TOKEN, so `earn.token_selected` and
 * `screen.viewed: earn_select_token` never fire for it. We deliberately do not
 * synthesise them — that would report a selection the user never made.
 */
export const trackPoolSelected = ({
  poolId,
  protocol,
}: {
  poolId: string;
  protocol: string;
}) => {
  emitMetric(METRIC_NAMES.positionPoolSelected, {
    pool_id: poolId,
    protocol,
  });
};

export const trackPositionRowSelected = ({
  poolId,
  protocol,
  assetCode,
}: {
  poolId: string;
  protocol: string;
  assetCode: string;
}) => {
  emitMetric(METRIC_NAMES.positionRowSelected, {
    pool_id: poolId,
    protocol,
    asset_code: assetCode,
  });
};

export const trackPositionsEmptyCtaSelected = () => {
  emitMetric(METRIC_NAMES.positionsEmptyCtaSelected, {});
};
