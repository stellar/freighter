import { useReducer, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { getBlendEarnOptions, getBlendPools } from "@shared/api/helpers/blend";
import {
  BlendCatalogPool,
  BlendEarnAssetOption,
} from "@shared/api/types/blend";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { getBlendPoolId } from "@shared/constants/blend";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import {
  getCatalogAssetIdentity,
  getCatalogIconKey,
  getCatalogIssuer,
  resolveEarnAssetIcons,
} from "popup/components/earn/helpers/earnAssetIcons";
import { AppDispatch } from "popup/App";
import { settingsSelector } from "popup/ducks/settings";
import {
  iconsSelector,
  saveIconsForBalances,
  tokensListsSelector,
} from "popup/ducks/cache";
import { RequestState } from "constants/request";
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
   * Whether the account already has a balance entry (a trustline) for it. A
   * swap into a token without one has to open it first, which locks another
   * base reserve of XLM.
   */
  hasTrustline: boolean;
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
  /** Pool-supported assets the account holds — the "In your wallet" section. */
  held: EarnTokenOption[];
  /**
   * Pool-supported assets at zero — the second section, headed "Other supported
   * assets" when something is held and "Supported tokens" when nothing is.
   */
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
 * known rate. The screen's "APY may change" footnote covers the gap.
 */
const headlineApy = (
  supplyApy: number | null,
  emissionsSupplyApr: number | null,
) => (supplyApy === null ? null : supplyApy + (emissionsSupplyApr ?? 0));

/**
 * Splits the pool's reserves into the picker's two sections. Each row takes its
 * icon from what is already known: the held balances' icons, else the session's
 * icon cache. Rows still without one get it looked up after the list shows.
 */
const buildEarnRows = ({
  earnOptions,
  pools,
  balances,
  networkDetails,
  cachedIcons,
}: {
  earnOptions: BlendEarnAssetOption[];
  pools: BlendCatalogPool[];
  balances: AccountBalances;
  networkDetails: NetworkDetails;
  cachedIcons: Record<string, string | null>;
}) => {
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
    const balanceIssuer =
      balance && "token" in balance && "issuer" in balance.token
        ? balance.token.issuer.key
        : undefined;

    // A zero-balance reserve has no balance to take an issuer from; the
    // catalog's `name` is the only other source. Without it the row can
    // build no icon key at all.
    const issuer = balanceIssuer || getCatalogIssuer(option.name);

    // `symbol` is null for native XLM on the live catalog (verified against
    // dev), so it cannot be the only source of the display code — taking it
    // alone renders that row with no token code at all. Fall back to the
    // held balance's code, then to a truncated contract id, which is the
    // same fallback the backend documents for unnamed pools.
    //
    // `name` is deliberately NOT a candidate: for classic assets the
    // catalog returns the canonical there ("USDC:GA5ZSEJY…"), not a
    // friendly name.
    const balanceCode = balance && "token" in balance ? balance.token.code : "";
    // Covers the two codes the catalog can imply rather than state: the code
    // half of a classic asset's canonical, and "XLM" for native, which is
    // reported with a null symbol *and* a null name and so is recognisable
    // only by its SAC. Without it an account holding no XLM had no code to
    // fall back on and the row rendered a truncated contract address.
    const catalogCode = getCatalogAssetIdentity({
      symbol: option.symbol,
      name: option.name,
      assetId: option.assetId,
      networkDetails,
    }).code;
    const code =
      option.symbol ||
      balanceCode ||
      catalogCode ||
      `${option.assetId.slice(0, 4)}…`;

    // Icons are keyed by canonical. `balances.icons` only holds entries for
    // assets the account actually has; a zero-balance reserve finds its icon
    // in the session's cache once it has been looked up. Native is the
    // exception: keyed "native" whether or not it is held, and its logo is
    // bundled.
    const canonical = getCatalogIconKey({
      code,
      issuer,
      assetId: option.assetId,
      networkDetails,
    });

    const row: EarnTokenOption = {
      assetId: option.assetId,
      code,
      issuer,
      iconUrl:
        balances.icons?.[canonical] || cachedIcons[canonical] || undefined,
      decimals: option.decimals ?? CLASSIC_ASSET_DECIMALS,
      total: total ? total.toFixed() : "0",
      hasTrustline: Boolean(balance),
      apy: headlineApy(offer.supplyApy, offer.emissionsSupplyApr),
      poolId: offer.id,
    };

    if (total && total.gt(0)) {
      held.push(row);
    } else {
      supported.push(row);
    }
  });

  return { held, supported, pool };
};

