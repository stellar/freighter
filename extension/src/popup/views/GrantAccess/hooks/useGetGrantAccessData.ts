import { useReducer } from "react";
import Blockaid from "@blockaid/client";

import { initialState, isError, reducer } from "../../../../helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "../../../../helpers/hooks/useGetAppData";
import { useScanSite } from "../../../../popup/helpers/blockaid";
import { BlockAidScanSiteResult } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { isCustomNetwork } from "@shared/helpers/stellar";

type ResolvedGrantAccessData = BlockAidScanSiteResult & {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  applicationState: APPLICATION_STATE;
  scanData: BlockAidScanSiteResult;
};

type GrantAccessData = NeedsReRoute | ResolvedGrantAccessData;

function useGetGrantAccessData(url: string) {
  const [state, dispatch] = useReducer(
    reducer<GrantAccessData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { scanSite } = useScanSite();
  console.log(url, scanSite);

  const fetchData = async () => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData();
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      // const scanData = await scanSite(url, appData.settings.networkDetails);
      const scanData = {
        status: "hit",
        url: "https://ethlen.com",
        scan_start_time: "2023-07-19T11:19:11.676000",
        scan_end_time: "2023-07-19T11:26:20.700000",
        malicious_score: 1,
        is_reachable: true,
        is_web3_site: true,
        is_malicious: true,
        attack_types: {
          approval_farming: {
            score: 1,
            threshold: 1,
            features: {},
          },
        },
        network_operations: [
          "at.alicdn.com",
          "cdn.jsdelivr.net",
          "ethlen.com",
          "www.liwanxsq.top",
        ],
        json_rpc_operations: [
          "eth_accounts",
          "eth_call",
          "eth_gasPrice",
          "eth_getBalance",
          "eth_getBlockByNumber",
          "eth_requestAccounts",
          "eth_sendTransaction",
        ],
        contract_write: {
          contract_addresses: ["0xdac17f958d2ee523a2206206994597c13d831ec7"],
          functions: {
            "0x095ea7b3": ["approve(address,uint256)"],
          },
        },
        contract_read: {
          contract_addresses: [
            "0x833326b482a38c37f24f4f271298936ce8aed3bc",
            "0xdac17f958d2ee523a2206206994597c13d831ec7",
          ],
          functions: {
            "0xdd62ed3e": ["allowance(address,address)"],
            "0xd4fac45d": ["getBalance(address,address)"],
          },
        },
      } as Blockaid.SiteScanHitResponse;
      if (!scanData && !isCustomNetwork(appData.settings.networkDetails)) {
        throw new Error("Unable to scan site");
      }

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey: appData.account.publicKey,
        networkDetails: appData.settings.networkDetails,
        applicationState: appData.account.applicationState,
        networksList: appData.settings.networksList,
        scanData,
      } as ResolvedGrantAccessData;

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

export { useGetGrantAccessData };
