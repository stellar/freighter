import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Input, Loader } from "@stellar/design-system";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";
import { INDEXER_URL } from "@shared/constants/mercury";

import { FormRows } from "popup/basics/Forms";

import { ROUTES } from "popup/constants/routes";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isCustomNetwork, isMainnet, isTestnet } from "helpers/stellar";
import { getVerifiedTokens } from "popup/helpers/searchAsset";
import { isContractId } from "popup/helpers/soroban";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import IconUnverified from "popup/assets/icon-unverified.svg";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";
import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

const VerificationBadge = ({ isVerified }: { isVerified: boolean }) => {
  const { t } = useTranslation();

  return (
    <div className="AddToken__heading">
      {isVerified ? (
        <>
          <Icon.Verified />
          <span className="AddToken__heading__text">
            {t("Part of the asset list")}
          </span>
        </>
      ) : (
        <>
          <img src={IconUnverified} alt="unverified icon" />
          <span className="AddToken__heading__text">
            {t("Not part of the asset list")}
          </span>
        </>
      )}
    </div>
  );
};

export const AddToken = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const ResultsRef = useRef<HTMLDivElement>(null);

  interface TokenRecord {
    code: string;
    issuer: string;
    contract: string;
    org: string;
    domain: string;
    icon: string;
    decimals: number;
  }

  const handleSearch = useCallback(
    debounce(async ({ target: { value: contractId } }) => {
      if (!isContractId(contractId)) {
        setAssetRows([]);
        return;
      }
      setIsSearching(true);

      let verifiedTokens = [] as TokenRecord[];

      if (isMainnet(networkDetails) || isTestnet(networkDetails)) {
        verifiedTokens = await getVerifiedTokens({
          networkDetails,
          contractId,
          setIsSearching,
        });
      }

      setIsSearching(false);

      if (verifiedTokens.length) {
        setIsVerifiedToken(true);
        setAssetRows(
          verifiedTokens.map((record: TokenRecord) => ({
            code: record.code,
            issuer: record.contract,
            image: record.icon,
            domain: record.domain,
          })),
        );
      } else {
        // lookup contract
        setIsVerifiedToken(false);
        try {
          const tokenUrl = new URL(
            `${INDEXER_URL}/token-details/${contractId}`,
          );
          tokenUrl.searchParams.append("network", networkDetails.network);
          tokenUrl.searchParams.append("pub_key", publicKey);
          tokenUrl.searchParams.append(
            "soroban_url",
            networkDetails.sorobanRpcUrl!,
          );

          const res = await fetch(tokenUrl.href);
          const resJson = await res.json();

          setAssetRows([
            {
              code: resJson.symbol,
              issuer: contractId,
              domain: "",
              name: resJson.name,
            },
          ]);
        } catch (e) {
          setAssetRows([]);
          console.error(e);
        }
      }
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
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {({ dirty }) => (
        <Form
          onChange={(e) => {
            handleSearch(e);
            setHasNoResults(false);
          }}
        >
          <View data-testid="add-token">
            <SubviewHeader title={t("Add a Soroban token by ID")} />
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
                        placeholder={t("Token ID")}
                        {...field}
                        data-testid="search-asset-input"
                      />
                    )}
                  </Field>
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
                    <VerificationBadge isVerified={isVerifiedToken} />
                  ) : null}

                  {assetRows.length ? (
                    <ManageAssetRows
                      header={null}
                      assetRows={assetRows}
                      isVerifiedToken={isVerifiedToken}
                    />
                  ) : null}
                  {hasNoResults && dirty && !isSearching ? (
                    <div className="AddToken__not-found">Token not found</div>
                  ) : null}
                </div>
              </FormRows>
            </View.Content>
          </View>
        </Form>
      )}
    </Formik>
  );
};
