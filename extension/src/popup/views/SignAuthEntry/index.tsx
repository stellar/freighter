import React, { useEffect, useRef, useState } from "react";
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
import {
  allAccountsSelector,
  confirmPassword,
  hasPrivateKeySelector,
  makeAccountActive,
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsExperimentalModeSelector } from "popup/ducks/settings";
import {
  ShowOverlayStatus,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { VerifyAccount } from "popup/views/VerifyAccount";

import { AppDispatch } from "popup/App";
import { EntryToSign, parsedSearchParam } from "helpers/urls";
import { Account } from "@shared/api/types";
import { AuthEntry } from "popup/components/signAuthEntry/AuthEntry";

export const SignAuthEntry = () => {
  const location = useLocation();
  const params = parsedSearchParam(location.search) as EntryToSign;

  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const isExperimentalModeEnabled = useSelector(
    settingsExperimentalModeSelector,
  );

  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  const [startedHwSign, setStartedHwSign] = useState(false);
  const [currentAccount, setCurrentAccount] = useState({} as Account);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);

  const allAccounts = useSelector(allAccountsSelector);
  const publicKey = useSelector(publicKeySelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // the public key the user had selected before starting this flow
  const defaultPublicKey = useRef(publicKey);
  const allAccountsMap = useRef({} as { [key: string]: Account });
  const accountToSign = params.accountToSign;

  const rejectAndClose = () => {
    dispatch(rejectAuthEntry());
    window.close();
  };

  const handleApprove = (signAndClose: () => Promise<void>) => async () => {
    setIsConfirming(true);

    if (hasPrivateKey) {
      await signAndClose();
    } else {
      setIsPasswordRequired(true);
    }

    setIsConfirming(false);
  };

  useEffect(() => {
    if (startedHwSign && hwStatus === ShowOverlayStatus.IDLE) {
      window.close();
    }
  }, [startedHwSign, hwStatus]);

  useEffect(() => {
    // handle auto selecting the right account based on `accountToSign`
    let autoSelectedAccountDetails;

    allAccounts.forEach((account) => {
      if (accountToSign) {
        // does the user have the `accountToSign` somewhere in the accounts list?
        if (account.publicKey === accountToSign) {
          // if the `accountToSign` is found, but it isn't active, make it active
          if (defaultPublicKey.current !== account.publicKey) {
            dispatch(makeAccountActive(account.publicKey));
          }

          // save the details of the `accountToSign`
          autoSelectedAccountDetails = account;
        }
      }

      // create an object so we don't need to keep iterating over allAccounts when we switch accounts
      allAccountsMap.current[account.publicKey] = account;
    });

    if (!autoSelectedAccountDetails) {
      setAccountNotFound(true);
    }
  }, [accountToSign, allAccounts, dispatch]);

  useEffect(() => {
    // handle any changes to the current acct - whether by auto select or manual select
    setCurrentAccount(allAccountsMap.current[publicKey] || ({} as Account));
  }, [allAccounts, publicKey]);

  const signAndClose = async () => {
    if (isHardwareWallet) {
      await dispatch(
        startHwSign({ transactionXDR: params.entry, shouldSubmit: false }),
      );
      setStartedHwSign(true);
    } else {
      await dispatch(signEntry());
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
          {!params.isDomainListedAllowed ? <FirstTimeWarningMessage /> : null}
          <div className="SignBlob__info">
            <Card variant={Card.variant.highlight}>
              <PunycodedDomain domain={params.url} isRow />
              <div className="SignBlob__subject">
                {t("is requesting approval to sign an authorization entry")}
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
