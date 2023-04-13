import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Input } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import * as StellarSdk from "stellar-sdk";
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
  NETWORK_PASSPHRASE?: string;
}

export const AddAsset = () => {
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
      const { networkPassphrase } = networkDetails;

      // check toml file for network passphrase
      const tomlNetworkPassphrase =
        assetDomainToml.NETWORK_PASSPHRASE || StellarSdk.Networks.PUBLIC;

      if (tomlNetworkPassphrase === networkPassphrase) {
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
