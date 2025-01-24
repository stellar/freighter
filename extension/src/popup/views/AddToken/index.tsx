import { Button, Text } from "@stellar/design-system";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { parsedSearchParam, TokenToAdd } from "helpers/urls";

import { rejectToken, addToken } from "popup/ducks/access";
import {
  isNonSSLEnabledSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { useSetupAddTokenFlow } from "popup/helpers/useSetupAddTokenFlow";
import {
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
} from "popup/components/WarningMessages";
import { VerifyAccount } from "popup/views/VerifyAccount";
import { View } from "popup/basics/layout/View";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { SearchResults } from "popup/components/manageAssets/AssetResults";
import { AssetNotifcation } from "popup/components/AssetNotification";
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { isContractId } from "popup/helpers/soroban";

import "./styles.scss";

export const AddToken = () => {
  const location = useLocation();
  const params = parsedSearchParam(location.search) as TokenToAdd;
  const { url, contractId, networkPassphrase: entryNetworkPassphrase } = params;

  const { t } = useTranslation();
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { networkName, networkPassphrase } = networkDetails;

  const [assetRows, setAssetRows] = useState([] as ManageAssetCurrency[]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [isVerifiedToken, setIsVerifiedToken] = useState(false);
  const [isVerificationInfoShowing, setIsVerificationInfoShowing] =
    useState(false);
  const [_, setVerifiedLists] = useState([] as string[]);

  const ResultsRef = useRef<HTMLDivElement>(null);

  const assetCurrency: ManageAssetCurrency | undefined = assetRows[0];
  const assetCode = assetCurrency?.code || "";
  const assetIssuer = assetCurrency?.issuer || "";

  const {
    isConfirming,
    isPasswordRequired,
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    rejectAndClose,
  } = useSetupAddTokenFlow({
    rejectToken,
    addToken,
    assetCode,
    assetIssuer,
  });

  const { handleTokenLookup } = useTokenLookup({
    setAssetRows,
    setIsSearching,
    setIsVerifiedToken,
    setIsVerificationInfoShowing,
    setVerifiedLists,
  });

  useEffect(() => {
    setHasNoResults(!assetRows.length);
  }, [assetRows]);

  useEffect(() => {
    if (!isContractId(contractId)) {
      return;
    }

    handleTokenLookup(contractId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, handleTokenLookup]);

  if (entryNetworkPassphrase && entryNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {t("The token you’re trying to add is on")} {entryNetworkPassphrase}.
        </p>
        <p>{t("Adding this token is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={url} />;
  }

  if (isPasswordRequired) {
    return (
      <VerifyAccount
        isApproval
        customBackAction={() => setIsPasswordRequired(false)}
        customSubmit={verifyPasswordThenAddToken}
      />
    );
  }

  return (
    <React.Fragment>
      <View.Content>
        <Text as="h1" size="lg">
          {t("Test Add Token")}
        </Text>

        <Text as="h4" size="md">
          {t(
            `You are trying to add this Contract Id: ${contractId}, with this NetworkPassphrase: ${networkPassphrase}`,
          )}
        </Text>

        <Text as="h6" size="sm">
          {assetCurrency
            ? t(
                `You are trying to add this Token: ${JSON.stringify(
                  assetCurrency,
                )}`,
              )
            : t("Loading...")}
        </Text>

        <SearchResults isSearching={isSearching} resultsRef={ResultsRef}>
          {assetRows.length && isVerificationInfoShowing ? (
            <AssetNotifcation isVerified={isVerifiedToken} />
          ) : null}

          {hasNoResults && !isSearching ? (
            <Text as="p" size="md">
              {t("Asset not found")}
            </Text>
          ) : null}
        </SearchResults>
      </View.Content>

      <View.Footer isInline>
        <Button
          isFullWidth
          size="md"
          variant="tertiary"
          onClick={() => rejectAndClose()}
        >
          {t("Cancel")}
        </Button>
        <Button
          isFullWidth
          size="md"
          variant="primary"
          isLoading={isConfirming}
          onClick={() => handleApprove()}
        >
          {t("Add asset")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
