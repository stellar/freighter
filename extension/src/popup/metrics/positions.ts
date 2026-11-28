import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

/**
 * Emitters for the Positions tab.
 *
 * The top of the positions-to-deposit funnel: a pool card opens the pool's
 * position (`positions.pool_selected`), and a supplied token there opens the
 * token's position screen (`positions.row_selected`). That screen's Deposit
 * leads into Earn, and everything downstream of it is an `earn.*` event
 * carrying `source: "position_row"`, which is what joins the two halves.
 *
 * The funnel is genuinely shorter on this path than from Home: a prefilled
 * entry skips CHOOSE_TOKEN, so `earn.token_selected` and
 * `screen.viewed: earn_select_token` never fire for it. We deliberately do not
 * synthesise them, which would report a selection the user never made.
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

/** What an Activity row says happened: "deposit", "withdraw", or a newer type. */
interface ActivityEventProps {
  poolId: string;
  protocol: string;
  assetCode: string;
  activityType: string;
}

const activityProps = ({
  poolId,
  protocol,
  assetCode,
  activityType,
}: ActivityEventProps) => ({
  pool_id: poolId,
  protocol,
  asset_code: assetCode,
  activity_type: activityType,
});

/** An Activity row was tapped, opening its details sheet. */
export const trackPositionActivityRowSelected = (props: ActivityEventProps) => {
  emitMetric(METRIC_NAMES.positionActivityRowSelected, activityProps(props));
};

/** What was tapped inside an Activity row's details sheet. */
export type ActivityDetailsAction = "transaction_details" | "explorer";

export const trackPositionActivityDetailsActionSelected = ({
  action,
  ...props
}: ActivityEventProps & { action: ActivityDetailsAction }) => {
  emitMetric(METRIC_NAMES.positionActivityDetailsActionSelected, {
    ...activityProps(props),
    action,
  });
};
