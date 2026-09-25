import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { toast } from "sonner";

import {
  getStellarExpertUrl,
  isStellarExpertSupported,
} from "popup/helpers/account";
import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SlideupModal } from "popup/components/SlideupModal";
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
import { navigateTo, openTab } from "popup/helpers/navigate";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { WalletRow } from "popup/components/account/WalletRow";
import { RenameWallet } from "popup/components/account/RenameWallet";
import { AddWallet } from "popup/components/account/AddWallet";

import { useGetWalletsData } from "./hooks/useGetWalletsData";

import "./styles.scss";

type SheetBody = "list" | "rename" | "add";

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountChanged: (updated: { publicKey: string }) => Promise<void>;
}

/**
 * The account switcher sheet: the active account's identity and actions, the
 * list of wallets, and Add wallet.
 *
 * Rename and Add wallet are body states rather than overlays. They used to be
 * absolutely-positioned layers over the full-screen Wallets view, which cannot
 * work here -- SlideupModal is a containing block for fixed descendants and
 * measures its height from in-flow content only, so an overlay would be clipped
 * and would collapse the card.
 */
export const AccountSheet = ({
  isOpen,
  onClose,
  onAccountChanged,
}: AccountSheetProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [body, setBody] = useState<SheetBody>("list");
  const [renameKey, setRenameKey] = useState("");
  const { state: dataState, fetchData } = useGetWalletsData();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const allAccounts = useSelector(allAccountsSelector);
  // Fallback for the error state, where the fetch yields no data but Redux
  // still holds the active account from the last successful load.
  const reduxPublicKey = useSelector(publicKeySelector);
  // Holds the currently-shown copy-toast's id (see copyAddress below for why
  // this can't be a stable id).
  const lastToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // Always reopen on the list; a sheet closed mid-rename would otherwise
    // come back to a stale form.
    setBody("list");
    setRenameKey("");
    const getData = async () => {
      await fetchData(true);
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isLoading =
    dataState.state === RequestState.IDLE ||
    dataState.state === RequestState.LOADING;
  const hasError = dataState.state === RequestState.ERROR;

  // No REROUTE or onboarding handling here, unlike the screen this replaces:
  // the sheet only ever mounts inside Home, which has already resolved both.
  // The reroute arm is still narrowed away rather than asserted past, so this
  // falls back to Redux if it ever does come back.
  const resolvedData =
    !hasError && dataState.data?.type === AppDataType.RESOLVED
      ? dataState.data
      : null;
  const activePublicKey = resolvedData?.publicKey || reduxPublicKey;
  const accountValue = resolvedData?.accountValue;
  const isFetchingTokenPrices = resolvedData?.isFetchingTokenPrices || false;
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

  const renderBody = () => {
    if (body === "rename") {
      // RenameWallet ships its own header and close, so it stands alone as the
      // whole body rather than sitting under the sheet header.
      return (
        <RenameWallet
          allAccounts={allAccounts}
          publicKey={renameKey}
          onSubmit={() => fetchData(true)}
          onClose={() => setBody("list")}
        />
      );
    }

    if (body === "add") {
      return (
        <>
          <div className="AccountSheet__header">
            <button
              className="AccountSheet__header__action"
              onClick={() => setBody("list")}
              aria-label={t("Back")}
              data-testid="account-sheet-add-back"
            >
              <Icon.ArrowLeft />
            </button>
            <span className="AccountSheet__title">{t("Add wallet")}</span>
            <button
              className="AccountSheet__header__action"
              onClick={onClose}
              aria-label={t("Close")}
              data-testid="AccountSheet__close"
            >
              <Icon.XClose />
            </button>
          </div>
          <AddWallet />
        </>
      );
    }

    return (
      <>
        <div className="AccountSheet__header">
          <button
            className="AccountSheet__header__action"
            onClick={() => navigateTo(ROUTES.settings, navigate)}
            aria-label={t("Settings")}
            data-testid="account-sheet-settings"
          >
            <Icon.Settings01 />
          </button>
          <button
            className="AccountSheet__header__action"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="AccountSheet__close"
          >
            <Icon.XClose />
          </button>
        </div>

        <div className="AccountSheet__identity" data-testid="wallets-header">
          <div className="AccountSheet__identity__identicon">
            <IdenticonImg publicKey={activePublicKey} />
          </div>
          {/* Name and address are one tight block; the 16px gap belongs
              between the identicon, this block, and the action row. */}
          <div className="AccountSheet__identity__text">
            <div className="AccountSheet__identity__name">
              {activeAccountName}
            </div>
            <div className="AccountSheet__identity__address">
              {truncatedPublicKey(activePublicKey)}
            </div>
          </div>
          <div className="AccountSheet__identity__actions">
            <button
              className="AccountSheet__identity__action"
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
              className="AccountSheet__identity__action"
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
                className="AccountSheet__identity__action"
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
              className="AccountSheet__identity__action"
              onClick={() => {
                setRenameKey(activePublicKey);
                setBody("rename");
              }}
              data-testid="wallets-header-edit-name"
              aria-label={t("Rename wallet")}
            >
              <Icon.Edit01 />
            </button>
          </div>
        </div>

        <div className="AccountSheet__divider" />

        <div className="AccountSheet__list">
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
                      // Close before refetching: Home renders <Loading /> while
                      // the new account loads, which unmounts this sheet
                      // anyway. Closing first keeps that from reading as a
                      // flicker.
                      onClose();
                      await onAccountChanged({ publicKey });
                    }}
                  />
                );
              },
            )
          )}
          {isLoading ? (
            <div className="AccountSheet__loader">
              <Loader size="1rem" />
            </div>
          ) : null}
        </div>

        <div className="AccountSheet__add-wallet">
          <Button
            size="xl"
            isRounded
            variant="tertiary"
            iconPosition="left"
            icon={<Icon.Plus />}
            onClick={() => setBody("add")}
            data-testid="add-wallet"
          >
            {t("Add wallet")}
          </Button>
        </div>
      </>
    );
  };

  return (
    <SlideupModal
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      ariaLabel={t("Wallets")}
    >
      <div className="AccountSheet" data-testid="AccountSheet">
        {renderBody()}
      </div>
    </SlideupModal>
  );
};
