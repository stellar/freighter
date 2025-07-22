import { useReducer, useState } from "react";
import Blockaid from "@blockaid/client";

import { Account, AssetIcons, BlockAidScanTxResult } from "@shared/api/types";
import { initialState, isError, reducer } from "helpers/request";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { useScanTx } from "popup/helpers/blockaid";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { getCanonicalFromAsset, isMainnet } from "helpers/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { NetworkDetails } from "@shared/constants/stellar";
import { makeAccountActive } from "popup/ducks/accountServices";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "popup/App";
import { signFlowAccountSelector } from "popup/helpers/account";
import { iconsSelector } from "popup/ducks/cache";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { getIconFromTokenLists } from "@shared/api/helpers/getIconFromTokenList";
import { isContractId } from "popup/helpers/soroban";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { settingsSelector } from "popup/ducks/settings";

export interface ResolvedData {
  type: AppDataType.RESOLVED;
  scanResult: BlockAidScanTxResult | null;
  balances: AccountBalances;
  publicKey: string;
  signFlowState: {
    allAccounts: Account[];
    accountNotFound: boolean;
    currentAccount: Account;
  };
  applicationState: APPLICATION_STATE;
  networkDetails: NetworkDetails;
  icons: AssetIcons;
}

type SignTxData = NeedsReRoute | ResolvedData;

