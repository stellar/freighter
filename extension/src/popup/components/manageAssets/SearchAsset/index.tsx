import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { Button, Notification } from "@stellar/design-system";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { INDEXER_URL } from "@shared/constants/mercury";
import { BlockAidScanAssetResult } from "@shared/api/types";

import { FormRows } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { searchAsset } from "popup/helpers/searchAsset";
import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { isMainnet } from "helpers/stellar";
import { isAssetSuspicious } from "popup/helpers/blockaid";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { useGetBalances } from "helpers/hooks/useGetBalances";
import { publicKeySelector } from "popup/ducks/accountServices";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";
import { SearchInput, SearchCopy, SearchResults } from "../AssetResults";

import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

const MAX_ASSETS_TO_SCAN = 10;

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

  const { assetsLists } = useSelector(settingsSelector);
  const [verifiedAssetRows, setVerifiedAssetRows] = useState(
    [] as ManageAssetCurrency[],
  );
  const [unverifiedAssetRows, setUnverifiedAssetRows] = useState(
    [] as ManageAssetCurrency[],
  );

  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const ResultsRef = useRef<HTMLDivElement>(null);
  // TODO: use this loading state
  const { state, fetchData } = useGetBalances(publicKey, networkDetails, {
    isMainnet: isMainnet(networkDetails),
    showHidden: true,
    includeIcons: false,
  });

  interface AssetRecord {
    asset: string;
    domain?: string;
    tomlInfo?: { image: string };
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearch = useCallback(
    debounce(async ({ target: { value: asset } }) => {
      if (!asset) {
        setVerifiedAssetRows([]);
        setUnverifiedAssetRows([]);
        return;
      }
      setIsSearching(true);

      const resJson = await searchAsset({
        asset,
        networkDetails,
        onError: (e) => {
          console.error(e);
          setIsSearching(false);
          throw new Error(t("Unable to search for assets"));
        },
      });

      const assetRecords = resJson._embedded.records;

      let blockaidScanResults: { [key: string]: BlockAidScanAssetResult } = {};

      if (isMainnet(networkDetails)) {
        // scan the first few assets to see if they are suspicious
        // due to the length of time it takes to scan, we'll do it in consecutive chunks
        const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
        const firstSectionAssets = assetRecords.slice(0, MAX_ASSETS_TO_SCAN);
        firstSectionAssets.forEach((record: AssetRecord) => {
          const assetSplit = record.asset.split("-");
          if (assetSplit[0] && assetSplit[1]) {
            url.searchParams.append(
              "asset_ids",
              `${assetSplit[0]}-${assetSplit[1]}`,
            );
          }
        });

        try {
          const response = await fetch(url.href);
          const data = await response.json();
          blockaidScanResults = data.data.results;
        } catch (e) {
          console.error(e);
        }
      }

      setIsSearching(false);

      const { verifiedAssets, unverifiedAssets } =
        await splitVerifiedAssetCurrency({
          networkDetails,
          assets: assetRecords
            .filter(
              (record: AssetRecord) =>
                record.domain && /\S/.test(record.domain),
            )
            .map(
              (record: {
                asset: string;
                tomlInfo: { image: string; issuer: string; code: string };
                domain: string;
              }) => {
                const [code, issuer] = record.asset.split("-");
                const assetId = `${code}-${issuer}`;
                return {
                  code,
                  issuer,
                  image: record?.tomlInfo?.image,
                  domain: record.domain,
                  isSuspicious: blockaidScanResults[assetId]
                    ? isAssetSuspicious(blockaidScanResults[assetId])
                    : null,
                };
              },
            ),
          assetsListsDetails: assetsLists,
        });
      setVerifiedAssetRows(verifiedAssets);
      setUnverifiedAssetRows(unverifiedAssets);
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!verifiedAssetRows.length && !unverifiedAssetRows.length);
  }, [verifiedAssetRows, unverifiedAssetRows]);

  useEffect(() => {
    if (!isMainnet(networkDetails)) return;

    const fetchAndProcessAssets = async (isVerifiedList: boolean) => {
      const assetRows = isVerifiedList
        ? verifiedAssetRows
        : unverifiedAssetRows;

      // Find first asset that hasn't been scanned
      const firstNullIndex = assetRows.findIndex(
        (row) => row.isSuspicious === null,
      );
      if (firstNullIndex === -1) return; // All assets have been scanned

      // Get the next batch to scan
      const batchToProcess = assetRows.slice(
        firstNullIndex,
        firstNullIndex + MAX_ASSETS_TO_SCAN,
      );
      if (batchToProcess.length === 0) return;

      const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
      batchToProcess.forEach((row) => {
        if (row.code && row.issuer) {
          url.searchParams.append("asset_ids", `${row.code}-${row.issuer}`);
        }
      });

      try {
        const response = await fetch(url.href);
        const data = await response.json();
        const blockaidScanResults: { [key: string]: BlockAidScanAssetResult } =
          data.data.results;

        // Update the relevant asset list
        if (isVerifiedList) {
          setVerifiedAssetRows((prevRows) =>
            prevRows.map((row) => {
              if (row.isSuspicious !== null) return row; // Skip already processed rows
              const assetId = `${row.code}-${row.issuer}`;
              return {
                ...row,
                isSuspicious: blockaidScanResults[assetId]
                  ? isAssetSuspicious(blockaidScanResults[assetId])
                  : row.isSuspicious,
              };
            }),
          );
        } else {
          setUnverifiedAssetRows((prevRows) =>
            prevRows.map((row) => {
              if (row.isSuspicious !== null) return row; // Skip already processed rows
              const assetId = `${row.code}-${row.issuer}`;
              return {
                ...row,
                isSuspicious: blockaidScanResults[assetId]
                  ? isAssetSuspicious(blockaidScanResults[assetId])
                  : row.isSuspicious,
              };
            }),
          );
        }
      } catch (error) {
        console.error("Error scanning assets:", error);
      }
    };

    const processAssets = async () => {
      if (verifiedAssetRows.some((row) => row.isSuspicious === null)) {
        await fetchAndProcessAssets(true);
      } else if (unverifiedAssetRows.some((row) => row.isSuspicious === null)) {
        await fetchAndProcessAssets(false);
      }
    };

    processAssets();
  }, [verifiedAssetRows, unverifiedAssetRows, networkDetails]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
  }, []);

  if (isCustomNetwork(networkDetails)) {
    return <Navigate to={ROUTES.addAsset} />;
  }

  return (
    <View>
      <SubviewHeader title={t("Choose Asset")} />
      <View.Content
        hasNoTopPadding
        contentFooter={
          <div>
            <Link to={ROUTES.addAsset}>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                data-testid="SearchAsset__add-manually"
              >
                {t("Add manually")}
              </Button>
            </Link>
          </div>
        }
      >
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
                  isSearching={isSearching}
                  resultsRef={ResultsRef}
                >
                  {verifiedAssetRows.length || unverifiedAssetRows.length ? (
                    <ManageAssetRows
                      balances={state.data!}
                      soroswapTokens={state.data!.soroswapTokens}
                      header={
                        verifiedAssetRows.length > 1 ||
                        unverifiedAssetRows.length > 1 ? (
                          <ResultsHeader />
                        ) : null
                      }
                      verifiedAssetRows={verifiedAssetRows}
                      unverifiedAssetRows={unverifiedAssetRows}
                    />
                  ) : null}
                </SearchResults>
                {dirty && hasNoResults ? (
                  <div className="SearchAsset__copy">
                    {t(
                      "Can’t find the asset you’re looking for? Add it manually",
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
