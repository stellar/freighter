import React, { useState } from "react";
import { Button, Input, InfoBlock } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import StellarSdk from "stellar-sdk";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { FormRows } from "popup/basics/Forms";

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
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isCurrencyNotFound, setIsCurrencyNotFound] = useState(false);

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
      setAssetRows(
        assetDomainToml.CURRENCIES.map((currency) => ({
          ...currency,
          domain: assetDomainToml.DOCUMENTATION?.ORG_URL || "",
        })),
      );
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ dirty, errors, isSubmitting, isValid, touched }) => (
        <Form>
          <div className="AddAsset">
            <SubviewHeader title="Add Another Asset" />
            <FormRows>
              <div>
                <Field name="assetDomain">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="assetDomain"
                      placeholder="Asset Domain"
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
                  <InfoBlock>Currency not found</InfoBlock>
                ) : null}
                {assetRows.length ? (
                  <>
                    <div className="AddAsset__title">
                      Assets found in this domain
                    </div>
                    <ManageAssetRows
                      assetRows={assetRows}
                      setErrorAsset={setErrorAsset}
                    />
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
                  Search
                </Button>
              </div>
            </FormRows>
          </div>
        </Form>
      )}
    </Formik>
  );
};
