import React, { useState } from "react";
import { Button, Input, InfoBlock } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";

// import { ROUTES } from "popup/constants/routes";

import { FormRows } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
} from "popup/ducks/transactionSubmission";

// import { navigateTo } from "popup/helpers/navigate";

import "./styles.scss";

interface FormValues {
  assetDomain: string;
}
const initialValues: FormValues = {
  assetDomain: "",
};

type CURRENCIES = { code: string; issuer: string; image?: string }[];

interface AssetDomainToml {
  CURRENCIES?: CURRENCIES;
  DOCUMENTATION?: { ORG_URL: string };
}

const Currencies = ({
  currencies,
  foundDomain,
}: {
  currencies: CURRENCIES;
  foundDomain: string;
}) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const dispatch: AppDispatch = useDispatch();

  const server = new StellarSdk.Server(networkDetails.networkUrl);

  const addTrustline = async (assetCode: string, assetIssuer: string) => {
    const transactionXDR = await server
      .loadAccount(publicKey)
      .then((sourceAccount: Account) => {
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: networkDetails.networkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.changeTrust({
              asset: new StellarSdk.Asset(assetCode, assetIssuer),
            }),
          )
          .setTimeout(0)
          .build();

        return transaction.toXDR();
      });

    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      console.log(res.payload.signedTransaction);

      const signedXDR = StellarSdk.TransactionBuilder.fromXDR(
        res.payload.signedTransaction,
        networkDetails.networkPassphrase,
      );

      console.log(signedXDR);

      const submitResp = await dispatch(
        submitFreighterTransaction({
          signedXDR,
          networkUrl: networkDetails.networkUrl,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        console.log(submitResp);
      }
    }
  };

  return (
    <>
      <div>Assets found in this domain</div>
      {currencies.map(({ code, image, issuer }) => (
        <div className="AddAsset__currencies">
          {image ? (
            <img
              className="AddAsset__currencies__icon"
              alt={`${code} icon`}
              src={image}
            />
          ) : (
            <div className="AddAsset__currencies__bullet" />
          )}
          <div className="AddAsset__currencies__code">
            {code}
            <div className="AddAsset__currencies__domain">
              {foundDomain.replace("https://", "").replace("www.", "")}
            </div>
          </div>
          <div className="add" onClick={() => addTrustline(code, issuer)}>
            Add
          </div>
        </div>
      ))}
    </>
  );
};

export const AddAsset = () => {
  const [currencies, setCurrencies] = useState([] as CURRENCIES);
  const [isCurrencyNotFound, setIsCurrencyNotFound] = useState(false);
  const [foundDomain, setFoundDomain] = useState("");

  const handleSubmit = async (values: FormValues) => {
    setIsCurrencyNotFound(false);
    setCurrencies([]);

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
      setCurrencies(assetDomainToml.CURRENCIES);
      console.log(assetDomainToml);
      setFoundDomain(assetDomainToml.DOCUMENTATION?.ORG_URL || "");
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ dirty, errors, isSubmitting, isValid, touched }) => (
        <>
          <Form>
            <div className="AddAsset">
              <PopupWrapper>
                <SubviewHeader title="Add Another Asset" />
                <FormRows>
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
                  <Button
                    fullWidth
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={!(dirty && isValid)}
                  >
                    Search
                  </Button>
                </FormRows>
              </PopupWrapper>
            </div>
          </Form>
          <div className="AddAsset__bottom">
            {isCurrencyNotFound ? (
              <InfoBlock>Currency not found</InfoBlock>
            ) : null}
            {currencies.length ? (
              <Currencies currencies={currencies} foundDomain={foundDomain} />
            ) : null}
            <InfoBlock>
              This will cost <strong>0.00001 XLM</strong>
            </InfoBlock>
          </div>
        </>
      )}
    </Formik>
  );
};
