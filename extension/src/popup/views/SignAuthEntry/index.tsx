import React, { useEffect, useState } from "react";
import { Button, Card, Icon, Notification } from "@stellar/design-system";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { truncatedPublicKey } from "helpers/stellar";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { AccountList, OptionTag } from "popup/components/account/AccountList";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { SlideupModal } from "popup/components/SlideupModal";
import {
  DomainNotAllowedWarningMessage,
  WarningMessageVariant,
  WarningMessage,
  SSLWarningMessage,
} from "popup/components/WarningMessages";
import { AuthEntry } from "popup/components/signAuthEntry/AuthEntry";
import { View } from "popup/basics/layout/View";
import {
  isNonSSLEnabledSelector,
  settingsExperimentalModeSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import { VerifyAccount } from "popup/views/VerifyAccount";

import { EntryToSign, newTabHref, parsedSearchParam } from "helpers/urls";
import { useIsDomainListedAllowed } from "popup/helpers/useIsDomainListedAllowed";

import "./styles.scss";
import { useGetSignAuthEntryData } from "./hooks/useGetSignAuthEntryData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

export const SignAuthEntry = () => {
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

  const params = parsedSearchParam(location.search) as EntryToSign;
  const {
    accountToSign,
    networkPassphrase: entryNetworkPassphrase,
    domain,
  } = params;
  const { isDomainListedAllowed } = useIsDomainListedAllowed({
    domain,
  });

  const { state: signAuthEntryData, fetchData } = useGetSignAuthEntryData(
    params.entry,
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
    signAuthEntryData.state === RequestState.IDLE ||
    signAuthEntryData.state === RequestState.LOADING;

  if (isLoading) {
    return <Loading />;
  }

  const hasError = signAuthEntryData.state === RequestState.ERROR;
  if (signAuthEntryData.data?.type === AppDataType.REROUTE) {
    if (signAuthEntryData.data.shouldOpenTab) {
      openTab(newTabHref(signAuthEntryData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${signAuthEntryData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    !hasError &&
    signAuthEntryData.data.type === "resolved" &&
    (signAuthEntryData.data.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      signAuthEntryData.data.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const publicKey = signAuthEntryData.data?.publicKey!;
  const {
    allAccounts,
    accountNotFound,
    currentAccount,
    isConfirming,
    isPasswordRequired,
    handleApprove,
    hwStatus,
    rejectAndClose,
    setIsPasswordRequired,
    verifyPasswordThenSign,
    hardwareWalletType,
  } = signAuthEntryData.data?.signFlowState!;

  if (entryNetworkPassphrase && entryNetworkPassphrase !== networkPassphrase) {
    return (
      <WarningMessage
        variant={WarningMessageVariant.warning}
        handleCloseClick={() => window.close()}
        isActive
        header={`${t("Freighter is set to")} ${networkName}`}
      >
        <p>
          {t("The requester expects you to sign this auth entry on")}{" "}
          {entryNetworkPassphrase}.
        </p>
        <p>{t("Signing this transaction is not possible at the moment.")}</p>
      </WarningMessage>
    );
  }

  if (!params.url.startsWith("https") && !isNonSSLEnabled) {
    return <SSLWarningMessage url={params.url} />;
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
        <HardwareSign
          walletType={hardwareWalletType}
          isSignSorobanAuthorization
        />
      )}
      <React.Fragment>
        <View.AppHeader pageTitle={t("Confirm Entry")} />
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
          {!isDomainListedAllowed && (
            <DomainNotAllowedWarningMessage domain={domain} />
          )}
          <div className="SignAuthEntry__info">
            <Card variant="secondary">
              <PunycodedDomain domain={params.domain} isRow />
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
            data-testid="sign-auth-entry-approve-button"
            disabled={!isDomainListedAllowed}
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
