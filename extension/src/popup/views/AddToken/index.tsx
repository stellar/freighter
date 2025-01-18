import { Button } from "@stellar/design-system";
import React from "react";
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

import "./styles.scss";

export const AddToken = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { networkName, networkPassphrase } = networkDetails;

  const params = parsedSearchParam(location.search) as TokenToAdd;
  const { url, contractId, networkPassphrase: entryNetworkPassphrase } = params;

  const {
    isConfirming,
    isPasswordRequired,
    setIsPasswordRequired,
    verifyPasswordThenAddToken,
    handleApprove,
    rejectAndClose,
  } = useSetupAddTokenFlow(rejectToken, addToken);

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
      <View.AppHeader pageTitle={t("ADD TOKEN")} />
      <View.Content>
        <WarningMessage
          header="Teeeeest Message"
          variant={WarningMessageVariant.default}
        >
          <p>
            {t(
              `You are trying to add this Contract Id: ${contractId}, with this NetworkPassphrase: ${networkPassphrase}`,
            )}
          </p>
        </WarningMessage>
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