/**
 * Loads the picker's rows: the pool's reserves, split by what the account
 * holds.
 *
 * Shaped like mobile's picker so it shows its spinner only while there is
 * nothing to list:
 * - `useCache` reads the account, settings, balances and token lists Home
 *   already loaded, as Swap's and Send's pickers do. A refresh after a swap
 *   passes `false` for fresh balances.
 * - The Blend catalog is fetched alongside the balances, not after them.
 * - Icons for tokens the account doesn't hold are looked up after the list
 *   shows, and fill in when they arrive.
 * - A refresh keeps the current list on screen until the new one is ready,
 *   and a failed refresh keeps it.
 */
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
  const reduxDispatch = useDispatch<AppDispatch>();
  const { assetsLists } = useSelector(settingsSelector);
  const cachedIcons = useSelector(iconsSelector);
  const cachedTokenLists = useSelector(tokensListsSelector);
  // Numbers each fetch, so a slow icon lookup from an earlier one cannot put
  // back the list a newer fetch replaced.
  const latestFetch = useRef(0);

  const hasRows =
    state.state === RequestState.SUCCESS &&
    state.data?.type === AppDataType.RESOLVED;

  /**
   * Icons for the rows that have none yet: token lists, then the issuer's
   * TOML, through the path balances use. Results land in the session's icon
   * cache too, so the next open lists them straight away. Bounded work: a pool
   * has a handful of reserves. Icons are cosmetic, so a failure leaves the
   * placeholders.
   */
  const fillMissingIcons = async (
    fetchId: number,
    payload: ResolvedEarnTokens,
  ) => {
    const rowsMissingIcons = [...payload.held, ...payload.supported].filter(
      (row) => !row.iconUrl && row.issuer,
    );
    if (!rowsMissingIcons.length) {
      return;
    }

    try {
      const assetsListsData = cachedTokenLists.length
        ? cachedTokenLists
        : await getCombinedAssetListData({
            networkDetails: payload.networkDetails,
            assetsLists,
          });
      const fetchedIcons = await resolveEarnAssetIcons({
        assets: rowsMissingIcons,
        networkDetails: payload.networkDetails,
        cachedIcons,
        assetsListsData,
      });
      reduxDispatch(saveIconsForBalances({ icons: fetchedIcons }));

      if (fetchId !== latestFetch.current) {
        return;
      }
      const withIcon = (row: EarnTokenOption) =>
        row.iconUrl || !row.issuer
          ? row
          : {
              ...row,
              iconUrl:
                fetchedIcons[getCanonicalFromAsset(row.code, row.issuer)] ||
                undefined,
            };
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: {
          ...payload,
          held: payload.held.map(withIcon),
          supported: payload.supported.map(withIcon),
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async (useCache = false): Promise<EarnTokens | Error> => {
    latestFetch.current += 1;
    const fetchId = latestFetch.current;
    if (!hasRows) {
      dispatch({ type: "FETCH_DATA_START" });
    }
    try {
      // Unlocked, the popup already holds the account and settings; a
      // refresh is about balances, not them.
      const appData = await fetchAppData(true);
      if (isError(appData)) {
        throw new Error(appData.message);
      }

      if (appData.type === AppDataType.REROUTE) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: appData });
        return appData;
      }

      const publicKey = appData.account.publicKey;
      const networkDetails = appData.settings.networkDetails;

      const [balances, earnOptions, pools] = await Promise.all([
        fetchBalances(
          publicKey,
          isMainnet(networkDetails),
          networkDetails,
          useCache,
        ),
        getBlendEarnOptions({ networkDetails }),
        getBlendPools({ networkDetails }),
      ]);
      if (isError<AccountBalances>(balances)) {
        throw new Error(balances.message);
      }

      const payload: ResolvedEarnTokens = {
        type: AppDataType.RESOLVED,
        publicKey,
        networkDetails,
        balances,
        ...buildEarnRows({
          earnOptions,
          pools,
          balances,
          networkDetails,
          cachedIcons,
        }),
      };

      if (fetchId !== latestFetch.current) {
        return payload;
      }
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      void fillMissingIcons(fetchId, payload);
      return payload;
    } catch (error) {
      // A refresh that fails leaves the list it was refreshing.
      if (!hasRows && fetchId === latestFetch.current) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      }
      throw new Error(`Failed to fetch earn tokens - ${error}`);
    }
  };

  return { state, fetchData };
}
