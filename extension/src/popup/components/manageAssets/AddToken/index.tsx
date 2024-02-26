import React, {
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { captureException } from "@sentry/browser";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Input, Link, Loader } from "@stellar/design-system";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";
import { INDEXER_URL } from "@shared/constants/mercury";
import { getName, getSymbol } from "@shared/helpers/soroban/token";
import { NetworkDetails } from "@shared/constants/stellar";

import { FormRows } from "popup/basics/Forms";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isCustomNetwork, isMainnet, isTestnet } from "helpers/stellar";
import {
  getVerifiedTokens,
  TokenRecord,
  searchTokenUrl,
} from "popup/helpers/searchAsset";
import { isContractId } from "popup/helpers/soroban";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import IconUnverified from "popup/assets/icon-unverified.svg";
import { SorobanContext } from "popup/SorobanContext";

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
  networkDetails,
}: {
  isVerified: boolean;
  networkDetails: NetworkDetails;
}) => {
  const { t } = useTranslation();
  const linkUrl = searchTokenUrl(networkDetails);

  return (
    <div className="AddToken__heading" data-testid="add-token-verification">
      {isVerified ? (
        <>
          <Icon.Verified />
          <span className="AddToken__heading__text">
            {t("This asset is part of")}{" "}
            <Link
              data-testid="add-token-verification-url"
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
  const ResultsRef = useRef<HTMLDivElement>(null);
  const sorobanClient = useContext(SorobanContext);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  const handleSearch = useCallback(
    debounce(async ({ target: { value: contractId } }) => {
      if (!isContractId(contractId)) {
        setAssetRows([]);
        return;
      }
      setIsSearching(true);

      let verifiedTokens = [] as TokenRecord[];

      if (isAllowListVerificationEnabled) {
        verifiedTokens = await getVerifiedTokens({
          networkDetails,
          contractId,
          setIsSearching,
        });
      }

      setIsSearching(false);

      try {
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
        } else if (isCustomNetwork(networkDetails)) {
          const name = await getName(
            contractId,
            sorobanClient.server,
            await sorobanClient.newTxBuilder(),
          );
          const symbol = await getSymbol(
            contractId,
            sorobanClient.server,
            await sorobanClient.newTxBuilder(),
          );

          setAssetRows([
            {
              code: symbol,
              issuer: contractId,
              domain: "",
              name,
            },
          ]);
        } else {
          // lookup contract
          setIsVerifiedToken(false);
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
          if (!res.ok) {
            throw new Error(JSON.stringify(resJson));
          } else {
            setAssetRows([
              {
                code: resJson.symbol,
                issuer: contractId,
                domain: "",
                name: resJson.name,
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
    }, 500),
    [],
  );

  useEffect(() => {
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
                  {assetRows.length && isAllowListVerificationEnabled ? (
                    <VerificationBadge
                      isVerified={isVerifiedToken}
                      networkDetails={networkDetails}
                    />
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
