import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { getCollectibles } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

/**
 * Whether this collectible is one the wallet tracks locally, i.e. was added
 * through Add collectible and lives in `COLLECTIBLES_ID`.
 *
 * The grid is not built from that list alone: `useGetCollectibles` passes the
 * tracked contracts to the backend, which also returns special-cased
 * collectibles (Meridian Pay and the like) whether or not they are tracked.
 * Those have nothing local to delete, so Remove is offered only where it can
 * actually succeed.
 *
 * Defaults to `false` until the read resolves, so a slow or failed lookup hides
 * the action rather than offering one that would fail.
 */
export const useIsCollectibleTracked = ({
  collectionAddress,
  tokenId,
}: {
  collectionAddress: string;
  tokenId: string;
}) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isTracked, setIsTracked] = useState(false);

  useEffect(() => {
    let isStale = false;

    const check = async () => {
      if (!publicKey) {
        return;
      }

      try {
        const { collectiblesList } = await getCollectibles({
          publicKey,
          network: networkDetails.network,
        });
        const tracked = (collectiblesList || []).some(
          (contract) =>
            contract.id === collectionAddress &&
            contract.tokenIds.includes(tokenId),
        );

        if (!isStale) {
          setIsTracked(tracked);
        }
      } catch (error) {
        captureException(`Failed to read tracked collectibles - ${error}`);
      }
    };

    check();

    return () => {
      isStale = true;
    };
  }, [publicKey, networkDetails.network, collectionAddress, tokenId]);

  return isTracked;
};
