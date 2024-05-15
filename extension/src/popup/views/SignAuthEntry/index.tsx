import React, { useState } from "react";
import { Button, Card, Icon, Notification } from "@stellar/design-system";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation, Trans } from "react-i18next";

import { truncatedPublicKey } from "helpers/stellar";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { SlideupModal } from "popup/components/SlideupModal";
import {
  FirstTimeWarningMessage,
  WarningMessageVariant,
  WarningMessage,
} from "popup/components/WarningMessages";
import { AuthEntry } from "popup/components/signAuthEntry/AuthEntry";
import { View } from "popup/basics/layout/View";
import { signEntry, rejectAuthEntry } from "popup/ducks/access";
import { settingsExperimentalModeSelector } from "popup/ducks/settings";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import { VerifyAccount } from "popup/views/VerifyAccount";

import { EntryToSign, parsedSearchParam } from "helpers/urls";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";

import "./styles.scss";

export const SignAuthEntry = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const location = useLocation();
  const { t } = useTranslation();
  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );

  const params = parsedSearchParam(location.search) as EntryToSign;
  const { accountToSign } = params;

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
  } = useSetupSigningFlow(
    rejectAuthEntry,
    signEntry,
    params.entry,
    accountToSign,
  );

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

  if (!params.url.startsWith("https") && !isExperimentalModeEnabled) {
    return (
      <WarningMessage
        handleCloseClick={() => window.close()}
        isActive
        variant={WarningMessageVariant.warning}
        header={t("WEBSITE CONNECTION IS NOT SECURE")}
      >
        <p>
          <Trans domain={params.url}>
            The website <strong>{params.url}</strong> does not use an SSL
            certificate. For additional safety Freighter only works with
            websites that provide an SSL certificate.
          </Trans>
        </p>
      </WarningMessage>
    );
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
          {!params.isDomainListedAllowed ? <FirstTimeWarningMessage /> : null}
          <div className="SignAuthEntry__info">
            <Card variant="secondary">
              <PunycodedDomain domain={params.url} isRow />
              <div className="SignAuthEntry__subject">
                {t("is requesting approval to sign an authorization entry")}
              </div>
              <div className="SignAuthEntry__approval">
                <div className="SignAuthEntry__approval__title">
                  {t("Approve using")}:
                </div>
                <div
                  className="SignAuthEntry__current-account"
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
                  <div className="SignAuthEntry__current-account__chevron">
                    <Icon.ChevronDown />
                  </div>
                </div>
              </div>
            </Card>
            {accountNotFound && accountToSign ? (
              <div className="SignAuthEntry__account-not-found">
                <Notification
                  variant="warning"
                  icon={<Icon.Warning />}
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
          {/* Can replace AuthEntry once SignTx supports xdr classes */}
          {/* <Transaction
            flaggedKeys={{}}
            isMemoRequired={false}
            transaction={{ _operations: [{ auth: params.entry }] }}
          /> */}
          <AuthEntry
            preimageXdr={params.entry}
            rejectAndClose={rejectAndClose}
          />
        </View.Content>
        <View.Footer isInline>
          <Button
            isFullWidth
            size="md"
            variant="tertiary"
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            isFullWidth
            size="md"
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
          <div className="SignAuthEntry__modal">
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
