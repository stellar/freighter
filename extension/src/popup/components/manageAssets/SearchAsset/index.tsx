import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { Notification } from "@stellar/design-system";

import { FormRows } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import { isMainnet, isTestnet } from "helpers/stellar";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { ManageAssetRows } from "../ManageAssetRows";
import { SearchInput, SearchCopy, SearchResults } from "../AssetResults";
import { useAssetLookup } from "./hooks/useAssetLookup";
import { useGetSearchData } from "./hooks/useSearchData";
import { NetworkDetails } from "@shared/constants/stellar";
import { RequestState } from "helpers/hooks/fetchHookInterface";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

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

  const [hasNoResults, setHasNoResults] = useState(false);
  const ResultsRef = useRef<HTMLDivElement>(null);

  const { state, fetchData } = useGetSearchData({
    showHidden: true,
    includeIcons: false,
  });

  const { state: tokenState, fetchData: fetchTokenData } = useAssetLookup();

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearch = useCallback(
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
          isBlockaidEnabled: isMainnet(networkDetails),
          networkDetails,
        });
      },
      500,
    ),
    [],
  );

  useEffect(() => {
    setHasNoResults(
      !!tokenState.data &&
        !tokenState.data.verifiedAssetRows.length &&
        !tokenState.data.unverifiedAssetRows.length,
    );
  }, [tokenState]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };

    getData();
  }, []);

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
      window.close();
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

  return (
    <>
      <SubviewHeader title={t("Choose Asset")} />

      <View.Content hasTopInput>
        <Formik initialValues={initialValues} onSubmit={() => {}}>
          {({ dirty }) => (
            <Form
              onChange={(e) => {
                handleSearch(
                  e,
                  data.publicKey,
                  data.isAllowListVerificationEnabled,
                  data.networkDetails,
                );
                setHasNoResults(false);
              }}
            >
              <FormRows>
                <div className="SearchAsset__search-input">
                  <Field name="asset">
                    {({ field }: FieldProps) => (
                      <SearchInput
                        id="asset"
                        placeholder={t("Search for asset name")}
                        {...field}
                        data-testid="search-asset-input"
                      />
                    )}
                  </Field>
                  <SearchCopy>
                    {t("powered by")}{" "}
                    <a
                      href="https://stellar.expert"
                      target="_blank"
                      rel="noreferrer"
                    >
                      stellar.expert
                    </a>
                  </SearchCopy>
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
                    />
                  ) : null}
                </SearchResults>
                {dirty && hasNoResults ? (
                  <div className="SearchAsset__copy">
                    {t(
                      "Unable to find your asset. Please check the asset code or address.",
                    )}
                  </div>
                ) : null}
              </FormRows>
            </Form>
          )}
        </Formik>
      </View.Content>
    </>
  );
};
