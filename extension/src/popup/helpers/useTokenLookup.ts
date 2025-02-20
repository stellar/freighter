import { captureException } from "@sentry/browser";
import { useCallback } from "react";
import { useSelector } from "react-redux";

import { getTokenDetails } from "@shared/api/internal";
import { isSacContractExecutable } from "@shared/helpers/soroban/token";

import { isMainnet, isTestnet } from "helpers/stellar";

import { publicKeySelector } from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  getVerifiedTokens,
  getNativeContractDetails,
  VerifiedTokenRecord,
} from "popup/helpers/searchAsset";
import { isAssetSuspicious, scanAsset } from "popup/helpers/blockaid";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";

export const useTokenLookup = ({
  setAssetRows,
  setIsSearching,
  setIsVerifiedToken,
  setIsVerificationInfoShowing,
  setVerifiedLists,
}: {
  setAssetRows: (rows: ManageAssetCurrency[]) => void;
  setIsSearching: (value: boolean) => void;
  setIsVerifiedToken: (value: boolean) => void;
  setIsVerificationInfoShowing: (value: boolean) => void;
  setVerifiedLists?: (lists: string[]) => void;
}): {
  handleTokenLookup: (contractId: string) => Promise<void>;
} => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { assetsLists } = useSelector(settingsSelector);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  const handleTokenLookup = useCallback(
    async (contractId: string) => {
      // clear the UI while we work through the flow
      setIsSearching(true);
      setIsVerifiedToken(false);
      setIsVerificationInfoShowing(false);
      setAssetRows([]);

      const nativeContractDetails = getNativeContractDetails(networkDetails);
      let verifiedTokens = [] as VerifiedTokenRecord[];

      // step around verification for native contract and unverifiable networks
      if (nativeContractDetails.contract === contractId) {
        // override our rules for verification for XLM
        setIsVerificationInfoShowing(false);
        setAssetRows([
          {
            code: nativeContractDetails.code,
            issuer: contractId,
            domain: nativeContractDetails.domain,
          },
        ]);
        setIsSearching(false);
        return;
      }

      const tokenLookup = async () => {
        // lookup contract
        setIsVerifiedToken(false);
        let tokenDetailsResponse;

        try {
          tokenDetailsResponse = await getTokenDetails({
            contractId,
            publicKey,
            networkDetails,
            shouldFetchBalance: true,
          });
        } catch (e) {
          setAssetRows([]);
        }

        const isSacContract = await isSacContractExecutable(
          contractId,
          networkDetails,
        );

        if (!tokenDetailsResponse) {
          setAssetRows([]);
        } else {
          const issuer = isSacContract
            ? tokenDetailsResponse.name.split(":")[1] || ""
            : contractId; // get the issuer name, if applicable ,
          const scannedAsset = await scanAsset(
            `${tokenDetailsResponse.symbol}-${issuer}`,
            networkDetails,
          );
          setAssetRows([
            {
              code: tokenDetailsResponse.symbol,
              contract: contractId,
              issuer,
              domain: "",
              name: tokenDetailsResponse.name,
              balance: tokenDetailsResponse.balance,
              decimals: tokenDetailsResponse.decimals,
              isSuspicious: isAssetSuspicious(scannedAsset),
            },
          ]);
        }
      };

      if (isAllowListVerificationEnabled) {
        // usual binary case of a token being verified or unverified
        verifiedTokens = await getVerifiedTokens({
          networkDetails,
          contractId,
          assetsLists,
        });

        try {
          if (verifiedTokens.length) {
            setIsVerifiedToken(true);
            setVerifiedLists?.(verifiedTokens[0].verifiedLists);
            setAssetRows(
              verifiedTokens.map((record: VerifiedTokenRecord) => ({
                code: record.code || record.contract,
                issuer: record.issuer || record.contract,
                image: record.icon,
                domain: record.domain,
                contract: record.contract,
              })),
            );
          } else {
            // token not found on asset list, look up the details manually
            await tokenLookup();
          }
        } catch (e) {
          setAssetRows([]);
          captureException(
            `Failed to fetch token details - ${JSON.stringify(e)}`,
          );
          console.error(e);
        }
      } else {
        // Futurenet token lookup
        await tokenLookup();
      }
      setIsSearching(false);
      setIsVerificationInfoShowing(isAllowListVerificationEnabled);
    },
    [
      assetsLists,
      isAllowListVerificationEnabled,
      networkDetails,
      publicKey,
      setAssetRows,
      setIsSearching,
      setIsVerificationInfoShowing,
      setIsVerifiedToken,
      setVerifiedLists,
    ],
  );

  return { handleTokenLookup };
};
