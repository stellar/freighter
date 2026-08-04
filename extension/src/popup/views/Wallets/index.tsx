import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, CopyText, Icon, Notification } from "@stellar/design-system";

import { isCustomNetwork } from "@shared/helpers/stellar";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import {
  makeAccountActive,
  allAccountsSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  clearBalancesForAccount,
  clearCollectiblesForAccount,
} from "popup/ducks/cache";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { useGetWalletsData } from "./hooks/useGetWalletsData";
import { Loading } from "popup/components/Loading";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { WalletRow } from "popup/components/account/WalletRow";
import { RenameWallet } from "popup/components/account/RenameWallet";
import { AddWallet } from "popup/components/account/AddWallet";

import "./styles.scss";

export const Wallets = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = React.useState("");
  const [isAddingWallet, setIsAddingWallet] = React.useState(false);
  const { state: dataState, fetchData } = useGetWalletsData();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const allAccounts = useSelector(allAccountsSelector);

  useEffect(() => {
    const getData = async () => {
      await fetchData(true);
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    dataState.state === RequestState.IDLE ||
    dataState.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  const hasError = dataState.state === RequestState.ERROR;

  if (dataState.data?.type === AppDataType.REROUTE) {
    if (dataState.data.shouldOpenTab) {
      openTab(newTabHref(dataState.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${dataState.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  const isFetchingTokenPrices = dataState.data?.isFetchingTokenPrices || false;

  if (!hasError) {
    reRouteOnboarding({
      type: dataState.data.type,
      applicationState: dataState.data?.applicationState,
      state: dataState.state,
    });
  }

  if (hasError) {
    return (
      <div>
        <Notification
          variant="error"
          title={t("Failed to fetch your wallets.")}
        >
          {t("Your wallets could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  const { publicKey: activePublicKey, accountValue } = dataState.data;
  const activeAccountName =
    allAccounts.find((account) => account.publicKey === activePublicKey)
      ?.name || "";

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Wallets")}
        customBackAction={() => navigateTo(ROUTES.account, navigate)}
        customBackIcon={<Icon.X />}
      />
      <View.Content
        hasNoTopPadding
        contentFooter={
          <div className="Wallets__add-wallet">
            <Button
              size="xl"
              isRounded
              variant="tertiary"
              iconPosition="left"
              icon={<Icon.PlusCircle />}
              onClick={() => setIsAddingWallet(true)}
              data-testid="add-wallet"
            >
              {t("Add a wallet")}
            </Button>
          </div>
        }
      >
        <div className="Wallets__header" data-testid="wallets-header">
          <div className="Wallets__header__identicon">
            <IdenticonImg publicKey={activePublicKey} />
          </div>
          <div className="Wallets__header__name">{activeAccountName}</div>
          <div className="Wallets__header__address">
            {truncatedPublicKey(activePublicKey)}
          </div>
          <div className="Wallets__header__actions">
            <button
              className="Wallets__header__action"
              onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
              data-testid="wallets-header-qr"
              aria-label={t("Show QR code")}
            >
              <Icon.QrCode01 />
            </button>
            <CopyText textToCopy={activePublicKey} doneLabel={t("Copied!")}>
              <button
                className="Wallets__header__action"
                onClick={() => emitMetric(METRIC_NAMES.accountPublicKeyCopied)}
                data-testid="wallets-header-copy"
                aria-label={t("Copy wallet address")}
              >
                <Icon.Copy01 />
              </button>
            </CopyText>
            {!isCustomNetwork(networkDetails) ? (
              <button
                className="Wallets__header__action"
                onClick={() => {
                  openTab(
                    `https://stellar.expert/explorer/${networkDetails.network.toLowerCase()}/account/${activePublicKey}`,
                  );
                  emitMetric(METRIC_NAMES.accountStellarExpertOpened);
                }}
                data-testid="wallets-header-explorer"
                aria-label={t("View on stellar.expert")}
              >
                <Icon.LinkExternal01 />
              </button>
            ) : null}
            <button
              className="Wallets__header__action"
              onClick={() => setIsEditingName(activePublicKey)}
              data-testid="wallets-header-edit-name"
              aria-label={t("Rename wallet")}
            >
              <Icon.Edit05 />
            </button>
          </div>
        </div>
        <div className="Wallets__divider" />
        <div className="Wallets__list">
          {allAccounts.map(
            ({ publicKey, name, imported, hardwareWalletType }) => {
              const isSelected = activePublicKey === publicKey;
              const totalValueUsd = accountValue ? accountValue[publicKey] : "";

              return (
                <WalletRow
                  key={publicKey}
                  isFetchingTokenPrices={isFetchingTokenPrices}
                  accountName={name}
                  accountValue={totalValueUsd}
                  isImported={imported}
                  hardwareWalletType={hardwareWalletType}
                  publicKey={publicKey}
                  isSelected={isSelected}
                  onClick={async (publicKey) => {
                    await dispatch(makeAccountActive(publicKey));
                    dispatch(
                      clearBalancesForAccount({ publicKey, networkDetails }),
                    );
                    dispatch(
                      clearCollectiblesForAccount({
                        publicKey,
                        networkDetails,
                      }),
                    );
                    navigateTo(ROUTES.account, navigate);
                  }}
                />
              );
            },
          )}
        </div>
      </View.Content>
      {isEditingName ? (
        <>
          <div className="RenameWalletWrapper">
            <RenameWallet
              allAccounts={allAccounts}
              publicKey={isEditingName}
              onSubmit={fetchData}
              onClose={() => setIsEditingName("")}
            />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingName("")}
            isActive={isEditingName.length > 0}
          />
        </>
      ) : null}
      {isAddingWallet ? (
        <div className="AddWalletWrapper">
          <AddWallet onBack={() => setIsAddingWallet(false)} />
        </div>
      ) : null}
    </React.Fragment>
  );
};
