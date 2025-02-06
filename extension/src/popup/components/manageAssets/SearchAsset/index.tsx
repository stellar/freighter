import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Redirect } from "react-router-dom";
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
import { splitVerifiedAssetCurrency } from "popup/helpers/searchAsset";
import { isMainnet } from "helpers/stellar";
import { isAssetSuspicious } from "popup/helpers/blockaid";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
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
                tomlInfo: { image: string };
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
    // start with verified list, keep index across lists to know when to switch lists
    const fullList = [...verifiedAssetRows, ...unverifiedAssetRows];
    const firstNullSuspiciousIndex = fullList.findIndex(
      (r) => r.isSuspicious === null,
    );

    const isVerifiedListActive =
      firstNullSuspiciousIndex <= verifiedAssetRows.length;
    const activeList = isVerifiedListActive
      ? verifiedAssetRows
      : unverifiedAssetRows;

    const fetchBlockaidResults = async (url: URL) => {
      let blockaidScanResults: { [key: string]: BlockAidScanAssetResult } = {};
      try {
        const response = await fetch(url.href);
        const data = await response.json();
        blockaidScanResults = data.data.results;
      } catch (e) {
        console.error(e);
      }

      // take our scanned assets and update the assetRows with the new isSuspicious values
      const assetRowsAddendum = activeList
        .slice(
          firstNullSuspiciousIndex,
          firstNullSuspiciousIndex + MAX_ASSETS_TO_SCAN,
        )
        .map((row) => {
          const assetId = `${row.code}-${row.issuer}`;
          return {
            ...row,
            isSuspicious: blockaidScanResults[assetId]
              ? isAssetSuspicious(blockaidScanResults[assetId])
              : row.isSuspicious,
          };
        });

      // insert our newly scanned rows into the existing data
      if (isVerifiedListActive) {
        setVerifiedAssetRows([
          ...verifiedAssetRows.slice(0, firstNullSuspiciousIndex),
          ...assetRowsAddendum,
          ...verifiedAssetRows.slice(
            firstNullSuspiciousIndex + MAX_ASSETS_TO_SCAN,
          ),
        ]);
      } else {
        setUnverifiedAssetRows([
          ...unverifiedAssetRows.slice(0, firstNullSuspiciousIndex),
          ...assetRowsAddendum,
          ...unverifiedAssetRows.slice(
            firstNullSuspiciousIndex + MAX_ASSETS_TO_SCAN,
          ),
        ]);
      }

      return blockaidScanResults;
    };

    // if there are any assets with "null" (meaning we haven't scanned some assets yet), scan the next batch
    if (
      fullList.length &&
      isMainnet(networkDetails) &&
      firstNullSuspiciousIndex !== -1
    ) {
      const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);

      // grab the next section of assets to scan
      activeList
        .slice(
          firstNullSuspiciousIndex,
          firstNullSuspiciousIndex + MAX_ASSETS_TO_SCAN,
        )
        .forEach((row) => {
          if (row.code && row.issuer && row.isSuspicious === null) {
            url.searchParams.append("asset_ids", `${row.code}-${row.issuer}`);
          }
        });

      fetchBlockaidResults(url);
    }
  }, [verifiedAssetRows, unverifiedAssetRows, networkDetails]);

  if (isCustomNetwork(networkDetails)) {
    return <Redirect to={ROUTES.addAsset} />;
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
        {/* eslint-disable-next-line @typescript-eslint/no-empty-function */}
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