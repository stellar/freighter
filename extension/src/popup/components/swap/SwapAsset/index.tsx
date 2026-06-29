import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Icon, Input, Loader } from "@stellar/design-system";
import { useFormik } from "formik";
import { debounce } from "lodash";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { FormRows } from "popup/basics/Forms";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { getStellarExpertUrl } from "popup/helpers/account";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import type { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
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
  // Blockaid revalidation / cached-result repaint (§ batch3 tasks 10 & 11).
  const [isSearchPending, setIsSearchPending] = React.useState(false);

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
            ? resolvedFrom.tokenPrices
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only balance fetch; fetchData is stable for this purpose
  }, []);

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
      tokenPrices: resolvedFrom.tokenPrices,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when held balances resolve; lookupFetchData/networkDetails/searchTerm are intentionally excluded (search is driven by the debounced submit)
  }, [isDestination, fromState.data]);

  // Source-only rerouting/onboarding guard
  if (!isDestination) {
    if (fromState.data?.type === AppDataType.REROUTE) {
      if (fromState.data.shouldOpenTab) {
        openTab(newTabHref(fromState.data.routeTarget));
        window.close();
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
        hadSorobanMatches: lookupData.hadSorobanMatches,
        isFallback: lookupData.isFallback,
        isNewAccount: heldBalancesForNewAccount.length === 0,
      }
    : {
        yourTokens: [],
        popular: [],
        verified: [],
        unverified: [],
        hadSorobanMatches: false,
        isFallback: false,
        isNewAccount: true,
      };

  // The source ("Swap from") picker shows the same held "Your tokens" list as
  // the destination — held tokens only, filtered locally by the search term.
  const sourceResult: SwapPickerSectionsResult = {
    yourTokens: balancesToHeldRecords({ balances, icons, tokenPrices }),
    popular: [],
    verified: [],
    unverified: [],
    hadSorobanMatches: false,
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
            <SwapPickerSections
              result={pickerResult}
              searchTerm={formik.values.searchTerm}
              hiddenAssets={hiddenAssets}
              onClickAsset={onClickAsset}
              stellarExpertUrl={stellarExpertUrl}
              isDestination
            />
          ) : (
            <SwapPickerSections
              result={sourceResult}
              searchTerm={formik.values.searchTerm}
              hiddenAssets={hiddenAssets}
              onClickAsset={onClickAsset}
              stellarExpertUrl={stellarExpertUrl}
              isDestination={false}
            />
          )}
        </div>
      </View.Content>
    </>
  );
};
