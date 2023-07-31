import React from "react";
import { Card, Icon } from "@stellar/design-system";
import { useTranslation, Trans } from "react-i18next";

import { truncatedPublicKey } from "helpers/stellar";
import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
import { signBlob } from "popup/ducks/access";
import { confirmPassword } from "popup/ducks/accountServices";

import {
  ButtonsContainer,
  ModalHeader,
  ModalWrapper,
} from "popup/basics/Modal";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import {
  WarningMessageVariant,
  WarningMessage,
  FirstTimeWarningMessage,
} from "popup/components/WarningMessages";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { SlideupModal } from "popup/components/SlideupModal";

import { VerifyAccount } from "popup/views/VerifyAccount";
import { AppDispatch } from "popup/App";
import {
  ShowOverlayStatus,
  startHwSign,
} from "popup/ducks/transactionSubmission";

import { Account } from "@shared/api/types";
import { BlobToSign } from "helpers/urls";

import "../styles.scss";
import { useDispatch } from "react-redux";
import { Blob } from "popup/components/signBlob";

interface SignBlobBodyProps {
  accountNotFound: boolean;
  allAccounts: Account[];
  blob: BlobToSign;
  currentAccount: Account;
  handleApprove: (signAndClose: () => Promise<void>) => () => Promise<void>;
  hwStatus: ShowOverlayStatus;
  isConfirming: boolean;
  isDropdownOpen: boolean;
  isExperimentalModeEnabled: boolean;
  isHardwareWallet: boolean;
  isPasswordRequired: boolean;
  publicKey: string;
  rejectAndClose: () => void;
  setIsDropdownOpen: (isRequired: boolean) => void;
  setIsPasswordRequired: (isRequired: boolean) => void;
  setStartedHwSign: (hasStarted: boolean) => void;
}

export const SignBlobBody = ({
  publicKey,
  allAccounts,
  isDropdownOpen,
  handleApprove,
  isConfirming,
  accountNotFound,
  rejectAndClose,
  currentAccount,
  setIsDropdownOpen,
  setIsPasswordRequired,
  isPasswordRequired,
  blob,
  isExperimentalModeEnabled,
  hwStatus,
  isHardwareWallet,
  setStartedHwSign,
}: SignBlobBodyProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const { accountToSign, domain, isDomainListedAllowed } = blob;

  const signAndClose = async () => {
    if (isHardwareWallet) {
      await dispatch(
        startHwSign({ transactionXDR: blob.blob, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {
      await dispatch(signBlob());
      window.close();
    }
  };

  const _handleApprove = handleApprove(signAndClose);

  const verifyPasswordThenSign = async (password: string) => {
    const confirmPasswordResp = await dispatch(confirmPassword(password));

    if (confirmPassword.fulfilled.match(confirmPasswordResp)) {
      await signAndClose();
    }
  };

  if (!domain.startsWith("https") && !isExperimentalModeEnabled) {
    return (
      <ModalWrapper>
        <WarningMessage
          handleCloseClick={() => window.close()}
          isActive
          variant={WarningMessageVariant.warning}
          header={t("WEBSITE CONNECTION IS NOT SECURE")}
        >
          <p>
            <Trans domain={domain}>
              The website <strong>{{ domain }}</strong> does not use an SSL
              certificate. For additional safety Freighter only works with
              websites that provide an SSL certificate.
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
      <div className="SignBlob" data-testid="SignBlob">
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
          <WarningMessage
            header="Unknown data"
            variant={WarningMessageVariant.highAlert}
          >
            <p>
              {t(
                "You are attempting to sign arbitrary data, please use extreme caution and understand the implications of signing this data.",
              )}
            </p>
          </WarningMessage>
          {!isDomainListedAllowed ? <FirstTimeWarningMessage /> : null}
          <div className="SignBlob__info">
            <Card variant={Card.variant.highlight}>
              <PunycodedDomain domain={domain} isRow />
              <div className="SignBlob__subject">
                {t("is requesting approval to sign a blob of data")}
              </div>
              <div className="SignBlob__approval">
                <div className="SignBlob__approval__title">
                  {t("Approve using")}:
                </div>
                <div
                  className="SignBlob__current-account"
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
                  <div className="SignBlob__current-account__chevron">
                    <Icon.ChevronDown />
                  </div>
                </div>
              </div>
            </Card>
            {accountNotFound && accountToSign ? (
              <div className="SignBlob__account-not-found">
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
          <Blob blob={blob.blob} />
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
            onClick={() => _handleApprove()}
          >
            {t("Approve")}
          </Button>
        </ButtonsContainer>
        <SlideupModal
          isModalOpen={isDropdownOpen}
          setIsModalOpen={setIsDropdownOpen}
        >
          <div className="SignBlob__modal">
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
