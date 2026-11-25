import { useReducer } from "react";
import { captureException } from "@sentry/browser";
import { Account, AssetVisibility } from "@shared/api/types";
import { getHiddenAssets } from "@shared/api/internal";
import { initialState, isError, reducer } from "helpers/request";
import {
  AppDataType,
  NeedsReRoute,
  useGetAppData,
} from "helpers/hooks/useGetAppData";
import { isMainnet } from "helpers/stellar";
import {
  getTotalUsd,
  getTotalUsdLabel,
  omitHiddenBalances,
} from "popup/helpers/balance";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AccountBalances, useGetBalances } from "helpers/hooks/useGetBalances";
import { NetworkDetails } from "@shared/constants/stellar";
import { useGetTokenPrices } from "helpers/hooks/useGetTokenPrices";
import { onListAccountValue } from "helpers/accountFunding";

export interface ResolvedData {
  type: AppDataType.RESOLVED;
  publicKey: string;
  allAccounts: Account[];
  accountValue?: {
    [key: string]: string;
  };
  applicationState: APPLICATION_STATE;
  isFetchingTokenPrices: boolean;
  /**
   * At least one account had an error: a failed balance, price or hidden
   * asset fetch. The view shows the error per account. The app-open refresh
   * reads this flag, so it retries at the next app open.
   */
  hasAccountErrors?: boolean;
}

type GetWalletsData = NeedsReRoute | ResolvedData;

// the number of wallets that fit in the extension viewport at once
const BATCH_SIZE = 6;

/**
 * Hidden assets for an account. Returns an empty map on error, so the total
 * still loads. `isLoaded` is `false` on error.
 */
const loadHiddenAssets = async ({
  activePublicKey,
  publicKey,
  network,
}: {
  activePublicKey: string;
  publicKey: string;
  network: string;
}): Promise<{
  hiddenAssets: Record<string, AssetVisibility>;
  isLoaded: boolean;
}> => {
  try {
    const { hiddenAssets, error } = await getHiddenAssets({
      activePublicKey,
      publicKey,
      network,
    });
    if (error) {
      throw new Error(error);
    }
    return { hiddenAssets: hiddenAssets || {}, isLoaded: true };
  } catch (error) {
    captureException(`Error loading hidden assets in wallets data - ${error}`);
    return { hiddenAssets: {}, isLoaded: false };
  }
};

function useGetWalletsData() {
  const [state, dispatch] = useReducer(
    reducer<GetWalletsData, unknown>,
    initialState,
  );
  const { fetchData: fetchAppData } = useGetAppData();
  const { fetchData: fetchBalances } = useGetBalances({
    showHidden: true,
    includeIcons: false,
  });
  const { fetchData: fetchTokenPrices } = useGetTokenPrices();

  const batchedFetchBalances = async ({
    accounts,
    networkDetails,
    isMainnetNetwork,
    useCache,
    payload,
  }: {
    // The batch to fetch. `payload.allAccounts` holds every own account.
    accounts: Account[];
    networkDetails: NetworkDetails;
    isMainnetNetwork: boolean;
    useCache: boolean;
    payload: ResolvedData;
  }) => {
    const prices = await Promise.all(
      accounts.map(async (account) => {
        try {
          // Hidden assets are per account
          const { hiddenAssets, isLoaded: isHiddenAssetsLoaded } =
            await loadHiddenAssets({
              activePublicKey: payload.publicKey,
              publicKey: account.publicKey,
              network: networkDetails.network,
            });
          const balances = await fetchBalances(
            account.publicKey,
            isMainnetNetwork,
            networkDetails,
            useCache,
            true,
          );
          if (isError<AccountBalances>(balances)) {
            captureException(
              `Error loading account balances in wallets data - ${balances.message}`,
            );
            payload.hasAccountErrors = true;
            return {
              [account.publicKey]: getTotalUsdLabel({
                hasError: true,
                hasPriceFeed: isMainnetNetwork,
                isFunded: false,
              }),
            };
          }

          // Hidden assets don't count, matching the Home total. Hiding is
          // how people deal with spam tokens, whose made-up prices would
          // otherwise inflate this total.
          const visibleBalances = omitHiddenBalances(
            balances.balances,
            hiddenAssets,
          );
          const prices = await fetchTokenPrices({
            publicKey: account.publicKey,
            balances: visibleBalances,
            networkDetails,
            useCache: true,
          });
          const { totalUsd, hasPrices } = getTotalUsd(
            prices.tokenPrices || {},
            visibleBalances,
          );
          const hasBalanceError = !!(
            balances.error?.horizon || balances.error?.soroban
          );
          if (!isHiddenAssetsLoaded || hasBalanceError || !prices.tokenPrices) {
            payload.hasAccountErrors = true;
          }
          // Feeds funded_account_count. It changes only `funded`, never the
          // event state, so it cannot emit account.funded. Without the hidden
          // assets, the total can include a hidden token, so skip the update.
          if (isHiddenAssetsLoaded) {
            onListAccountValue({
              publicKey: account.publicKey,
              networkDetails,
              allAccounts: payload.allAccounts,
              input: {
                isFunded: balances.isFunded,
                balances: visibleBalances,
                tokenPrices: prices.tokenPrices,
                hasBalanceError,
              },
            });
          }
          return {
            [account.publicKey]: getTotalUsdLabel({
              hasError: false,
              hasPriceFeed: isMainnetNetwork,
              isFunded: !!balances.isFunded,
              hasPrices,
              totalUsd,
            }),
          };
        } catch (error) {
          captureException(
            `error loading account balances and token prices in wallets data - ${error}`,
          );
          payload.hasAccountErrors = true;
          return {
            [account.publicKey]: getTotalUsdLabel({
              hasError: true,
              hasPriceFeed: isMainnetNetwork,
              isFunded: false,
            }),
          };
        }
      }),
    );
    const pricesMap: { [key: string]: string } = prices.reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});
    payload.accountValue = { ...payload.accountValue, ...pricesMap };
    dispatch({ type: "FETCH_DATA_SUCCESS", payload });
  };

  const fetchData = async (useCache = false) => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const appData = await fetchAppData(true);
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

      const payload = {
        type: AppDataType.RESOLVED,
        publicKey,
        allAccounts,
        applicationState: appData.account.applicationState,
        isFetchingTokenPrices: isMainnetNetwork,
      } as ResolvedData;

      if (!isMainnetNetwork) {
        // No feed here, so nothing is fetched and every account's total is a
        // known zero. Filled in so the row never has to infer a missing entry.
        const noFeedLabel = getTotalUsdLabel({
          hasError: false,
          hasPriceFeed: false,
          isFunded: false,
        });
        payload.accountValue = Object.fromEntries(
          allAccounts.map((account) => [account.publicKey, noFeedLabel]),
        );
      }

      if (isMainnetNetwork) {
        for (let i = 0; i < allAccounts.length; i += BATCH_SIZE) {
          const batch = allAccounts.slice(i, i + BATCH_SIZE);
          await batchedFetchBalances({
            accounts: batch,
            networkDetails,
            isMainnetNetwork,
            useCache,
            payload,
          });
        }
      }

      payload.isFetchingTokenPrices = false;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({
        type: "FETCH_DATA_ERROR",
        payload: error,
      });
      captureException(`Error loading wallets data - ${error}`);
      return error;
    }
  };

  return {
    state,
    fetchData,
    batchedFetchBalances,
  };
}

export { useGetWalletsData };
