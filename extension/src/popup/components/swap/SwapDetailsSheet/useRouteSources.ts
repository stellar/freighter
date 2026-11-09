import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { getDiscoverData } from "@shared/api/internal";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { ProtocolEntry } from "@shared/api/types";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import { settingsSelector } from "popup/ducks/settings";
import { iconsSelector, tokensListsSelector } from "popup/ducks/cache";

/**
 * Venue icons from /protocols and token icons from the asset lists, read
 * only: a failure leaves the generic icons, and nothing is cached.
 */
export const useRouteSources = (networkDetails: NetworkDetails) => {
  const { assetsLists } = useSelector(settingsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const cachedIcons = useSelector(iconsSelector);
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([]);
  const [tokenLists, setTokenLists] =
    useState<AssetListResponse[]>(cachedTokenLists);

  useEffect(() => {
    let isActive = true;
    getDiscoverData()
      .then((data) => isActive && setProtocols(data))
      .catch(() => {});
    getCombinedAssetListData({
      networkDetails,
      assetsLists,
      cachedAssetLists: cachedTokenLists,
    })
      .then((lists) => isActive && setTokenLists(lists))
      .catch(() => {});
    return () => {
      isActive = false;
    };
    // Once per open of the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { protocols, tokenLists, cachedIcons };
};
