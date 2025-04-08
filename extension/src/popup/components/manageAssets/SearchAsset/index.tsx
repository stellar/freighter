import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { Notification } from "@stellar/design-system";
import { isCustomNetwork } from "@shared/helpers/stellar";

import { FormRows } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isMainnet, isTestnet } from "helpers/stellar";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetNotifcation } from "popup/components/AssetNotification";
import { View } from "popup/basics/layout/View";

import { useGetBalances } from "helpers/hooks/useGetBalances";
import { publicKeySelector } from "popup/ducks/accountServices";

import { ManageAssetRows } from "../ManageAssetRows";
import { SearchInput, SearchCopy, SearchResults } from "../AssetResults";
import { useAssetLookup } from "./hooks/useAssetLookup";

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
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const [hasNoResults, setHasNoResults] = useState(false);
  const ResultsRef = useRef<HTMLDivElement>(null);

  // TODO: use this loading state
  const { state, fetchData } = useGetBalances(publicKey, networkDetails, {
    isMainnet: isMainnet(networkDetails),
    showHidden: true,
    includeIcons: false,
  });

  const { state: tokenState, fetchData: fetchTokenData } = useAssetLookup({
    publicKey,
    isAllowListVerificationEnabled:
      isMainnet(networkDetails) || isTestnet(networkDetails),
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearch = useCallback(
    debounce(async ({ target: { value: asset } }) => {
      await fetchTokenData({
        asset,
        isBlockaidEnabled: isMainnet(networkDetails),
      });
    }, 500),
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
  }, [networkDetails]);

  if (isCustomNetwork(networkDetails)) {
    return <Navigate to={ROUTES.addAsset} />;
  }

  console.log(tokenState);

  return (
    <View>
      <SubviewHeader title={t("Choose Asset")} />

      <View.Content hasTopInput>
        <Formik initialValues={initialValues} onSubmit={() => {}}>
          {({ dirty }) => (
            <Form
              onChange={(e) => {
                handleSearch(e);
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
                    tokenState.data.unverifiedAssetRows.length) &&
                  tokenState.data.isVerificationInfoShowing ? (
                    <AssetNotifcation
                      isVerified={tokenState.data.isVerifiedToken}
                    />
                  ) : null}

                  {tokenState.data &&
                  (tokenState.data.verifiedAssetRows.length ||
                    tokenState.data.unverifiedAssetRows.length) ? (
                    <ManageAssetRows
                      header={
                        tokenState.data.verifiedAssetRows.length > 1 ||
                        tokenState.data.unverifiedAssetRows.length > 1 ? (
                          <ResultsHeader />
                        ) : null
                      }
                      balances={state.data!}
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
    </View>
  );
};
