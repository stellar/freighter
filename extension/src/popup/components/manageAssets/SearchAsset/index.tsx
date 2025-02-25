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
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { searchAsset } from "popup/helpers/searchAsset";
import { isMainnet } from "helpers/stellar";
import { isAssetSuspicious } from "popup/helpers/blockaid";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";
import { SearchInput, SearchCopy, SearchResults } from "../AssetResults";

import "./styles.scss";
import { useGetBalances } from "helpers/hooks/useGetBalances";
import { publicKeySelector } from "popup/ducks/accountServices";

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

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
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
        setAssetRows([]);
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

      setAssetRows(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        assetRecords
          // only show records that have a domain and domains that don't have just whitespace
          .filter(
            (record: AssetRecord) => record.domain && /\S/.test(record.domain),
          )
          .map((record: AssetRecord) => {
            const assetSplit = record.asset.split("-");
            const assetId = `${assetSplit[0]}-${assetSplit[1]}`;
            return {
              code: assetSplit[0],
              issuer: assetSplit[1],
              image: record?.tomlInfo?.image,
              domain: record.domain,
              isSuspicious: blockaidScanResults[assetId]
                ? isAssetSuspicious(blockaidScanResults[assetId])
                : null,
            };
          }),
      );
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  useEffect(() => {
    const firstNullSuspiciousIndex = assetRows.findIndex(
      (r) => r.isSuspicious === null,
    );

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
      const assetRowsAddendum = assetRows
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
      setAssetRows([
        ...assetRows.slice(0, firstNullSuspiciousIndex),
        ...assetRowsAddendum,
        ...assetRows.slice(firstNullSuspiciousIndex + MAX_ASSETS_TO_SCAN),
      ]);

      return blockaidScanResults;
    };

    // if there are any assets with "null" (meaning we haven't scanned some assets yet), scan the next batch
    if (
      assetRows.length &&
      isMainnet(networkDetails) &&
      firstNullSuspiciousIndex !== -1
    ) {
      const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);

      // grab the next section of assets to scan
      assetRows
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
  }, [assetRows, networkDetails]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  {assetRows.length ? (
                    <ManageAssetRows
                      balances={state.data!}
                      header={assetRows.length > 1 ? <ResultsHeader /> : null}
                      assetRows={assetRows}
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
