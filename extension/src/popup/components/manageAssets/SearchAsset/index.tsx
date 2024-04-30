import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, Redirect } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";

import { Button, Input, Loader, Notification } from "@stellar/design-system";
import { isCustomNetwork } from "@shared/helpers/stellar";

import { FormRows } from "popup/basics/Forms";
import { ROUTES } from "popup/constants/routes";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { searchAsset } from "popup/helpers/searchAsset";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

const AddManualAssetLink = () => {
  const { t } = useTranslation();

  return (
    <div className="SearchAsset__copy">
      {t("Can’t find the asset you’re looking for?")}
      <div>
        <Link to={ROUTES.addAsset}>{t("Add it manually")}</Link>
      </div>
    </div>
  );
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
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
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

      setIsSearching(false);

      setAssetRows(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        resJson._embedded.records
          // only show records that have a domain and domains that don't have just whitespace
          .filter(
            (record: AssetRecord) => record.domain && /\S/.test(record.domain),
          )
          .map((record: AssetRecord) => {
            const assetSplit = record.asset.split("-");
            return {
              code: assetSplit[0],
              issuer: assetSplit[1],
              image: record?.tomlInfo?.image,
              domain: record.domain,
            };
          }),
      );
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  if (isCustomNetwork(networkDetails)) {
    return <Redirect to={ROUTES.addAsset} />;
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {({ dirty }) => (
        <Form
          onChange={(e) => {
            handleSearch(e);
            setHasNoResults(false);
          }}
        >
          <View>
            <SubviewHeader title={t("Choose Asset")} />
            <View.Content>
              <FormRows>
                <div>
                  <Field name="asset">
                    {({ field }: FieldProps) => (
                      <Input
                        fieldSize="md"
                        autoFocus
                        autoComplete="off"
                        id="asset"
                        placeholder={t("Search for an asset")}
                        {...field}
                        data-testid="search-asset-input"
                      />
                    )}
                  </Field>
                  <div className="SearchAsset__search-copy">
                    {t("powered by")}{" "}
                    <a
                      className="SearchAsset__search-copy"
                      href="https://stellar.expert"
                      target="_blank"
                      rel="noreferrer"
                    >
                      stellar.expert
                    </a>
                  </div>
                </div>
                <div
                  className={`SearchAsset__results ${
                    dirty ? "SearchAsset__results--active" : ""
                  }`}
                  ref={ResultsRef}
                >
                  {isSearching ? (
                    <div className="SearchAsset__loader">
                      <Loader />
                    </div>
                  ) : null}

                  {assetRows.length ? (
                    <ManageAssetRows
                      header={assetRows.length > 1 ? <ResultsHeader /> : null}
                      assetRows={assetRows}
                    >
                      <AddManualAssetLink />
                    </ManageAssetRows>
                  ) : null}
                  {hasNoResults && dirty && !isSearching ? (
                    <AddManualAssetLink />
                  ) : null}
                </div>
                {!dirty && hasNoResults ? (
                  <div>
                    <Link to={ROUTES.addAsset}>
                      <Button size="md" isFullWidth variant="secondary">
                        {t("Add asset manually")}
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </FormRows>
            </View.Content>
          </View>
        </Form>
      )}
    </Formik>
  );
};
