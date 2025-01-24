import { Button, Text } from "@stellar/design-system";
import React, { useEffect, useState } from "react";
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
import { useTokenLookup } from "popup/helpers/useTokenLookup";
import { isContractId } from "popup/helpers/soroban";

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
  });

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
        <Text as="p" size="lg">
          {t("Test Add Token")}
        </Text>

        <Text as="p" size="md">
          {t(
            `You are trying to add this Contract Id: ${contractId}, with this NetworkPassphrase: ${networkPassphrase}`,
          )}
        </Text>

        <Text as="p" size="sm">
          {assetCurrency &&
            !isSearching &&
            t(
              `You are trying to add this Token: ${JSON.stringify(
                assetCurrency,
              )}`,
            )}
          {!assetCurrency && isSearching && t("Loading...")}
          {!assetCurrency && !isSearching && t("Asset not found")}
        </Text>
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
          disabled={!assetCurrency}
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
