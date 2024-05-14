import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Input, Notification } from "@stellar/design-system";
import { Form, Formik, Field, FieldProps } from "formik";
import { Networks, StellarToml, StrKey } from "stellar-sdk";
import { useTranslation } from "react-i18next";
import { captureException } from "@sentry/browser";
import { getTokenDetails } from "@shared/api/internal";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsSelector } from "popup/ducks/settings";
import { isContractId } from "popup/helpers/soroban";
import { isMainnet, isTestnet } from "helpers/stellar";
import {
  getVerifiedTokens,
  getNativeContractDetails,
  VerifiedTokenRecord,
} from "popup/helpers/searchAsset";

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

type SearchType = "domain" | "contract" | "issuer";

const getSearchType = (query: string) => {
  let searchType: SearchType = "domain";
  try {
    Boolean(new URL(query));
    searchType = "domain";
  } catch (e) {
    console.error(e);
  }

  try {
    Boolean(new URL(query));
    searchType = "domain";
  } catch (e) {
    console.error(e);
  }

  if (isContractId(query)) {
    searchType = "contract";
  }

  if (StrKey.isValidEd25519PublicKey(query)) {
    searchType = "issuer";
  }

  console.log(searchType);
  return searchType;
};

export const AddAsset = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const { assetsLists, networkDetails } = useSelector(settingsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isCurrencyNotFound, setIsCurrencyNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] =
    useState(false);
  const [verifiedLists, setVerifiedLists] = useState([] as string[]);
  const ManageAssetRowsWrapperRef = useRef<HTMLDivElement>(null);

  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  const handleDomainSearch = async (assetDomain: string) => {
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

  const handleTokenLookup = async (contractId: string) => {
    // clear the UI while we work through the flow
    setIsSearching(true);
    setIsVerifiedToken(false);
    setIsVerificationInfoShowing(false);
    setAssetRows([]);

    const nativeContractDetails = getNativeContractDetails(networkDetails);
    let verifiedTokens = [] as VerifiedTokenRecord[];

    // step around verification for native contract and unverifiable networks

    if (nativeContractDetails.contract === contractId) {
      // override our rules for verification for XLM
      setIsVerificationInfoShowing(false);
      setAssetRows([
        {
          code: nativeContractDetails.code,
          issuer: contractId,
          domain: nativeContractDetails.domain,
        },
      ]);
      setIsSearching(false);
      return;
    }

    const tokenLookup = async () => {
      // lookup contract
      setIsVerifiedToken(false);
      let tokenDetailsResponse;

      try {
        tokenDetailsResponse = await getTokenDetails({
          contractId,
          publicKey,
          networkDetails,
        });
      } catch (e) {
        setAssetRows([]);
      }

      if (!tokenDetailsResponse) {
        setAssetRows([]);
      } else {
        setAssetRows([
          {
            code: tokenDetailsResponse.symbol,
            issuer: contractId,
            domain: "",
            name: tokenDetailsResponse.name,
          },
        ]);
      }
    };

    if (isAllowListVerificationEnabled) {
      // usual binary case of a token being verified or unverified
      verifiedTokens = await getVerifiedTokens({
        networkDetails,
        contractId,
        assetsLists,
      });

      try {
        if (verifiedTokens.length) {
          setIsVerifiedToken(true);
          setVerifiedLists(verifiedTokens[0].verifiedLists);
          setAssetRows(
            verifiedTokens.map((record: VerifiedTokenRecord) => ({
              code: record.code,
              issuer: record.contract,
              image: record.icon,
              domain: record.domain,
            })),
          );
        } else {
          // token not found on asset list, look up the details manually
          await tokenLookup();
        }
      } catch (e) {
        setAssetRows([]);
        captureException(
          `Failed to fetch token details - ${JSON.stringify(e)}`,
        );
        console.error(e);
      }
    } else {
      // Futurenet token lookup
      await tokenLookup();
    }

    setIsVerificationInfoShowing(isAllowListVerificationEnabled);
  };

  const handleIssuerLookup = async (issuer: string) => {
    let assetDomainToml = {} as AssetDomainToml;
    const server = stellarSdkServer(
      networkDetails.networkUrl,
      networkDetails.networkPassphrase,
    );
    const acct = await server.loadAccount(issuer);
    const homeDomain = acct.home_domain || "";

    try {
      assetDomainToml = await StellarToml.Resolver.resolve(homeDomain);
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
            domain: homeDomain,
          })),
        );
      } else {
        // otherwise, discount all found results
        setIsCurrencyNotFound(true);
      }
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setIsCurrencyNotFound(false);
    setAssetRows([]);

    const { assetDomain } = values;
    const searchType = getSearchType(assetDomain);

    if (searchType === "domain") {
      await handleDomainSearch(assetDomain);
    }

    if (searchType === "contract") {
      await handleTokenLookup(assetDomain);
    }

    if (searchType === "issuer") {
      await handleIssuerLookup(assetDomain);
    }
  };

  console.log(
    isSearching,
    isAllowListVerificationEnabled,
    isVerifiedToken,
    isVerificationInfoShowing,
    verifiedLists,
  );

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ dirty, errors, isSubmitting, isValid, touched }) => (
        <Form className="AddAsset__FormContainer">
          <View>
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
          </View>
        </Form>
      )}
    </Formik>
  );
};
