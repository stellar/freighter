import React, { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";
import { Notification } from "@stellar/design-system";
import { useSelector } from "react-redux";

import { FormRows } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import { isMainnet, isTestnet } from "helpers/stellar";

import { isBlockaidEnabled as isBlockaidEnabledForNetwork } from "popup/helpers/blockaid";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { showToast } from "popup/basics/shadcn/Toast";

import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "helpers/hooks/fetchHookInterface";
import { Loading } from "popup/components/Loading";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";
import { balancesSelector } from "popup/ducks/cache";
import { useHiddenAssets } from "popup/helpers/useHiddenAssets";

import { ManageAssetRows } from "../ManageAssetRows";
import { HiddenAssets } from "../HiddenAssets";
import { SearchInput, SearchResults } from "../AssetResults";
import { useAssetLookup } from "./hooks/useAssetLookup";
import { useGetSearchData } from "./hooks/useSearchData";

import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

const ResultsHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="SearchAsset__InfoBlock">
      <Notification variant="primary" title={t("Multiple assets")}>
        <div>
          {t(
            "Multiple assets have a similar code, please check the domain before adding.",
          )}
          <div>
            <a
              href="https://developers.stellar.org/docs/issuing-assets/publishing-asset-info/"
              target="_blank"
              rel="noreferrer"
            >
              {t("Learn more about assets domains")}
            </a>
          </div>
        </div>
      </Notification>
    </div>
  );
};

export const SearchAsset = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const cachedBalances = useSelector(balancesSelector);

  const ResultsRef = useRef<HTMLDivElement>(null);

  const { state, fetchData } = useGetSearchData({
    showHidden: true,
    includeIcons: false,
  });

  const { state: tokenState, fetchData: fetchTokenData } = useAssetLookup();

  const { isAssetHidden, setAssetVisibility, refreshHiddenAssets } =
    useHiddenAssets();
  const [isHiddenAssetsOpen, setIsHiddenAssetsOpen] = useState(false);
  // Canonical of the asset whose unhide is in flight, if any
  const [unhidingAsset, setUnhidingAsset] = useState("");

  /**
   * Unhides a token from the Hidden tokens sheet or a search row, confirms
   * with a toast and closes the sheet so the result is visible straight away.
   */
  const handleUnhide = async ({
    code,
    canonicalAsset,
  }: {
    code: string;
    canonicalAsset: string;
  }) => {
    if (unhidingAsset) {
      return;
    }

    setUnhidingAsset(canonicalAsset);

    try {
      await setAssetVisibility(canonicalAsset, "visible");
      setIsHiddenAssetsOpen(false);
      showToast(() => (
        <Notification
          variant="success"
          title={t("{{code}} unhidden", { code })}
        />
      ));
    } catch {
      showToast(() => (
        <Notification
          variant="error"
          title={t("Couldn’t unhide {{code}}", { code })}
        />
      ));
    } finally {
      setUnhidingAsset("");
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearchRef = useRef(
    debounce(
      async (
        { target: { value: asset } },
        publicKey: string,
        isAllowListVerificationEnabled: boolean,
        networkDetails: NetworkDetails,
      ) => {
        await fetchTokenData({
          publicKey,
          isAllowListVerificationEnabled,
          asset,
          isBlockaidEnabled: isBlockaidEnabledForNetwork(networkDetails),
          networkDetails,
        });
      },
      500,
    ),
  );
  const handleSearch = handleSearchRef.current;

  useEffect(() => {
    /* This effect is keyed off of changes to cachedBalances as this let's us update the UI when an asset is removed */
    const getData = async () => {
      await fetchData(true);
    };

    getData();
    // A successful add clears the stored hidden flag, so the map must follow
    // the balances or the re-added row would still offer Unhide.
    refreshHiddenAssets();
  }, [cachedBalances]);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = state.state === RequestState.ERROR;
  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: state.data.type,
      applicationState: state.data?.applicationState,
      state: state.state,
    });
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="SearchAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (
    !isMainnet(state.data.networkDetails) &&
    !isTestnet(state.data.networkDetails)
  ) {
    return <Navigate to={ROUTES.addAsset} />;
  }

  const data = state.data;
  const hasNoResults =
    !!tokenState.data &&
    !tokenState.data.verifiedAssetRows.length &&
    !tokenState.data.unverifiedAssetRows.length;

  return (
    <>
      <SubviewHeader title={t("Choose asset")} />

      <View.Content hasTopInput>
        <Formik initialValues={initialValues} onSubmit={() => {}}>
          {({ dirty }) => (
            <Form>
              <FormRows>
                <div className="SearchAsset__search-input">
                  <Field name="asset">
                    {({ field }: FieldProps) => (
                      <SearchInput
                        {...field}
                        id="asset"
                        data-testid="search-asset-input"
                        placeholder={t("Search for asset name")}
                        onChange={(e) => {
                          field.onChange(e);
                          handleSearch(
                            e,
                            data.publicKey,
                            data.isAllowListVerificationEnabled,
                            data.networkDetails,
                          );
                        }}
                      />
                    )}
                  </Field>
                  {/* Only before the user starts searching: once there is a
                      query, a hidden token that matches shows Unhide on its
                      own row instead. The sheet is a Radix dialog whose Root
                      lives inside HiddenAssets, so Radix's own Trigger can't
                      reach it from here; mirror what that trigger would emit. */}
                  {!dirty ? (
                    <button
                      type="button"
                      className="SearchAsset__show-hidden"
                      data-testid="hidden-assets-btn"
                      aria-haspopup="dialog"
                      aria-expanded={isHiddenAssetsOpen}
                      onClick={() => setIsHiddenAssetsOpen(true)}
                    >
                      {t("Show hidden")}
                    </button>
                  ) : null}
                </div>
                <SearchResults
                  isSearching={tokenState.state === "LOADING"}
                  resultsRef={ResultsRef}
                >
                  {tokenState.data &&
                  (tokenState.data.verifiedAssetRows.length ||
                    tokenState.data.unverifiedAssetRows.length) ? (
                    <ManageAssetRows
                      balances={data!.balances}
                      header={
                        tokenState.data.verifiedAssetRows.length > 1 ||
                        tokenState.data.unverifiedAssetRows.length > 1 ? (
                          <ResultsHeader />
                        ) : null
                      }
                      verifiedAssetRows={tokenState.data.verifiedAssetRows}
                      unverifiedAssetRows={tokenState.data.unverifiedAssetRows}
                      isVerifiedToken={tokenState.data.isVerifiedToken}
                      isVerificationInfoShowing={
                        tokenState.data.isVerificationInfoShowing
                      }
                      isAssetHidden={isAssetHidden}
                      onUnhideAsset={handleUnhide}
                      unhidingAsset={unhidingAsset}
                    />
                  ) : null}
                </SearchResults>
                {dirty && hasNoResults ? (
                  <div className="SearchAsset__copy">
                    {`${t("Unable to find your asset.")} ${t("Please check the asset code or address.")}`}
                  </div>
                ) : null}
              </FormRows>
            </Form>
          )}
        </Formik>
      </View.Content>
      <HiddenAssets
        isOpen={isHiddenAssetsOpen}
        onClose={() => setIsHiddenAssetsOpen(false)}
        balances={data?.balances}
        isAssetHidden={isAssetHidden}
        onUnhide={handleUnhide}
        unhidingAsset={unhidingAsset}
      />
    </>
  );
};
