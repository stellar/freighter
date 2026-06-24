import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Icon, Input, Loader } from "@stellar/design-system";
import { useFormik } from "formik";
import { debounce } from "lodash";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { TokenList } from "popup/components/InternalTransaction/TokenList";
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
import { useSwapTokenLookup } from "./hooks/useSwapTokenLookup";
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

  const isLoading = isDestination
    ? lookupState.state === RequestState.IDLE ||
      lookupState.state === RequestState.LOADING
    : fromState.state === RequestState.IDLE ||
      fromState.state === RequestState.LOADING;

  const formik = useFormik({
    initialValues: { searchTerm: "" },
    onSubmit: (values) => {
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
        lookupFetchData({
          searchTerm: values.searchTerm,
          balances,
          publicKey,
          networkDetails,
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
    debouncedSubmit();
  };

  useEffect(() => {
    if (!isDestination) {
      const getData = async () => {
        await fetchData(true);
      };
      getData();
    } else {
      // Trigger initial idle fetch (populate held tokens + popular)
      const resolvedFrom = fromState.data;
      const balances =
        resolvedFrom?.type === AppDataType.RESOLVED
          ? resolvedFrom.balances.balances
          : [];
      const publicKey =
        resolvedFrom?.type === AppDataType.RESOLVED
          ? resolvedFrom.publicKey
          : "";
      lookupFetchData({
        searchTerm: "",
        balances,
        publicKey,
        networkDetails,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {isLoading ? (
            <div className="SwapFrom__loader">
              <Loader size="2rem" />
            </div>
          ) : isDestination ? (
            <SwapPickerSections
              result={pickerResult}
              searchTerm={formik.values.searchTerm}
              onClickAsset={onClickAsset}
              stellarExpertUrl={stellarExpertUrl}
            />
          ) : (
            <TokenList
              tokens={balances}
              hiddenAssets={hiddenAssets}
              icons={icons}
              tokenPrices={tokenPrices}
              onClickAsset={onClickAsset}
            />
          )}
        </div>
      </View.Content>
    </>
  );
};
