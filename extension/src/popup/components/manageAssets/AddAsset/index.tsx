/* eslint-disable @typescript-eslint/no-unsafe-argument */
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Networks, StellarToml, StrKey } from "stellar-sdk";
import { Formik, Form, Field, FieldProps } from "formik";
import debounce from "lodash/debounce";
import { useTranslation } from "react-i18next";
import { getTokenDetails } from "@shared/api/internal";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { isSacContractExecutable } from "@shared/helpers/soroban/token";

import { FormRows } from "popup/basics/Forms";
import { settingsNetworkDetailsSelector, settingsSelector } from "popup/ducks/settings";
import { isMainnet, isTestnet } from "helpers/stellar";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import {
  getAssetListForAsset,
  splitVerifiedAssetCurrency,
} from "popup/helpers/assetList";
import { isContractId } from "popup/helpers/soroban";
import {
  isAssetSuspicious,
  scanAsset,
  scanAssetBulk,
} from "popup/helpers/blockaid";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";

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
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [verifiedAssetRows, setVerifiedAssetRows] = useState(
    [] as ManageAssetCurrency[],
  );
  const [unverifiedAssetRows, setUnverifiedAssetRows] = useState(
    [] as ManageAssetCurrency[],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] =
    useState(false);
  const [verifiedLists, setVerifiedLists] = useState([] as string[]);
  const { assetsLists } = useSelector(settingsSelector);

  const ResultsRef = useRef<HTMLDivElement>(null);
  const isAllowListVerificationEnabled =
    isMainnet(networkDetails) || isTestnet(networkDetails);

  const handleTokenLookup = async (contractId: string) => {
    // clear the UI while we work through the flow
    setIsSearching(true);
    setIsVerifiedToken(false);
    setIsVerificationInfoShowing(false);
    setVerifiedAssetRows([]);
    setUnverifiedAssetRows([]);

    const nativeContractDetails = getNativeContractDetails(networkDetails);

    // step around verification for native contract and unverifiable networks

    if (nativeContractDetails.contract === contractId) {
      // override our rules for verification for XLM
      setIsVerificationInfoShowing(false);
      setVerifiedAssetRows([
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
        setVerifiedAssetRows([]);
        setUnverifiedAssetRows([]);
      }

      const isSacContract = await isSacContractExecutable(
        contractId,
        networkDetails,
      );

      if (!tokenDetailsResponse) {
        setVerifiedAssetRows([]);
        setUnverifiedAssetRows([]);
        return null;
      }

      const issuer = isSacContract
        ? tokenDetailsResponse.name.split(":")[1] || ""
        : contractId; // get the issuer name, if applicable ,
      const scannedAsset = await scanAsset(
        `${tokenDetailsResponse.symbol}-${issuer}`,
        networkDetails,
      );
      return {
        code: tokenDetailsResponse.symbol,
        contract: contractId,
        issuer,
        domain: "",
        name: tokenDetailsResponse.name,
        isSuspicious: isAssetSuspicious(scannedAsset),
      } as ManageAssetCurrency;
    };

    if (isAllowListVerificationEnabled) {
      // usual binary case of a token being verified or unverified
      const token = await tokenLookup();
      if (token) {
        const { verifiedAssets, unverifiedAssets } =
          await splitVerifiedAssetCurrency({
            networkDetails,
            assets: [token],
            assetsListsDetails: assetsLists,
          });
        setVerifiedAssetRows(verifiedAssets);
        setUnverifiedAssetRows(unverifiedAssets);

        const assetListsForToken = await getAssetListForAsset({
          asset: token,
          assetsListsDetails: assetsLists,
          networkDetails,
        });
        setVerifiedLists(assetListsForToken);
        if (assetListsForToken.length) {
          setIsVerifiedToken(true);
        }
      }
    } else {
      // Futurenet token lookup
      const token = await tokenLookup();
      setUnverifiedAssetRows(token ? [token] : []);
    }
    setIsSearching(false);
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

    setIsSearching(true);

    try {
      assetDomainToml = await StellarToml.Resolver.resolve(homeDomain);
    } catch (e) {
      console.error(e);
    }

    if (!assetDomainToml.CURRENCIES) {
      setVerifiedAssetRows([]);
      setUnverifiedAssetRows([]);
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
        const scannedAssetRows = assetRecords.map(
          (record: AssetRecord) =>
            ({
              ...record,
              isSuspicious: isAssetSuspicious(
                scannedAssets.results[`${record.code}-${record.issuer}`],
              ),
            } as ManageAssetCurrency),
        );

        const { verifiedAssets, unverifiedAssets } =
          await splitVerifiedAssetCurrency({
            networkDetails,
            assets: scannedAssetRows,
            assetsListsDetails: assetsLists,
          });
        setVerifiedAssetRows(verifiedAssets);
        setUnverifiedAssetRows(unverifiedAssets);
        // no need for verification on classic assets
        setIsVerificationInfoShowing(false);
      } else {
        // otherwise, discount all found results
        setVerifiedAssetRows([]);
        setUnverifiedAssetRows([]);
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
        setVerifiedAssetRows([]);
        setUnverifiedAssetRows([]);
      }
    }, 500),
    [],
  );

  useEffect(() => {
    setHasNoResults(!verifiedAssetRows.length && !unverifiedAssetRows.length);
  }, [verifiedAssetRows, unverifiedAssetRows]);

  useEffect(() => {
    setIsVerificationInfoShowing(isAllowListVerificationEnabled);
  }, [isAllowListVerificationEnabled]);

  const hasAssets = verifiedAssetRows.length || unverifiedAssetRows.length;

  return (
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
                  {hasAssets ? (
                    <ManageAssetRows
                      header={null}
                      verifiedAssetRows={verifiedAssetRows}
                      unverifiedAssetRows={unverifiedAssetRows}
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
