import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

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
 * Single-icon lookup for callers that render an icon directly without loading
 * it first (asset search, sign-transaction rows, history rows). Takes the first
 * candidate, since it has to commit to one url without knowing if it works.
 *
 * Deliberately does NOT write to the shared icon cache. getAssetIcons trusts a
 * truthy cache hit without re-loading it, so seeding that cache from here — with
 * a url nothing has confirmed renders — would let a visit to asset search or a
 * history row hand the account view a dead icon and undo the whole point of
 * probing. These callers render what they get and leave the cache to
 * getAssetIcons, which only stores urls it has watched load.
 *
 * Async purely to keep the signature stable for existing callers.
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

  return {
    icon: candidates[0],
    canonicalAsset,
  };
};
