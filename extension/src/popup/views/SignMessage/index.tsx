import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Card, Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { signBlob, rejectBlob } from "popup/ducks/access";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { Message } from "popup/components/signMessage";
import {
  isNonSSLEnabledSelector,
  settingsExperimentalModeSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import {
  WarningMessageVariant,
  WarningMessage,
  DomainNotAllowedWarningMessage,
  SSLWarningMessage,
} from "popup/components/WarningMessages";
import { View } from "popup/basics/layout/View";

import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";

import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { SlideupModal } from "popup/components/SlideupModal";

import { VerifyAccount } from "popup/views/VerifyAccount";
import { MessageToSign, parsedSearchParam } from "helpers/urls";
import { truncatedPublicKey } from "helpers/stellar";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";

import "./styles.scss";

export const SignMessage = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const location = useLocation();
  const { t } = useTranslation();
  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );
  const isNonSSLEnabled = useSelector(isNonSSLEnabledSelector);
  const { networkName, networkPassphrase } = useSelector(
    settingsNetworkDetailsSelector,
  );

  const message = parsedSearchParam(location.search) as MessageToSign;
  const {
    accountToSign,
    domain,
    isDomainListedAllowed,
    url,
    networkPassphrase: blobNetworkPassphrase,
  } = message;

  const {
    allAccounts,
    accountNotFound,
    currentAccount,
    isConfirming,
    isPasswordRequired,
    publicKey,
    handleApprove,
    hwStatus,
    isHardwareWallet,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = useSetupSigningFlow(rejectBlob, signBlob, message.message, accountToSign);

  if (isHardwareWallet) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={t("Unsupported signing method")}
      >
        <p>
          {t(
            "Signing arbitrary data with a hardware wallet is currently not supported.",
          )}
        </p>
      </WarningMessage>
    );
  }

  if (blobNetworkPassphrase && blobNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {t("The requester expects you to sign this message on")}{" "}
          {blobNetworkPassphrase}.
        </p>
        <p>{t("Signing this transaction is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!isDomainListedAllowed) {
    return <DomainNotAllowedWarningMessage domain={domain} />;
  }

  if (!url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={domain} />;
  }

  return isPasswordRequired ? (
    <VerifyAccount
      isApproval
      customBackAction={() => setIsPasswordRequired(false)}
      customSubmit={verifyPasswordThenSign}
    />
  ) : (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && hardwareWalletType && (
        <HardwareSign walletType={hardwareWalletType} />
      )}
      <React.Fragment>
        <View.AppHeader pageTitle={t("Confirm Data")} />
        <View.Content>
          {isExperimentalModeEnabled ? (
            <WarningMessage
              header="Experimental Mode"
              variant={WarningMessageVariant.default}
            >
              <p>
                {t(
                  "You are interacting with data that may be using untested and changing schemas. Proceed at your own risk.",
                )}
              </p>
            </WarningMessage>
          ) : null}
          <WarningMessage
            header="Unknown data"
            variant={WarningMessageVariant.highAlert}
          >
            <p>
              {t(
                "You are attempting to sign an arbitrary message. Please use extreme caution and understand the implications of signing this data.",
              )}
            </p>
          </WarningMessage>
          <div className="SignMessage__info">
            <Card variant="secondary">
              <PunycodedDomain domain={domain} isRow />
              <div className="SignMessage__subject">
                {t("is requesting approval to sign a message")}
              </div>
              <div className="SignMessage__approval">
                <div className="SignMessage__approval__title">
                  {t("Approve using")}:
                </div>
                <div
                  className="SignMessage__current-account"
                  onClick={() => setIsDropdownOpen(true)}
                >
                  <AccountListIdenticon
                    displayKey
                    accountName={currentAccount.name}
                    active
                    publicKey={currentAccount.publicKey}
                    setIsDropdownOpen={setIsDropdownOpen}
                  >
                    <OptionTag
                      hardwareWalletType={currentAccount.hardwareWalletType}
                      imported={currentAccount.imported}
                    />
                  </AccountListIdenticon>
                  <div className="SignMessage__current-account__chevron">
                    <Icon.ChevronDown />
                  </div>
                </div>
              </div>
            </Card>
            {accountNotFound && accountToSign ? (
              <div className="SignMessage__account-not-found">
                <Notification
                  variant="warning"
                  icon={<Icon.InfoOctagon />}
                  title={t("Account not available")}
                >
                  {t("The application is requesting a specific account")} (
                  {truncatedPublicKey(accountToSign)}),{" "}
                  {t(
                    "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this request.",
                  )}
                </Notification>
              </div>
            ) : null}
          </div>
          <Message message={message.message} />
        </View.Content>
        <View.Footer isInline>
          <Button
            size="md"
            isFullWidth
            variant="secondary"
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            size="md"
            isFullWidth
            variant="primary"
            isLoading={isConfirming}
            onClick={() => handleApprove()}
          >
            {t("Approve")}
          </Button>
        </View.Footer>
        <SlideupModal
          isModalOpen={isDropdownOpen}
          setIsModalOpen={setIsDropdownOpen}
        >
          <div className="SignMessage__modal">
            <AccountList
              allAccounts={allAccounts}
              publicKey={publicKey}
              setIsDropdownOpen={setIsDropdownOpen}
            />
          </div>
        </SlideupModal>
      </React.Fragment>
    </>
  );
};
