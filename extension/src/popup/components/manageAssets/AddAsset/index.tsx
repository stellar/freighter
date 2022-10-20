import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Input } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import StellarSdk from "stellar-sdk";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { FormRows } from "popup/basics/Forms";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { CURRENCY } from "@shared/api/types";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface FormValues {
  assetDomain: string;
}
const initialValues: FormValues = {
  assetDomain: "",
};

interface AssetDomainToml {
  CURRENCIES?: CURRENCY[];
  DOCUMENTATION?: { ORG_URL: string };
}

interface AddAssetProps {
  setErrorAsset: (errorAsset: string) => void;
}

export const AddAsset = ({ setErrorAsset }: AddAssetProps) => {
  const { t } = useTranslation();
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isCurrencyNotFound, setIsCurrencyNotFound] = useState(false);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const handleSubmit = async (values: FormValues) => {
    setIsCurrencyNotFound(false);
    setAssetRows([]);

    const { assetDomain } = values;
    const assetDomainStr = assetDomain.startsWith("http")
      ? assetDomain
      : `https://${assetDomain}`;
    const assetDomainUrl = new URL(assetDomainStr.replace(/\/$/, ""));

    let assetDomainToml = {} as AssetDomainToml;

    try {
      assetDomainToml = await StellarSdk.StellarTomlResolver.resolve(
        assetDomainUrl.host,
      );
    } catch (e) {
      console.error(e);
    }

    if (!assetDomainToml.CURRENCIES) {
      setIsCurrencyNotFound(true);
    } else {
      const { networkUrl } = networkDetails;

      const server = new StellarSdk.Server(networkUrl);

      /* Let's test to make sure these assets exist on our current network.
        Unfortunately, the toml does not tell us what network this is being issued on
      */

      // take the first currency of the list
      const testCurrency = assetDomainToml.CURRENCIES[0];
      const testCurrencyIssuer = testCurrency.issuer;

      // load it's issuer account from the Horizon network we're configured to
      let account;
      try {
        account = await server.loadAccount(testCurrencyIssuer);
      } catch (e) {
        console.error(e);
        // the account may not even exist
        setIsCurrencyNotFound(true);
      }

      // if the account lists the same domain as the one we searched for, it exists on our network
      if (account.home_domain === assetDomain) {
        setAssetRows(
          assetDomainToml.CURRENCIES.map((currency) => ({
            ...currency,
            domain: assetDomainUrl.host,
          })),
        );
      } else {
        // otherwise, discount all found results
        setIsCurrencyNotFound(true);
      }
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ dirty, errors, isSubmitting, isValid, touched }) => (
        <Form>
          <div className="AddAsset">
            <SubviewHeader title={t("Add Another Asset")} />
            <FormRows>
              <div>
                <Field name="assetDomain">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="assetDomain"
                      placeholder={`${t("Asset domain")}, e.g. “centre.io”`}
                      error={
                        errors.assetDomain && touched.assetDomain
                          ? errors.assetDomain
                          : ""
                      }
                      {...field}
                    />
                  )}
                </Field>
              </div>
              <div className="AddAsset__results">
                {isCurrencyNotFound ? (
                  <InfoBlock>{t("Asset not found")}</InfoBlock>
                ) : null}
                {assetRows.length ? (
                  <>
                    <div className="AddAsset__title">
                      {t("Assets found in this domain")}
                    </div>
                    <div
                      className="AddAsset__results__rows"
                      ref={ManageAssetRowsWrapperRef}
                    >
                      <ManageAssetRows
                        assetRows={assetRows}
                        setErrorAsset={setErrorAsset}
                        maxHeight={
                          ManageAssetRowsWrapperRef?.current?.clientHeight ||
                          600
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
              <div>
                <Button
                  fullWidth
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!(dirty && isValid)}
                >
                  {t("Search")}
                </Button>
              </div>
            </FormRows>
          </div>
        </Form>
      )}
    </Formik>
  );
};
