import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Input, Notification } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import { Networks, StellarToml } from "stellar-sdk";
import { useTranslation } from "react-i18next";

import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";

import "./styles.scss";

interface FormValues {
  assetDomain: string;
}
const initialValues: FormValues = {
  assetDomain: "",
};

interface AssetDomainToml {
  CURRENCIES?: StellarToml.Api.Currency[];
  DOCUMENTATION?: StellarToml.Api.Documentation;
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
      assetDomainToml = await StellarToml.Resolver.resolve(assetDomainUrl.host);
    } catch (e) {
      console.error(e);
    }

    if (!assetDomainToml.CURRENCIES) {
      setIsCurrencyNotFound(true);
    } else {
      const { networkPassphrase } = networkDetails;

      // check toml file for network passphrase
      const tomlNetworkPassphrase =
        assetDomainToml.NETWORK_PASSPHRASE || Networks.PUBLIC;

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
          <React.Fragment>
            <SubviewHeader title={t("Add Another Asset")} />
            <View.Content>
              <FormRows>
                <div>
                  <Field name="assetDomain">
                    {({ field }: FieldProps) => (
                      <Input
                        fieldSize="md"
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
                    <Notification
                      variant="primary"
                      title={t("Asset not found")}
                    />
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
                        <ManageAssetRows assetRows={assetRows} />
                      </div>
                    </>
                  ) : null}
                </div>
              </FormRows>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                variant="primary"
                isFullWidth
                type="submit"
                isLoading={isSubmitting}
                disabled={!(dirty && isValid)}
              >
                {t("Search")}
              </Button>
            </View.Footer>
          </React.Fragment>
        </Form>
      )}
    </Formik>
  );
};
