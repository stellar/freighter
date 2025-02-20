/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Networks, StellarToml, StrKey } from "stellar-sdk";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { FormRows } from "popup/basics/Forms";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isMainnet, isTestnet } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { isAssetSuspicious, scanAssetBulk } from "popup/helpers/blockaid";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { AssetNotifcation } from "popup/components/AssetNotification";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { useGetBalances } from "helpers/hooks/useGetBalances";

import { ManageAssetRows, ManageAssetCurrency } from "../ManageAssetRows";
import { SearchInput, SearchCopy, SearchResults } from "../AssetResults";

import "./styles.scss";

interface FormValues {
  asset: string;
}
const initialValues: FormValues = {
  asset: "",
};

interface AssetDomainToml {
  CURRENCIES?: StellarToml.Api.Currency[];
  DOCUMENTATION?: StellarToml.Api.Documentation;
  NETWORK_PASSPHRASE?: string;
}

export const AddAsset = () => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] =
    useState(false);
  const [verifiedLists, setVerifiedLists] = useState([] as string[]);

  // TODO: use this loading state
  const { state, fetchData } = useGetBalances(publicKey, networkDetails, {
    isMainnet: isMainnet(networkDetails),
    showHidden: true,
    includeIcons: false,
  });

  const ResultsRef = useRef<HTMLDivElement>(null);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  const { handleTokenLookup } = useTokenLookup({
    setAssetRows,
    setIsSearching,
    setIsVerifiedToken,
    setIsVerificationInfoShowing,
    setVerifiedLists,
  });

  const handleIssuerLookup = async (issuer: string) => {
    let assetDomainToml = {} as AssetDomainToml;
    const server = stellarSdkServer(
      networkDetails.networkUrl,
      networkDetails.networkPassphrase,
    );
    const acct = await server.loadAccount(issuer);
    const homeDomain = acct.home_domain || "";

    setIsSearching(true);

    try {
      assetDomainToml = await StellarToml.Resolver.resolve(homeDomain);
    } catch (e) {
      console.error(e);
    }

    if (!assetDomainToml.CURRENCIES) {
      setAssetRows([]);
    } else {
      const { networkPassphrase } = networkDetails;

      // check toml file for network passphrase
      const tomlNetworkPassphrase =
        assetDomainToml.NETWORK_PASSPHRASE || Networks.PUBLIC;

      type AssetRecord = StellarToml.Api.Currency & {
        domain: string;
      };

      if (tomlNetworkPassphrase === networkPassphrase) {
        const assetsToScan: string[] = [];
        const assetRecords: AssetRecord[] = [];
        assetDomainToml.CURRENCIES.forEach((currency) => {
          assetRecords.push({ ...currency, domain: homeDomain });
          assetsToScan.push(`${currency.code}-${currency.issuer}`);
        });
        const scannedAssets = await scanAssetBulk(assetsToScan, networkDetails);
        const scannedAssetRows = assetRecords.map((record: AssetRecord) => ({
          ...record,
          isSuspicious: isAssetSuspicious(
            scannedAssets.results[`${record.code}-${record.issuer}`],
          ),
        }));

        setAssetRows(scannedAssetRows);
        // no need for verification on classic assets
        setIsVerificationInfoShowing(false);
      } else {
        // otherwise, discount all found results
        setAssetRows([]);
      }
    }
    setIsSearching(false);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleSearch = useCallback(
    debounce(async ({ target: { value: contractId } }) => {
      if (isContractId(contractId)) {
        await handleTokenLookup(contractId);
      } else if (StrKey.isValidEd25519PublicKey(contractId)) {
        await handleIssuerLookup(contractId);
      } else {
        setAssetRows([]);
      }
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  useEffect(() => {
    setIsVerificationInfoShowing(isAllowListVerificationEnabled);
  }, [isAllowListVerificationEnabled]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <View>
            <SubviewHeader title={t("Add by address")} />
            <View.Content hasNoTopPadding>
              <FormRows>
                <div>
                  <Field name="asset">
                    {({ field }: FieldProps) => (
                      <SearchInput
                        id="asset"
                        placeholder={t(
                          "Enter issuer public key or contract ID",
                        )}
                        {...field}
                        data-testid="search-token-input"
                      />
                    )}
                  </Field>
                  <SearchCopy>
                    {t(
                      "Search issuer public key, classic assets, SAC assets, and TI assets",
                    )}
                  </SearchCopy>
                </div>
                <SearchResults
                  isSearching={isSearching}
                  resultsRef={ResultsRef}
                >
                  {assetRows.length && isVerificationInfoShowing ? (
                    <AssetNotifcation isVerified={isVerifiedToken} />
                  ) : null}

                  {assetRows.length ? (
                    <ManageAssetRows
                      header={null}
                      assetRows={assetRows}
                      balances={state.data!}
                      isVerifiedToken={isVerifiedToken}
                      isVerificationInfoShowing={isVerificationInfoShowing}
                      verifiedLists={verifiedLists}
                    />
                  ) : null}
                  {hasNoResults && dirty && !isSearching ? (
                    <div className="AddAsset__not-found">
                      {t("Asset not found")}
                    </div>
                  ) : null}
                </SearchResults>
              </FormRows>
            </View.Content>
          </View>
        </Form>
      )}
    </Formik>
  );
};
/* eslint-enable @typescript-eslint/no-unsafe-argument */
