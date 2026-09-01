import { useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { getBlendEarnOptions, getBlendPools } from "@shared/api/helpers/blend";
import { BlendCatalogPool } from "@shared/api/types/blend";
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
        const balanceCode =
          balance && "token" in balance ? balance.token.code : "";
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
        // assets the account actually has, so a zero-balance reserve resolves
        // nothing here and gets its icon fetched below. Native is the exception:
        // keyed "native" whether or not it is held, and its logo is bundled.
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

      // `balances.icons` covers only what the account holds, so every
      // zero-balance reserve would otherwise render AssetIcon's placeholder even
      // on Mainnet, where the icon is perfectly resolvable. Resolve those
      // through the exact path balances use — cached icons, then the verified
      // token lists, then the issuer's TOML — by handing getAssetIcons a
      // balance-shaped record per row. Bounded work: a pool has a handful of
      // reserves, and results land in the icon cache for the next open.
      const rowsMissingIcons = [...held, ...supported].filter(
        (row) => !row.iconUrl && row.issuer,
      );
      if (rowsMissingIcons.length) {
        const assetsListsData = cachedTokenLists.length
          ? cachedTokenLists
          : await getCombinedAssetListData({ networkDetails, assetsLists });

        const fetchedIcons = await resolveEarnAssetIcons({
          assets: rowsMissingIcons,
          networkDetails,
          cachedIcons,
          assetsListsData,
        });

        rowsMissingIcons.forEach((row) => {
          const canonicalKey = getCanonicalFromAsset(row.code, row.issuer!);
          row.iconUrl = fetchedIcons[canonicalKey] || undefined;
        });
        reduxDispatch(saveIconsForBalances({ icons: fetchedIcons }));
      }

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
