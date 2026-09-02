import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

import { sendMessageToBackground } from "./extensionMessaging";
import { firstLoadableIconUrl } from "./iconProbe";
import { SERVICE_TYPES } from "../../constants/services";

interface TokenListLookup {
  issuerId?: string;
  contractId?: string;
  code: string;
  assetsListsData: AssetListResponse[];
}

/**
 * Collects every icon url the user's asset lists offer for one asset.
 *
 * An asset commonly appears on more than one list with a different icon url on
 * each, and any of those urls can be dead. Returning all of them lets the
 * caller pick one that actually loads (see firstLoadableIconUrl) instead of
 * committing to whichever list happened to come first. List order is preserved
 * so it decides the order candidates are tried, not which one wins.
 *
 * Pure: no caching, no messaging. The caller caches the url it settles on.
 */
export const getIconCandidatesFromTokenLists = ({
  issuerId,
  contractId,
  code,
  assetsListsData,
}: TokenListLookup) => {
  const candidates = [] as string[];
  let canonicalAsset = undefined as string | undefined;

  const addCandidate = (icon: string, assetKey: string) => {
    if (!canonicalAsset) {
      canonicalAsset = getCanonicalFromAsset(code, assetKey);
    }
    // The same icon can be listed by several providers; probing it twice would
    // just spend the budget re-confirming the same answer.
    if (!candidates.includes(icon)) {
      candidates.push(icon);
    }
  };

  for (const data of assetsListsData) {
    const list = data.assets;
    if (list) {
      for (const record of list) {
        if (contractId) {
          const regex = new RegExp(contractId, "i");
          if (record.contract && record.contract.match(regex) && record.icon) {
            addCandidate(record.icon, contractId);
            continue;
          }
        }

        if (
          issuerId &&
          record.issuer &&
          record.issuer === issuerId &&
          record.code === code &&
          record.icon
        ) {
          addCandidate(record.icon, issuerId);
        }
      }
    }
  }

  return { candidates, canonicalAsset };
};

/**
 * Resolves one asset's icon from the user's token lists: gathers every url the
 * lists offer, loads them in turn, and keeps the first that renders. Returns an
 * undefined icon when nothing works, which sends the caller to its own fallback
 * (usually the issuer's SEP-1 toml).
 *
 * Only a url confirmed to render is written to the shared icon cache, so every
 * other surface can trust a cache hit without loading it again.
 */
export const getIconFromTokenLists = async ({
  issuerId,
  contractId,
  code,
  assetsListsData,
}: TokenListLookup) => {
  const { candidates, canonicalAsset } = getIconCandidatesFromTokenLists({
    issuerId,
    contractId,
    code,
    assetsListsData,
  });

  const icon = await firstLoadableIconUrl(candidates);

  if (icon && canonicalAsset) {
    await sendMessageToBackground({
      activePublicKey: null,
      assetCanonical: canonicalAsset,
      iconUrl: icon,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  }

  return {
    icon,
    canonicalAsset,
  };
};
