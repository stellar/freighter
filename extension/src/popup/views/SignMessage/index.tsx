import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Card, Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
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
import { MessageToSign, newTabHref, parsedSearchParam } from "helpers/urls";
import { truncatedPublicKey } from "helpers/stellar";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";

import "./styles.scss";
import { useGetSignMessageData } from "./hooks/useGetSignMessageData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

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
    url,
    networkPassphrase: blobNetworkPassphrase,
  } = message;

  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  const { state: signMessageState, fetchData } = useGetSignMessageData(
    message.message,
    accountToSign,
  );

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading =
    signMessageState.state === RequestState.IDLE ||
    signMessageState.state === RequestState.LOADING;

  if (isLoading) {
    return <Loading />;
  }

  const hasError = signMessageState.state === RequestState.ERROR;
  if (signMessageState.data?.type === AppDataType.REROUTE) {
    if (signMessageState.data.shouldOpenTab) {
      openTab(newTabHref(signMessageState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${signMessageState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    !hasError &&
    signMessageState.data.type === "resolved" &&
    (signMessageState.data.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      signMessageState.data.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const publicKey = signMessageState.data?.publicKey!;
  const {
    allAccounts,
    accountNotFound,
    currentAccount,
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    isHardwareWallet,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = signMessageState.data?.signFlowState!;

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
          {!isDomainListedAllowed && (
            <DomainNotAllowedWarningMessage domain={domain} />
          )}
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
            data-testid="sign-message-approve-button"
            disabled={!isDomainListedAllowed}
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
