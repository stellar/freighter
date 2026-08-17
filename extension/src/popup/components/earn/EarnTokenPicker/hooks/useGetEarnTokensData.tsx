import { useReducer } from "react";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { getBlendEarnOptions, getBlendPools } from "@shared/api/helpers/blend";
import { BlendCatalogPool } from "@shared/api/types/blend";
import { getBlendPoolId } from "@shared/constants/blend";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { initialState, isError, reducer } from "helpers/request";
import { isMainnet } from "helpers/stellar";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { getBalanceByKey } from "popup/helpers/balance";

/** One row in the picker. */
export interface EarnTokenOption {
  /** The reserve's asset contract address (a SAC for every current reserve). */
  assetId: string;
  code: string;
  issuer?: string;
  iconUrl?: string | null;
  decimals: number;
  /** Raw total in display units, "0" when the account holds none. */
  total: string;
  /**
   * Headline rate as a decimal fraction (0.1694 = 16.94%), or null when the
   * pool oracle has no fresh price and the rate is genuinely unknown.
   */
  apy: number | null;
  poolId: string;
}

export interface ResolvedEarnTokens {
  type: AppDataType.RESOLVED;
  publicKey: string;
  networkDetails: NetworkDetails;
  balances: AccountBalances;
  /** Pool-supported assets the account holds — the "In your account" section. */
  held: EarnTokenOption[];
  /** Pool-supported assets at zero — the "Supported tokens" section. */
  supported: EarnTokenOption[];
  pool: BlendCatalogPool | null;
}

export type EarnTokens = NeedsReRoute | ResolvedEarnTokens;

/**
 * The earn headline is supply interest plus BLND emissions.
 *
 * A null `supplyApy` means no fresh oracle price, so the whole rate is unknown.
 * A null `emissionsSupplyApr` means the stream exists but cannot be priced —
 * treated as zero here, which understates rather than blanking an otherwise
 * known rate. The screen's "*APY is an estimate" footnote covers the gap.
 */
const headlineApy = (
  supplyApy: number | null,
  emissionsSupplyApr: number | null,
) => (supplyApy === null ? null : supplyApy + (emissionsSupplyApr ?? 0));

export function useGetEarnTokensData() {
  const [state, dispatch] = useReducer(
    reducer<EarnTokens, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: false,
    includeIcons: true,
  });

  const fetchData = async (useCache = false): Promise<EarnTokens | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(useCache);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;

      const balances = await fetchBalances(
        publicKey,
        isMainnet(networkDetails),
        networkDetails,
        useCache,
      );
      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const [earnOptions, pools] = await Promise.all([
        getBlendEarnOptions({ networkDetails }),
        getBlendPools({ networkDetails }),
      ]);

      // The backend's allowlist should already have narrowed this to the Fixed
      // pool, but pin it to our own constant too: a drifted allowlist would
      // otherwise silently offer deposits into a pool the flow never vetted.
      const poolId = getBlendPoolId(networkDetails);
      const pool = pools.find((p) => p.id === poolId) || null;

      const held: EarnTokenOption[] = [];
      const supported: EarnTokenOption[] = [];

      earnOptions.forEach((option) => {
        const offer = option.pools.find((p) => p.id === poolId);
        if (!offer) {
          return;
        }

        const balance = getBalanceByKey(
          option.assetId,
          balances.balances,
          networkDetails,
        );
        const total = balance?.total ? new BigNumber(balance.total) : null;
        const issuer =
          balance && "token" in balance && "issuer" in balance.token
            ? balance.token.issuer.key
            : undefined;

        // Icons are keyed by canonical, so only held assets resolve one — a
        // zero-balance supported token has no issuer to build a key from and
        // falls back to AssetIcon's placeholder. XLM is the exception: it is
        // keyed "native" whether or not it is held.
        const code = option.symbol || "";
        let canonical = "";
        if (issuer) {
          canonical = getCanonicalFromAsset(code, issuer);
        } else if (code === "XLM") {
          canonical = "native";
        }

        const row: EarnTokenOption = {
          assetId: option.assetId,
          code,
          issuer,
          iconUrl: balances.icons?.[canonical],
          decimals: option.decimals ?? CLASSIC_ASSET_DECIMALS,
          total: total ? total.toFixed() : "0",
          apy: headlineApy(offer.supplyApy, offer.emissionsSupplyApr),
          poolId: offer.id,
        };

        if (total && total.gt(0)) {
          held.push(row);
        } else {
          supported.push(row);
        }
      });

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        networkDetails,
        balances,
        held,
        supported,
        pool,
      } as EarnTokens;

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error(`Failed to fetch earn tokens - ${error}`);
    }
  };

  return { state, fetchData };
}
