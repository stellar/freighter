import React, { useState } from "react";
import { Card, Icon } from "@stellar/design-system";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation, Trans } from "react-i18next";
import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { truncatedPublicKey } from "helpers/stellar";
import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { SlideupModal } from "popup/components/SlideupModal";
import {
  FirstTimeWarningMessage,
  WarningMessageVariant,
  WarningMessage,
} from "popup/components/WarningMessages";
import { signEntry, rejectAuthEntry } from "popup/ducks/access";
import { settingsExperimentalModeSelector } from "popup/ducks/settings";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import { VerifyAccount } from "popup/views/VerifyAccount";

import { AppDispatch } from "popup/App";
import { EntryToSign, parsedSearchParam } from "helpers/urls";
import { AuthEntry } from "popup/components/signAuthEntry/AuthEntry";

import "./styles.scss";
import { useSetupSigningFlow } from "popup/helpers/useSetupSigningFlow";

export const SignAuthEntry = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();
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
  } = useSetupSigningFlow(
    dispatch,
    rejectAuthEntry,
    signEntry,
    params.entry,
    accountToSign,
  );

  if (isHardwareWallet) {
    return (
      <ModalWrapper>
        <WarningMessage
          variant={WarningMessageVariant.warning}
          handleCloseClick={() => window.close()}
          isActive
          header={t("Unsupported signing method")}
        >
          <p>
            {t(
              "Hardware wallets are currently not supported for signing arbitrary blobs.",
            )}
          </p>
        </WarningMessage>
      </ModalWrapper>
    );
  }

  if (!params.url.startsWith("https") && !isExperimentalModeEnabled) {
    return (
      <ModalWrapper>
        <WarningMessage
          handleCloseClick={() => window.close()}
          isActive
          variant={WarningMessageVariant.warning}
          header={t("WEBSITE CONNECTION IS NOT SECURE")}
        >
          <p>
            <Trans domain={params.url}>
              The website <strong>{{ domain: params.url }}</strong> does not use
              an SSL certificate. For additional safety Freighter only works
              with websites that provide an SSL certificate.
            </Trans>
          </p>
        </WarningMessage>
      </ModalWrapper>
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
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
      <div className="SignAuthEntry" data-testid="SignAuthEntry">
        <ModalWrapper>
          <ModalHeader>
            <strong>{t("Confirm Data")}</strong>
          </ModalHeader>
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
            <Card variant={Card.variant.highlight}>
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
                <InfoBlock variant={InfoBlock.variant.warning}>
                  {t("The application is requesting a specific account")} (
                  {truncatedPublicKey(accountToSign)}),{" "}
                  {t(
                    "which is not available on Freighter. If you own this account, you can import it into Freighter to complete this request.",
                  )}
                </InfoBlock>
              </div>
            ) : null}
          </div>
          {/* Can replace AuthEntry once SignTx supports xdr classes */}
          {/* <Transaction
            flaggedKeys={{}}
            isMemoRequired={false}
            transaction={{ _operations: [{ auth: params.entry }] }}
          /> */}
          <AuthEntry authEntryXdr={params.entry} />
        </ModalWrapper>
        <ButtonsContainer>
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={() => rejectAndClose()}
          >
            {t("Reject")}
          </Button>
          <Button
            fullWidth
            isLoading={isConfirming}
            onClick={() => handleApprove()}
          >
            {t("Approve")}
          </Button>
        </ButtonsContainer>
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
      </div>
    </>
  );
};
