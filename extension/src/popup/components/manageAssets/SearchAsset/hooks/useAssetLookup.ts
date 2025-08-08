import { useReducer } from "react";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { getTokenDetails } from "@shared/api/internal";
import { isSacContractExecutable } from "@shared/helpers/soroban/token";
import { INDEXER_URL } from "@shared/constants/mercury";
import { BlockAidScanAssetResult } from "@shared/api/types";
import {
  getVerifiedTokens,
  getNativeContractDetails,
  searchAsset,
  VerifiedTokenRecord,
} from "popup/helpers/searchAsset";
import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { isContractId } from "popup/helpers/soroban";
import { initialState, reducer } from "helpers/request";
import { RequestState } from "constants/request";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { settingsSelector } from "popup/ducks/settings";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";

interface AssetRecord {
  asset: string;
  domain?: string;
  tomlInfo?: { image: string };
}

interface AssetLookupDetails {
  isVerifiedToken: boolean;
  isVerificationInfoShowing: boolean;
  verifiedAssetRows: ManageAssetCurrency[];
  unverifiedAssetRows: ManageAssetCurrency[];
  verifiedLists: string[];
  blockaidScanResults: {
    [key: string]: BlockAidScanAssetResult;
  };
}

const DEFAULT_PAYLOAD: AssetLookupDetails = {
  isVerifiedToken: false,
  isVerificationInfoShowing: false,
  verifiedAssetRows: [],
  unverifiedAssetRows: [],
  verifiedLists: [],
  blockaidScanResults: {},
};

