import { useMemo } from "react";
import { useSelector } from "react-redux";

import { publicKeySelector } from "popup/ducks/accountServices";
import { historySelector } from "popup/ducks/cache";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  PositionActivityItem,
  getBlendActivityFromHistory,
} from "popup/components/earn/helpers/positionActivity";

/**
 * One supplied token's activity in one pool, newest first.
 *
 * INTERIM: read from the History operations Home already fetched and cached,
 * so opening a position costs no request. Null until that history has loaded.
 * A backend activity endpoint would replace only the source below; the items
 * keep their shape.
 */
export const usePositionActivity = ({
  poolId,
  assetId,
}: {
  poolId: string;
  assetId: string;
}): PositionActivityItem[] | null => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const cachedHistory = useSelector(historySelector);
  const operations = cachedHistory[networkDetails.network]?.[publicKey];

  return useMemo(() => {
    if (!operations) {
      return null;
    }
    return getBlendActivityFromHistory({
      operations,
      poolId,
      publicKey,
      networkDetails,
    }).filter((item) => item.assetId === assetId);
  }, [operations, poolId, assetId, publicKey, networkDetails]);
};
