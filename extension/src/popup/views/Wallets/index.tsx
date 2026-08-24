import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Icon, Notification } from "@stellar/design-system";
import { toast } from "sonner";

import {
  getStellarExpertUrl,
  isStellarExpertSupported,
} from "popup/helpers/account";

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
  publicKeySelector,
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
  // Fallback for the error state, where the fetch yields no data but Redux
  // still holds the active account from the last successful load.
  const reduxPublicKey = useSelector(publicKeySelector);
  // Holds the currently-shown copy-toast's id (see copyAddress below for why
  // this can't be a stable id). Declared here, above the early returns, so
  // this hook always runs regardless of which branch this render takes.
  const lastToastIdRef = useRef<string | number | null>(null);

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

  // Deliberately not an early return on `hasError`. `dataState.data` is null
  // in that state, but everything the chrome needs — the active key, the
  // account list — lives in Redux and survives a failed fetch. Returning the
  // notification on its own left the screen with no close button, no account
  // actions and no Add wallet, i.e. an error the user could not navigate out
  // of. The failure is scoped to the list instead, below.
  const resolvedData = hasError ? null : dataState.data;
  const activePublicKey = resolvedData?.publicKey || reduxPublicKey;
  const accountValue = resolvedData?.accountValue;
  const activeAccountName =
    allAccounts.find((account) => account.publicKey === activePublicKey)
      ?.name || "";

  // Dismiss-then-create with a fresh id, so repeated taps replace rather than
  // stack. Do NOT switch to a stable id: sonner's create() updates an existing
  // entry, but dismiss() never removes it, so after a swipe the update targets
  // an unmounted toast and nothing renders.
  const showToast = (render: (id: string | number) => React.ReactElement) => {
    if (lastToastIdRef.current !== null) {
      toast.dismiss(lastToastIdRef.current);
    }
    lastToastIdRef.current = toast.custom(render);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activePublicKey);
      emitMetric(METRIC_NAMES.accountPublicKeyCopied);
      showToast(() => (
        <Notification
          variant="success"
          title={t("Address {{address}} copied!", {
            address: truncatedPublicKey(activePublicKey),
          })}
        />
      ));
    } catch {
      showToast(() => (
        <Notification
          variant="error"
          title={t("Couldn’t copy your wallet address")}
        />
      ));
    }
  };

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
              icon={<Icon.Plus />}
              onClick={() => setIsAddingWallet(true)}
              data-testid="add-wallet"
            >
              {t("Add wallet")}
            </Button>
          </div>
        }
      >
        <div className="Wallets__header" data-testid="wallets-header">
          <div className="Wallets__header__identicon">
            <IdenticonImg publicKey={activePublicKey} />
          </div>
          {/* Name and address are one tight block; the 16px gap belongs
              between the identicon, this block, and the action row. */}
          <div className="Wallets__header__identity">
            <div className="Wallets__header__name">{activeAccountName}</div>
            <div className="Wallets__header__address">
              {truncatedPublicKey(activePublicKey)}
            </div>
          </div>
          <div className="Wallets__header__actions">
            <button
              className="Wallets__header__action"
              onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
              data-testid="wallets-header-qr"
              aria-label={t("Show QR code")}
            >
              <Icon.QrCode02 />
            </button>
            {/* account.public_key_copied carries no source and never the raw
                key. Emitted from copyAddress only once the clipboard write
                succeeds, so failed copies aren't counted. */}
            <button
              className="Wallets__header__action"
              onClick={copyAddress}
              data-testid="wallets-header-copy"
              aria-label={t("Copy wallet address")}
            >
              <Icon.Copy01 />
            </button>
            {/* Gated on stellar.expert's supported networks, not merely on
                "not a custom network": it has no Futurenet explorer, and
                experimental mode makes Futurenet the active network. */}
            {isStellarExpertSupported(networkDetails) ? (
              <button
                className="Wallets__header__action"
                onClick={() => {
                  openTab(
                    `${getStellarExpertUrl(networkDetails)}/account/${activePublicKey}`,
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
              <Icon.Edit01 />
            </button>
          </div>
        </div>
        <div className="Wallets__divider" />
        <div className="Wallets__list">
          {hasError ? (
            <Notification
              variant="error"
              title={t("Failed to fetch your wallets.")}
            >
              {t("Your wallets could not be fetched at this time.")}
            </Notification>
          ) : (
            allAccounts.map(
              ({ publicKey, name, imported, hardwareWalletType }) => {
                const isSelected = activePublicKey === publicKey;
                const totalValueUsd = accountValue
                  ? accountValue[publicKey]
                  : "";

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
            )
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
