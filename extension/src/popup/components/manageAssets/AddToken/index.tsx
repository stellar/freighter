/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Input, Link, Loader } from "@stellar/design-system";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";
import { getName, getSymbol } from "@shared/helpers/soroban/token";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { getTokenDetails } from "@shared/api/internal";
import {
  buildSorobanServer,
  getNewTxBuilder,
} from "@shared/helpers/soroban/server";

import { FormRows } from "popup/basics/Forms";

import { publicKeySelector } from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import { isMainnet, isTestnet } from "helpers/stellar";
import {
  getVerifiedTokens,
  getNativeContractDetails,
  VerifiedTokenRecord,
} from "popup/helpers/searchAsset";
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

const VerificationBadge = ({
  isVerified,
  verifiedLists,
}: {
  isVerified: boolean;
  verifiedLists: string[];
}) => {
  const { t } = useTranslation();
  const linkUrl = "";

  return (
    <div className="AddToken__heading" data-testid="add-token-verification">
      {isVerified ? (
        <>
          <Icon.Verified />
          <span className="AddToken__heading__text">
            {t("This asset is part of the asset lists")}{" "}
            {verifiedLists.join(", ")}
          </span>
        </>
      ) : (
        <>
          <img src={IconUnverified} alt="unverified icon" />
          <span className="AddToken__heading__text">
            {t("This asset is not part of")}{" "}
            <Link
              variant="secondary"
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
            >
              Stellar Expert's top 50 assets list
            </Link>
            .{" "}
            <Link variant="secondary" href="https://www.freighter.app/faq">
              {t("Learn more")}
            </Link>
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
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] = useState(
    false,
  );
  const [verifiedLists, setVerifiedLists] = useState([] as string[]);
  const { assetsLists } = useSelector(settingsSelector);

  const ResultsRef = useRef<HTMLDivElement>(null);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearch = useCallback(
    debounce(async ({ target: { value: contractId } }) => {
      if (!isContractId(contractId as string)) {
        setAssetRows([]);
        return;
      }

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

      if (isCustomNetwork(networkDetails)) {
        if (!networkDetails.sorobanRpcUrl) {
          setAssetRows([]);
        } else {
          const server = buildSorobanServer(networkDetails.sorobanRpcUrl);
          const name = await getName(
            contractId,
            server,
            await getNewTxBuilder(publicKey, networkDetails, server),
          );
          const symbol = await getSymbol(
            contractId,
            server,
            await getNewTxBuilder(publicKey, networkDetails, server),
          );

          setAssetRows([
            {
              code: symbol,
              issuer: contractId,
              domain: "",
              name,
            },
          ]);
        }
        setIsSearching(false);
        return;
      }

      if (isAllowListVerificationEnabled) {
        // usual binary case of a token being verified or unverified
        verifiedTokens = await getVerifiedTokens({
          networkDetails,
          contractId,
          setIsSearching,
          assetsLists,
        });

        console.log(verifiedTokens);

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
            // lookup contract
            setIsVerifiedToken(false);
            const tokenDetailsResponse = await getTokenDetails({
              contractId,
              publicKey,
              networkDetails,
            });
            if (!tokenDetailsResponse) {
              throw new Error(contractId);
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
          }
        } catch (e) {
          setAssetRows([]);
          captureException(
            `Failed to fetch token details - ${JSON.stringify(e)}`,
          );
          console.error(e);
        }
      }

      setIsVerificationInfoShowing(isAllowListVerificationEnabled);

      setIsSearching(false);
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  useEffect(() => {
    setIsVerificationInfoShowing(isAllowListVerificationEnabled);
  }, [isAllowListVerificationEnabled]);

  return (
    // eslint-disable-next-line
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {({ dirty }) => (
        <Form
          onChange={(e) => {
            handleSearch(e);
            setHasNoResults(false);
          }}
        >
          <React.Fragment>
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
                        data-testid="search-token-input"
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
                  {assetRows.length && isVerificationInfoShowing ? (
                    <VerificationBadge
                      isVerified={isVerifiedToken}
                      verifiedLists={verifiedLists}
                    />
                  ) : null}

                  {assetRows.length ? (
                    <ManageAssetRows
                      header={null}
                      assetRows={assetRows}
                      isVerifiedToken={
                        isVerifiedToken || !isVerificationInfoShowing
                      }
                    />
                  ) : null}
                  {hasNoResults && dirty && !isSearching ? (
                    <div className="AddToken__not-found">Token not found</div>
                  ) : null}
                </div>
              </FormRows>
            </View.Content>
          </React.Fragment>
        </Form>
      )}
    </Formik>
  );
};
/* eslint-enable @typescript-eslint/no-unsafe-argument */
