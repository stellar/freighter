import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { AppDispatch } from "popup/App";
import {
  getCatalogAssetIdentity,
  resolveEarnAssetIcons,
} from "popup/components/earn/helpers/earnAssetIcons";
import {
  iconsSelector,
  saveIconsForBalances,
  tokensListsSelector,
} from "popup/ducks/cache";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";

/**
 * Canonical-keyed icons for a pool's accepted tokens, in the shape AssetIcon
 * looks assets up by.
 *
 * The catalog carries no icons, and the balances icon map only covers reserves
 * the account happens to hold, so the rest have to be resolved. Usually a cache
 * read: the token picker resolves the same assets on the way in and writes them
 * to the icon cache. Runs on open rather than with the deposit screen, so an
 * unopened sheet costs nothing.
 *
 * The map stays empty only while resolution is in flight — AssetIcon reads an
 * empty map as "still fetching" and holds a loader — so a failed lookup records
 * an explicit null instead, letting it fall through to its missing-image state.
 */
export const usePoolReserveIcons = (pool: BlendCatalogPool | null) => {
  const reduxDispatch = useDispatch<AppDispatch>();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { assetsLists } = useSelector(settingsSelector);
  const cachedIcons = useSelector(iconsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const [icons, setIcons] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let isActive = true;

    const resolve = async () => {
      const reserves = pool?.reserves || [];
      const assets = reserves
        .map((reserve) => ({
          assetId: reserve.assetId,
          ...getCatalogAssetIdentity({
            symbol: reserve.symbol,
            name: reserve.name,
            assetId: reserve.assetId,
            networkDetails,
          }),
        }))
        // Native's logo ships with the extension, and an asset with no icon key
        // has nothing to look up.
        .filter((asset) => asset.canonical && !asset.isNative);

      if (!assets.length) {
        return;
      }

      const seeded = assets.reduce(
        (acc, asset) =>
          asset.canonical in cachedIcons
            ? { ...acc, [asset.canonical]: cachedIcons[asset.canonical] }
            : acc,
        {} as Record<string, string | null>,
      );
      const missing = assets.filter((asset) => !(asset.canonical in seeded));

      if (isActive && Object.keys(seeded).length) {
        setIcons(seeded);
      }
      if (!missing.length) {
        return;
      }

      let resolved: Record<string, string | null> = {};
      try {
        const assetsListsData = cachedTokenLists.length
          ? cachedTokenLists
          : await getCombinedAssetListData({ networkDetails, assetsLists });
        resolved = await resolveEarnAssetIcons({
          assets: missing.map(({ code, issuer, assetId }) => ({
            code,
            issuer,
            assetId,
          })),
          networkDetails,
          cachedIcons,
          assetsListsData,
        });
        if (Object.keys(resolved).length) {
          reduxDispatch(saveIconsForBalances({ icons: resolved }));
        }
      } catch (e) {
        // An unresolved icon is a placeholder, not a broken sheet.
      }

      if (!isActive) {
        return;
      }
      setIcons((current) =>
        missing.reduce(
          (acc, asset) => ({
            ...acc,
            [asset.canonical]: resolved[asset.canonical] ?? null,
          }),
          { ...current, ...seeded },
        ),
      );
    };

    resolve();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool?.id]);

  return icons;
};