function useGetSignTxData(
  scanOptions: {
    xdr: string;
    url: string;
  },
  balanceOptions: {
    showHidden: boolean;
    includeIcons: boolean;
  },
  accountToSign?: string,
) {
  const [state, dispatch] = useReducer(
    reducer<SignTxData, unknown>,
    initialState,
  );
  const reduxDispatch = useDispatch<AppDispatch>();

  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances(balanceOptions);
  const cachedIcons = useSelector(iconsSelector);
  const { assetsLists } = useSelector(settingsSelector);
  const { scanTx } = useScanTx();
  const [accountNotFound, setAccountNotFound] = useState(false);
  console.log(scanTx, scanOptions);

  const fetchData = async (newPublicKey?: string) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      if (newPublicKey) {
        await reduxDispatch(makeAccountActive(newPublicKey));
      }
      const appData = await fetchAppData(false);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const allAccounts = appData.account.allAccounts;
      const networkDetails = appData.settings.networkDetails;
      const isMainnetNetwork = isMainnet(networkDetails);
      const balancesResult = await fetchBalances(
        publicKey,
        isMainnetNetwork,
        networkDetails,
      );

      // const scanResult = await scanTx(
      //   scanOptions.xdr,
      //   scanOptions.url,
      //   networkDetails,
      // );
      const scanResult = {
        simulation: {
          status: "Success",
          assets_diffs: {
            CCLBPEYS3XFK65MYYXSBMOGKUI4ODN5S7SUZBGD7NALUQF64QILLX5B5: [
              {
                asset: {
                  type: "ASSET",
                  code: "wETH",
                  issuer:
                    "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
                  org_name: "",
                  org_url: "",
                },
                in: null,
                out: {
                  usd_price: "0",
                  summary: "Sent 0.5000355 wETH",
                  value: "1",
                  raw_value: 5000355,
                },
                asset_type: "ASSET",
              },
            ],
            GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H: [
              {
                asset: {
                  type: "ASSET",
                  code: "wETH",
                  issuer:
                    "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
                  org_name: "",
                  org_url: "",
                },
                in: {
                  usd_price: "0",
                  summary: "Received 0.5000355 wETH",
                  value: "1",
                  raw_value: 5000355,
                },
                out: null,
                asset_type: "ASSET",
              },
              {
                asset: {
                  type: "NATIVE",
                  code: "XLM",
                  issuer: "",
                  org_name: "",
                  org_url: "",
                },
                out: {
                  usd_price: "0",
                  summary: "Received 0.5000355 wETH",
                  value: "1",
                  raw_value: 1000355,
                },
                in: null,
                asset_type: "NATIVE",
              },
            ],
          },
          exposures: {
            GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H: [
              {
                asset: {
                  type: "NATIVE",
                  code: "XLM",
                },
                spenders: {
                  CCLBPEYS3XFK65MYYXSBMOGKUI4ODN5S7SUZBGD7NALUQF64QILLX5B5: {
                    approval: "",
                    exposure: [
                      {
                        usd_price: "0",
                        summary: "Received 0.5000355 wETH",
                        value: "1",
                        raw_value: 1000355,
                      },
                    ],
                  } as Blockaid.StellarSingleAssetExposure,
                },
              },
            ],
          },
          assets_ownership_diff: {
            GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H: [
              {
                post_signers: [
                  "CCLBPEYS3XFK65MYYXSBMOGKUI4ODN5S7SUZBGD7NALUQF64QILLX5B5",
                ],
                pre_signers: [
                  "CCLBPEYS3XFK65MYYXSBMOGKUI4ODN5S7SUZBGD7NALUQF64QILLX5B5",
                ],
                type: "SET_OPTIONS",
              },
            ],
          },
          address_details: [],
          account_summary: {
            account_assets_diffs: [
              {
                asset: {
                  type: "ASSET",
                  code: "wETH",
                  issuer:
                    "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
                  org_name: "",
                  org_url: "",
                },
                in: {
                  usd_price: "0",
                  summary: "Received 0.5000355 wETH",
                  value: "1",
                  raw_value: 5000355,
                },
                out: null,
                asset_type: "ASSET",
              } as Blockaid.StellarTransactionScanResponse.StellarSimulationResult.AccountSummary.StellarLegacyAssetDiff,
            ],
            account_exposures: [],
            account_ownerships_diff: [],
            total_usd_diff: {
              in: 0,
              out: 0,
              total: 0,
            },
            total_usd_exposure: {},
          },
        },
        validation: {
          status: "Success",
          result_type: "Benign",
          description: "",
          reason: "",
          classification: "",
          features: [],
        },
        request_id: "d7dbd848-66f4-4b8e-b151-ff280593df3c",
      } as BlockAidScanTxResult;

      const icons = {} as { [code: string]: string };
      if (
        "simulation" in scanResult &&
        scanResult.simulation &&
        scanResult.simulation.status === "Success" &&
        "asset_diffs" in scanResult.simulation
      ) {
        const assetsListsData = await getCombinedAssetListData({
          networkDetails,
          assetsLists,
        });
        const diffs = scanResult.simulation.assets_diffs || {};
        for (const diff of diffs[publicKey]) {
          if (
            "code" in diff.asset &&
            diff.asset.code &&
            "issuer" in diff.asset &&
            diff.asset.issuer
          ) {
            const key = diff.asset.issuer;
            const code = diff.asset.code;
            let canonical = getCanonicalFromAsset(code, key);
            if (cachedIcons[canonical]) {
              icons[canonical] = cachedIcons[canonical];
            } else {
              let icon = await getIconUrlFromIssuer({
                key,
                code,
                networkDetails,
              });
              if (!icon) {
                const tokenListIcon = await getIconFromTokenLists({
                  networkDetails,
                  issuerId: key,
                  contractId: isContractId(key) ? key : undefined,
                  code,
                  assetsListsData,
                });
                if (tokenListIcon.icon && tokenListIcon.canonicalAsset) {
                  icon = tokenListIcon.icon;
                  canonical = tokenListIcon.canonicalAsset;
                }
              }
              icons[canonical] = icon;
            }
          }
        }
      }

      if (isError<AccountBalances>(balancesResult)) {
        throw new Error(balancesResult.message);
      }

      // handle auto selecting the right account based on `accountToSign`
      const currentAccount = signFlowAccountSelector({
        allAccounts,
        publicKey,
        accountToSign,
        setActiveAccount: (account: string) =>
          reduxDispatch(makeAccountActive(account)),
      });

      if (!currentAccount) {
        setAccountNotFound(true);
      }

      const payload = {
        type: AppDataType.RESOLVED,
        balances: balancesResult,
        scanResult,
        publicKey,
        applicationState: appData.account.applicationState,
        networkDetails: appData.settings.networkDetails,
        icons,
        signFlowState: {
          allAccounts,
          accountNotFound,
          currentAccount,
        },
      } as ResolvedData;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      return error;
    }
  };

  return {
    state,
    fetchData,
  };
}

export { useGetSignTxData };
