import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import { Input, Loader } from "@stellar/design-system";
import debounce from "lodash/debounce";

import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { FormRows } from "popup/basics/Forms";

import { ROUTES } from "popup/constants/routes";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

interface SearchAssetProps {
  setErrorAsset: (errorAsset: string) => void;
}

const AddManualAssetLink = () => (
  <div className="SearchAsset__copy">
    Can’t find the asset you’re looking for?
    <div>
      <Link to={ROUTES.addAsset}>Add it manually</Link>
    </div>
  </div>
);

export const SearchAsset = ({ setErrorAsset }: SearchAssetProps) => {
  const { isTestnet } = useSelector(settingsNetworkDetailsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [maxHeight, setMaxHeight] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const ResultsRef = useRef<HTMLDivElement>(null);

  const ResultsHeader = () => (
    <div className="SearchAsset__InfoBlock">
      <InfoBlock>
        <div>
          Multiple assets have a similar code, please check the domain before
          adding.
          <div>
            <a
              href="https://developers.stellar.org/docs/issuing-assets/publishing-asset-info/"
              target="_blank"
              rel="noreferrer"
            >
              Learn more about assets domains
            </a>
          </div>
        </div>
      </InfoBlock>
    </div>
  );

  interface AssetRecord {
    asset: string;
    domain?: string;
    tomlInfo?: { image: string };
  }

  const handleSearch = useCallback(
    debounce(async ({ target: { value: asset } }) => {
      let res;
      if (!asset) {
        setAssetRows([]);
        return;
      }
      setIsSearching(true);

      try {
        res = await fetch(
          `https://api.stellar.expert/explorer/${
            isTestnet ? "testnet" : "public"
          }/asset?search=${asset}`,
        );
      } catch (e) {
        console.error(e);
        setIsSearching(false);
        throw new Error("Unable to search for assets");
      }

      const resJson = await res.json();

      setIsSearching(false);

      setAssetRows(
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
    setMaxHeight(ResultsRef?.current?.clientHeight || 600);
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  return (
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {({ dirty }) => (
        <Form
          onChange={(e) => {
            handleSearch(e);
            setHasNoResults(false);
          }}
        >
          <div className="SearchAsset">
            <SubviewHeader title="Choose Asset" />
            <FormRows>
              <div>
                <Field name="asset">
                  {({ field }: FieldProps) => (
                    <Input
                      autoFocus
                      autoComplete="off"
                      id="asset"
                      placeholder="Search for an asset"
                      {...field}
                    />
                  )}
                </Field>
                <div className="SearchAsset__search-copy">
                  powered by{" "}
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
                  <div className="SearchAsset__overlay">
                    <div className="SearchAsset__loader">
                      <Loader />
                    </div>
                  </div>
                ) : null}

                {assetRows.length ? (
                  <ManageAssetRows
                    header={assetRows.length > 1 ? <ResultsHeader /> : null}
                    assetRows={assetRows}
                    setErrorAsset={setErrorAsset}
                    maxHeight={maxHeight}
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
                    <Button fullWidth variant={Button.variant.tertiary}>
                      Add asset manually
                    </Button>
                  </Link>
                </div>
              ) : null}
            </FormRows>
          </div>
        </Form>
      )}
    </Formik>
  );
};
