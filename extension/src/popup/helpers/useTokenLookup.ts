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
import { scanAsset, useIsAssetSuspicious } from "popup/helpers/blockaid";
import { isAssetSac } from "popup/helpers/soroban";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { tokensListsSelector } from "popup/ducks/cache";

export const useTokenLookup = ({
  setAssetRows,
  setIsSearching,
  setIsVerifiedToken,
  setIsVerificationInfoShowing,
  setVerifiedLists,
  lookupPublicKey,
  lookupNetworkDetails,
}: {
  setAssetRows: (rows: ManageAssetCurrency[]) => void;
  setIsSearching: (value: boolean) => void;
  setIsVerifiedToken: (value: boolean) => void;
  setIsVerificationInfoShowing: (value: boolean) => void;
  setVerifiedLists?: (lists: string[]) => void;
  lookupPublicKey?: string;
  lookupNetworkDetails?: ReturnType<typeof settingsNetworkDetailsSelector>;
}): {
  handleTokenLookup: (contractId: string) => Promise<void>;
} => {
  const selectedPublicKey = useSelector(publicKeySelector);
  const selectedNetworkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = lookupPublicKey || selectedPublicKey;
  const networkDetails = lookupNetworkDetails || selectedNetworkDetails;
  const { assetsLists } = useSelector(settingsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const isAssetSuspicious = useIsAssetSuspicious();

  const handleTokenLookup = useCallback(
    async (contractId: string) => {
      try {
        if (!publicKey || !networkDetails?.network) {
          setIsSearching(false);
          setAssetRows([]);
          return;
        }

        const lookupPublicKey = publicKey;
        const lookupNetworkDetails = networkDetails;

        // clear the UI while we work through the flow
        setIsSearching(true);
        setIsVerifiedToken(false);
        setIsVerificationInfoShowing(false);
        setAssetRows([]);

        const nativeContractDetails =
          getNativeContractDetails(lookupNetworkDetails);
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
          return;
        }

        const tokenLookup = async (verifiedLists?: string[]) => {
          // lookup contract. Pass verifiedLists when the contract is verified but
          // its list entry can't be trusted for the SAC determination, so we keep
          // the verified status while deriving code/issuer from the contract.
          setIsVerifiedToken(!!verifiedLists);
          if (verifiedLists) {
            setVerifiedLists?.(verifiedLists);
          }
          let tokenDetailsResponse;

          try {
            tokenDetailsResponse = await getTokenDetails({
              contractId,
              publicKey: lookupPublicKey,
              networkDetails: lookupNetworkDetails,
              shouldFetchBalance: true,
            });
          } catch (e) {
            setAssetRows([]);
          }

          const isSacContract = await isSacContractExecutable(
            contractId,
            lookupNetworkDetails,
          );

          if (!tokenDetailsResponse) {
            setAssetRows([]);
          } else {
            const issuer = isSacContract
              ? tokenDetailsResponse.name.split(":")[1] || ""
              : contractId; // get the issuer name, if applicable ,
            const scannedAsset = await scanAsset(
              `${tokenDetailsResponse.symbol}-${issuer}`,
              lookupNetworkDetails,
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
            networkDetails: lookupNetworkDetails,
            contractId,
            assetsLists,
            cachedAssetLists: cachedTokenLists,
          });

          try {
            if (verifiedTokens.length) {
              const [record] = verifiedTokens;
              // The downstream trustline-vs-SEP-41 decision re-derives the SAC
              // contract from this list entry's code/issuer (isAssetSac). If the
              // entry is imperfect, a real classic-asset SAC would be added with
              // no trustline and no error. When the derivation says "not a SAC"
              // but the contract is a SAC on-chain (authoritative check, run only
              // when derivation already failed), fall back to the manual lookup
              // which derives code/issuer from the contract and round-trips.
              const derivesToSac = isAssetSac({
                asset: {
                  code: record.code,
                  issuer: record.issuer,
                  contract: record.contract,
                },
                networkDetails: lookupNetworkDetails,
              });

              if (
                record.contract &&
                !derivesToSac &&
                (await isSacContractExecutable(
                  record.contract,
                  lookupNetworkDetails,
                ))
              ) {
                await tokenLookup(record.verifiedLists);
              } else {
                setIsVerifiedToken(true);
                setVerifiedLists?.(record.verifiedLists);
                setAssetRows(
                  verifiedTokens.map((rec: VerifiedTokenRecord) => ({
                    code: rec.code || rec.contract,
                    issuer: rec.issuer || rec.contract,
                    image: rec.icon,
                    domain: rec.domain,
                    contract: rec.contract,
                  })),
                );
              }
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
        setIsVerificationInfoShowing(isAllowListVerificationEnabled);
      } finally {
        setIsSearching(false);
      }
    },
    [
      assetsLists,
      cachedTokenLists,
      isAllowListVerificationEnabled,
      isAssetSuspicious,
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