const useAssetLookup = () => {
  let isVerifiedToken = false;
  let isVerificationInfoShowing = false;
  let verifiedLists = [] as string[];

  const { assetsLists } = useSelector(settingsSelector);
  const MAX_ASSETS_TO_SCAN = 10;

  const [state, dispatch] = useReducer(
    reducer<AssetLookupDetails, unknown>,
    initialState,
  );

  const addBlockaidScanResults = async ({
    assetRows,
    payload,
    isVerifiedList,
  }: {
    assetRows: ManageAssetCurrency[];
    payload: AssetLookupDetails;
    isVerifiedList: boolean;
  }) => {
    // scan the first few assets to see if they are suspicious
    // due to the length of time it takes to scan, we'll do it in consecutive chunks
    for (let i = 0; i < assetRows.length; i += MAX_ASSETS_TO_SCAN) {
      const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);

      const chunk = assetRows.slice(i, i + MAX_ASSETS_TO_SCAN);
      chunk.forEach((record) => {
        if (record.code && record.issuer) {
          url.searchParams.append(
            "asset_ids",
            `${record.code}-${record.issuer}`,
          );
        }
      });
      const response = await fetch(url.href);
      const data = await response.json();
      const blockaidScanChunkResults: {
        [key: string]: BlockAidScanAssetResult;
      } = data.data.results;

      // take our scanned assets and update the assetRows with the new isSuspicious values
      const assetRowsAddendum = assetRows
        .slice(i, i + MAX_ASSETS_TO_SCAN)
        .map((row) => {
          const assetId = `${row.code}-${row.issuer}`;
          return {
            ...row,
            isSuspicious: blockaidScanChunkResults[assetId]
              ? isAssetSuspicious(blockaidScanChunkResults[assetId])
              : row.isSuspicious,
          };
        });

      // insert our newly scanned rows into the existing data
      assetRows = [
        ...assetRows.slice(0, i),
        ...assetRowsAddendum,
        ...assetRows.slice(i + MAX_ASSETS_TO_SCAN),
      ];

      const rowsToUpdate = isVerifiedList
        ? "verifiedAssetRows"
        : "unverifiedAssetRows";

      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: { ...payload, [rowsToUpdate]: assetRows },
      });
    }
  };

  /*
   * Fetches token data for the given contract ID.
   * We have multiple ways to get token information, but this function
   * always returns an array of an ManageAssetCurrency object.
   * This array will always have one object in it because we'll always only have one result with a token lookup.
   *
   * @param {string} contractId - The contract ID to look up.
   * @returns {Promise<ManageAssetCurrency[]>}
   */
  const fetchTokenData = async (
    publicKey: string,
    contractId: string,
    isAllowListVerificationEnabled: boolean,
    networkDetails: NetworkDetails,
  ) => {
    let assetRows = [] as ManageAssetCurrency[];

    const nativeContractDetails = getNativeContractDetails(networkDetails);
    let verifiedTokens = [] as VerifiedTokenRecord[];

    // we already have native contract info, so just load it statically
    if (nativeContractDetails.contract === contractId) {
      // override our rules for verification for XLM
      isVerificationInfoShowing = false;

      assetRows = [
        {
          code: nativeContractDetails.code,
          issuer: contractId,
          domain: nativeContractDetails.domain,
        },
      ];

      return assetRows;
    }

    const tokenLookup = async () => {
      // lookup contract
      isVerifiedToken = false;
      const tokenDetailsResponse = await getTokenDetails({
        contractId,
        publicKey,
        networkDetails,
      });

      const isSacContract = await isSacContractExecutable(
        contractId,
        networkDetails,
      );

      if (!tokenDetailsResponse) {
        assetRows = [];
      } else {
        const issuer = isSacContract
          ? tokenDetailsResponse.name.split(":")[1] || ""
          : contractId; // get the issuer name, if applicable ,
        const scannedAsset = await scanAsset(
          `${tokenDetailsResponse.symbol}-${issuer}`,
          networkDetails,
        );
        assetRows = [
          {
            code: tokenDetailsResponse.symbol,
            contract: contractId,
            issuer,
            domain: "",
            name: tokenDetailsResponse.name,
            isSuspicious: isAssetSuspicious(scannedAsset),
          },
        ];
      }
    };

    // If we're using asset lists, we can retrieve asset info from the list
    if (isAllowListVerificationEnabled) {
      verifiedTokens = await getVerifiedTokens({
        networkDetails,
        contractId,
        assetsLists,
      });

      try {
        if (verifiedTokens.length) {
          isVerifiedToken = true;
          verifiedLists = verifiedTokens[0].verifiedLists;
          assetRows = verifiedTokens.map((record: VerifiedTokenRecord) => ({
            code: record.code || record.contract,
            issuer: record.issuer || record.contract,
            image: record.icon,
            domain: record.domain,
            contract: record.contract,
          }));
        } else {
          // token not found on asset list, look up the details manually using RPC
          await tokenLookup();
        }
      } catch (e) {
        captureException(
          `Failed to fetch token details - ${JSON.stringify(e)}`,
        );
        console.error(e);
        return [];
      }
    } else {
      // Futurenet token lookup
      await tokenLookup();
    }
    isVerificationInfoShowing = isAllowListVerificationEnabled;
    return assetRows;
  };

  /*
   * Fetches data from Stellar Expert for the given asset.
   * It returns an array of ManageAssetCurrency objects.
   *
   * @param {string} asset - The asset to look up.
   * @returns {Promise<ManageAssetCurrency[]>}
   */
  const fetchStellarExpertData = async ({
    asset,
    networkDetails,
  }: {
    asset: string;
    networkDetails: NetworkDetails;
  }): Promise<ManageAssetCurrency[]> => {
    const resJson = await searchAsset({
      asset,
      networkDetails,
    });

    return resJson._embedded.records.map((record: AssetRecord) => ({
      code: record.asset.split("-")[0],
      issuer: record.asset.split("-")[1],
      domain: record.domain,
      image: record.tomlInfo?.image,
      isSuspicious: false,
    }));
  };

  /*
   * Fetches data for the asset lookup.
   * If the asset is a contract ID, it fetches token data.
   * Otherwise, it fetches Stellar Expert data.
   * It also scans assets using BlockAid if enabled.
   *
   * @param {string} asset - The asset to look up.
   * @param {boolean} isBlockaidEnabled - Whether BlockAid is enabled.
   */
  const fetchData = async ({
    asset,
    isBlockaidEnabled,
    publicKey,
    isAllowListVerificationEnabled,
    networkDetails,
  }: {
    asset: string;
    isBlockaidEnabled: boolean;
    publicKey: string;
    isAllowListVerificationEnabled: boolean;
    networkDetails: NetworkDetails;
  }) => {
    dispatch({ type: "FETCH_DATA_START" });

    if (!asset) {
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: DEFAULT_PAYLOAD,
      });
      return;
    }

    let assetRows: ManageAssetCurrency[] = [];
    const blockaidScanResults: { [key: string]: BlockAidScanAssetResult } = {};

    if (isContractId(asset)) {
      // for custom tokens, try to go down the the custom token flow
      try {
        assetRows = await fetchTokenData(
          publicKey,
          asset,
          isAllowListVerificationEnabled,
          networkDetails,
        );
      } catch (e) {
        captureException(
          `Failed to fetch token details - ${JSON.stringify(e)}`,
        );
        console.error(e);
        dispatch({ type: "FETCH_DATA_ERROR", payload: e });
        return;
      }
    } else {
      // otherwise, try to use stellar.expert to search for a classic asset
      try {
        assetRows = await fetchStellarExpertData({ asset, networkDetails });
      } catch (error) {
        captureException(
          `Failed to fetch StellarExpert data - ${JSON.stringify(error)}`,
        );
        console.error(error);
        dispatch({ type: "FETCH_DATA_ERROR", payload: DEFAULT_PAYLOAD });
        return;
      }

      // Only show records that have a domain and domains that don't have just whitespace
      // We omit these results as a safety precaution and to encourage asset issuers to add a domain to their asset
      assetRows = assetRows.filter(
        (record) => record.domain && /\S/.test(record.domain),
      );
    }

    const assetsListsData = await getCombinedAssetListData({
      networkDetails,
      assetsLists,
    });

    for (const assetRow of assetRows) {
      const key = assetRow.issuer!;
      const code = assetRow.code!;
      if (!assetRow.image) {
        const tokenListIcon = await getIconFromTokenLists({
          networkDetails,
          issuerId: key,
          contractId: assetRow.contract,
          code,
          assetsListsData,
        });
        if (tokenListIcon.icon && tokenListIcon.canonicalAsset) {
          assetRow.image = tokenListIcon.icon;
        }
      }
    }

    const { verifiedAssets, unverifiedAssets } =
      await splitVerifiedAssetCurrency({
        networkDetails,
        assets: assetRows,
        assetsListsDetails: assetsLists,
      });

    const payload = {
      verifiedAssetRows: verifiedAssets,
      unverifiedAssetRows: unverifiedAssets,
      isVerifiedToken,
      isVerificationInfoShowing,
      verifiedLists,
      blockaidScanResults,
    };
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });

    // If we want to gather Blockaid data about our assets, we'll fetch the data and then combine with our
    // asset rows so we have all of our information in one object
    if (isBlockaidEnabled && !isContractId(asset)) {
      if (verifiedAssets.length) {
        addBlockaidScanResults({
          assetRows: verifiedAssets,
          payload,
          isVerifiedList: true,
        });
      }

      if (unverifiedAssets.length) {
        addBlockaidScanResults({
          assetRows: unverifiedAssets,
          payload,
          isVerifiedList: false,
        });
      }
    }
  };

  return {
    fetchData,
    state,
  };
};

export { useAssetLookup, RequestState };
