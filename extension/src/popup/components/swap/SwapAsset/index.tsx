import React, { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Icon, Input, Loader, Notification } from "@stellar/design-system";
import { captureException } from "@sentry/browser";
import { useFormik } from "formik";
import { debounce } from "lodash";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { RequestState } from "constants/request";
import { isMainnet, isTestnet } from "helpers/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { getStellarExpertUrl } from "popup/helpers/account";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import type { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
import { getDecimalsForAsset } from "popup/helpers/soroban";
import { swapIdentityKey } from "popup/helpers/swapQuote";
import { splitCanonical } from "@shared/helpers/stellar";
import { useGetSwapFromData } from "./hooks/useSwapFromData";
import {
  useSwapTokenLookup,
  balancesToHeldRecords,
} from "./hooks/useSwapTokenLookup";
import { SwapPickerSections } from "./SwapPickerSections";
import type { SwapPickerSectionsResult } from "./SwapPickerSections";

import "./styles.scss";

/**
 * The destination side passes a 3rd `details` argument carrying the picked
 * token's descriptor plus a `source` discriminator (which picker section the
 * row came from). The source side stays 2-arg-compatible (details optional).
 */
export type SwapPickerSelection = DestinationTokenDetails & { source?: string };

interface SwapAssetProps {
  selectionType: "source" | "destination";
  hiddenAssets: string[];
  onClickAsset: (
    canonical: string,
    isContract: boolean,
    details?: SwapPickerSelection,
  ) => void;
  goBack: () => void;
}

export const SwapAsset = ({
  selectionType,
  hiddenAssets,
  onClickAsset,
  goBack,
}: SwapAssetProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  // Token discovery (Popular + search) only exists on Mainnet/Testnet. On
  // custom/Futurenet networks the picker degrades to held-only and the Popular
  // section is simply hidden — no "discovery unavailable" notice.
  const isDiscoverySupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const isDestination = selectionType === "destination";
  const title = isDestination ? t("Swap to") : t("Swap from");

  const {
    state: fromState,
    fetchData,
    filterBalances,
  } = useGetSwapFromData({ showHidden: false, includeIcons: true });

  const { fetchData: lookupFetchData, state: lookupState } =
    useSwapTokenLookup();

  // Destination search: the previous lookup result lingers in lookupState
  // during the 300ms debounce, so the picker would briefly show stale held
  // tokens (and empty search sections) before the new results arrive. This flag
  // shows the loader from the keystroke until the lookup STARTS (bridging only
  // the debounce gap); from there isLoading (lookupState LOADING) takes over and
  // clears as soon as the first results paint. We deliberately don't keep it set
  // for the whole fetch promise — that kept the spinner up through the silent
  // Blockaid revalidation / cached-result repaint.
  const [isSearchPending, setIsSearchPending] = React.useState(false);
  const [pickError, setPickError] = React.useState<string | null>(null);
  // A contract-token pick waits on its decimals; a newer pick or the picker
  // closing wins over a late result.
  const pickIdRef = useRef(0);
  const pendingPickRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      pickIdRef.current += 1;
    },
    [],
  );

  const isLoading = isDestination
    ? lookupState.state === RequestState.IDLE ||
      lookupState.state === RequestState.LOADING
    : fromState.state === RequestState.IDLE ||
      fromState.state === RequestState.LOADING;

  const formik = useFormik({
    initialValues: { searchTerm: "" },
    onSubmit: async (values) => {
      if (isDestination) {
        const resolvedFrom = fromState.data;
        const balances =
          resolvedFrom?.type === AppDataType.RESOLVED
            ? resolvedFrom.balances.balances
            : [];
        const publicKey =
          resolvedFrom?.type === AppDataType.RESOLVED
            ? resolvedFrom.publicKey
            : "";
        const icons =
          resolvedFrom?.type === AppDataType.RESOLVED
            ? resolvedFrom.balances.icons
            : {};
        const tokenPrices =
          resolvedFrom?.type === AppDataType.RESOLVED
            ? resolvedFrom.tokenPrices || {}
            : {};
        // The lookup is starting now (the debounce gap is over): hand the
        // loading indicator off to isLoading, which clears at the first
        // results dispatch. lookupFetchData synchronously dispatches its first
        // action (LOADING, or an instant cached SUCCESS), so the loader state
        // is correct in the same render — a cached/idle result shows at once
        // and the spinner never waits for the silent revalidation.
        setIsSearchPending(false);
        await lookupFetchData({
          searchTerm: values.searchTerm,
          balances,
          publicKey,
          networkDetails,
          icons,
          tokenPrices,
        });
      } else {
        filterBalances(values.searchTerm);
      }
    },
    validateOnChange: false,
  });

  const debouncedSubmit = React.useMemo(
    () =>
      debounce(() => {
        formik.submitForm();
      }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    formik.setFieldValue("searchTerm", val);
    // The destination lookup is async (debounced + network); show the loader
    // immediately so stale results clear at once. It's handed off to isLoading
    // once the debounced lookup starts. The source filter is synchronous, so it
    // doesn't need this.
    if (isDestination) {
      setIsSearchPending(true);
    }
    debouncedSubmit();
  };

  // Always load the account's held balances. The source list renders them
  // directly; the destination picker feeds them into the token lookup so the
  // "Your tokens" section can be populated.
  useEffect(() => {
    const getData = async () => {
      await fetchData(true);
    };
    getData();
    // Re-fetch when the network changes (not just on mount) so switching between
    // Mainnet/Testnet refreshes balances; fromState.data then re-resolving
    // re-runs the idle lookup below for the new network. fetchData is excluded
    // (recreated each render but stable for this purpose).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkDetails.network]);

  // Destination picker: once the held balances resolve, run the idle lookup
  // (held tokens + popular). Skipped while searching, since the debounced
  // search submit drives lookupFetchData in that case.
  useEffect(() => {
    if (!isDestination) {
      return;
    }
    const resolvedFrom = fromState.data;
    if (resolvedFrom?.type !== AppDataType.RESOLVED) {
      return;
    }
    if (formik.values.searchTerm.trim().length > 0) {
      return;
    }
    lookupFetchData({
      searchTerm: "",
      balances: resolvedFrom.balances.balances,
      publicKey: resolvedFrom.publicKey,
      networkDetails,
      icons: resolvedFrom.balances.icons,
      tokenPrices: resolvedFrom.tokenPrices || {},
    });
    // Re-run when the held balances resolve OR the network changes, so the
    // Popular list is re-fetched on a Mainnet/Testnet switch. lookupFetchData
    // and searchTerm are excluded (search is driven by the debounced submit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDestination, fromState.data, networkDetails.network]);

  // Source-only rerouting/onboarding guard
  if (!isDestination) {
    if (fromState.data?.type === AppDataType.REROUTE) {
      if (fromState.data.shouldOpenTab) {
        openTab(newTabHref(fromState.data.routeTarget));
        closeWindow();
      }
      return (
        <Navigate
          to={`${fromState.data.routeTarget}${location.search}`}
          state={{ from: location }}
          replace
        />
      );
    }

    const hasError = fromState.state === RequestState.ERROR;
    // At this point fromState.data is either null/undefined or ResolvedSwapFrom
    // (REROUTE was handled above). Only call reRouteOnboarding when resolved.
    if (
      !hasError &&
      !isLoading &&
      fromState.data?.type === AppDataType.RESOLVED
    ) {
      reRouteOnboarding({
        type: fromState.data.type,
        applicationState: fromState.data.applicationState,
        state: fromState.state,
      });
    }
  }

  const resolvedFromData =
    fromState.data?.type === AppDataType.RESOLVED ? fromState.data : null;
  const icons = resolvedFromData?.balances?.icons || {};
  const tokenPrices = resolvedFromData?.tokenPrices || {};
  const balances = resolvedFromData?.filteredBalances || [];
  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  // Build the flat sections result for SwapPickerSections
  const lookupData = lookupState.data;
  const heldBalancesForNewAccount = resolvedFromData?.balances.balances || [];
  const pickerResult: SwapPickerSectionsResult = lookupData
    ? {
        ...lookupData.sections,
        isFallback: lookupData.isFallback,
        isNewAccount: heldBalancesForNewAccount.length === 0,
      }
    : {
        yourTokens: [],
        popular: [],
        verified: [],
        unverified: [],
        isFallback: false,
        isNewAccount: true,
      };

  // An unheld contract token's decimals scale every amount sent for it, so
  // they are read before the pick applies; stellar.expert's copy comes from
  // the issuer's toml and is not trusted for that. A held token's come from
  // its balance.
  // Every held balance, not only the rows the search term matched: a held
  // contract found under another code is picked as the balance.
  const heldByKey = new Map(
    balancesToHeldRecords({
      balances: heldBalancesForNewAccount,
      icons,
      tokenPrices,
    }).map((r) => [swapIdentityKey(r.canonical), r]),
  );
  const handleDestinationPick = (
    canonical: string,
    isContract: boolean,
    details?: SwapPickerSelection,
  ) => {
    if (pendingPickRef.current === canonical) {
      return;
    }
    // Every pick supersedes a pending read, whether or not it needs one.
    pickIdRef.current += 1;
    const held = isContract
      ? heldByKey.get(swapIdentityKey(canonical))
      : undefined;
    if (!isContract || held) {
      pendingPickRef.current = null;
      onClickAsset(
        held ? held.canonical : canonical,
        isContract,
        held && details
          ? {
              ...details,
              tokenCode: held.code ?? details.tokenCode,
              issuer: held.issuer,
              decimals: held.decimals,
              requiresTrustline: false,
            }
          : details,
      );
      return;
    }
    const pickId = pickIdRef.current;
    pendingPickRef.current = canonical;
    setPickError(null);
    const isLatest = () => {
      if (pickId !== pickIdRef.current) {
        return false;
      }
      pendingPickRef.current = null;
      return true;
    };
    getDecimalsForAsset({
      assetIssuer: splitCanonical(canonical).issuer,
      publicKey: resolvedFromData?.publicKey ?? "",
      networkDetails,
    })
      .then((decimals) => {
        if (isLatest()) {
          onClickAsset(
            canonical,
            isContract,
            details && { ...details, decimals },
          );
        }
      })
      .catch((e) => {
        if (!isLatest()) {
          return;
        }
        captureException(e);
        setPickError(
          t("Couldn't read this token's details. Please try again."),
        );
      });
  };

  // The source ("Swap from") picker shows the same held "Your tokens" list as
  // the destination — held tokens only, filtered locally by the search term.
  const sourceResult: SwapPickerSectionsResult = {
    yourTokens: balancesToHeldRecords({ balances, icons, tokenPrices }),
    popular: [],
    verified: [],
    unverified: [],
    isFallback: false,
    isNewAccount: heldBalancesForNewAccount.length === 0,
  };

  return (
    <>
      <SubviewHeader
        title={<span>{title}</span>}
        hasBackButton
        customBackAction={goBack}
        customBackIcon={<Icon.X />}
      />
      <View.Content hasTopInput>
        <FormRows>
          <Input
            fieldSize="md"
            autoComplete="off"
            id="destination-input"
            name="searchTerm"
            placeholder={t("Search token name or address")}
            value={formik.values.searchTerm}
            onChange={handleChange}
            leftElement={<Icon.SearchMd />}
            data-testid="swap-from-search"
          />
        </FormRows>
        <div className="SwapFrom">
          {isLoading || isSearchPending ? (
            <div className="SwapFrom__loader">
              <Loader size="2rem" />
            </div>
          ) : isDestination ? (
            <>
              {pickError && (
                <div
                  className="SwapPickerSections__notice"
                  data-testid="swap-picker-pick-error"
                >
                  <Notification variant="error" title={pickError} />
                </div>
              )}
              <SwapPickerSections
                result={pickerResult}
                searchTerm={formik.values.searchTerm}
                hiddenAssets={hiddenAssets}
                onClickAsset={handleDestinationPick}
                stellarExpertUrl={stellarExpertUrl}
                isDiscoverySupported={isDiscoverySupported}
              />
            </>
          ) : (
            <SwapPickerSections
              result={sourceResult}
              searchTerm={formik.values.searchTerm}
              hiddenAssets={hiddenAssets}
              onClickAsset={onClickAsset}
              stellarExpertUrl={stellarExpertUrl}
            />
          )}
        </div>
      </View.Content>
    </>
  );
};
