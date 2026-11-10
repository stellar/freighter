import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SheetHeader, SheetHeaderAction } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { SlideupModal } from "popup/components/SlideupModal";
import { showToast } from "popup/basics/shadcn/Toast";
import {
  makeAccountActive,
  activeAccountSelector,
  allAccountsSelector,
  publicKeySelector,
  secretSourcesSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  clearBalancesForAccount,
  clearCollectiblesForAccount,
} from "popup/ducks/cache";
import { navigateTo } from "popup/helpers/navigate";
import {
  AccountGroup,
  groupAccountsBySource,
} from "popup/helpers/accountGroups";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { WalletRow } from "popup/components/account/WalletRow";

import { useGetWalletsData } from "./hooks/useGetWalletsData";

import "./styles.scss";

/*
  Groups the user collapsed, kept for as long as the popup stays open so the
  sheet reopens the way they left it. Module scope rather than component
  state because Home unmounts the sheet whenever it navigates away.
*/
const collapsedGroupKeys = new Set<string>();

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountChanged: (updated: { publicKey: string }) => Promise<void>;
}

/**
 * The account switcher sheet: the active account's identity, the wallets
 * grouped by what roots them, and Add wallet. Renaming and the explorer link
 * live in Edit account. Add wallet leaves the sheet for its own screen.
 */
export const AccountSheet = ({
  isOpen,
  onClose,
  onAccountChanged,
}: AccountSheetProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(collapsedGroupKeys),
  );
  const { state: dataState, fetchData } = useGetWalletsData();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const allAccounts = useSelector(allAccountsSelector);
  const secretSources = useSelector(secretSourcesSelector);
  // Fallback for the error state, where the fetch yields no data but Redux
  // still holds the active account from the last successful load.
  const reduxPublicKey = useSelector(publicKeySelector);
  const reduxActiveAccount = useSelector(activeAccountSelector);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
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
  // By id, not address: a hot account and a Ledger can share one.
  const activeAccountId =
    reduxActiveAccount?.publicKey === activePublicKey
      ? reduxActiveAccount.id
      : allAccounts.find((account) => account.publicKey === activePublicKey)
          ?.id || "";
  const activeAccountName =
    allAccounts.find((account) => account.id === activeAccountId)?.name || "";

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

  const toggleGroup = (key: string) => {
    if (collapsedGroupKeys.has(key)) {
      collapsedGroupKeys.delete(key);
    } else {
      collapsedGroupKeys.add(key);
    }
    setCollapsed(new Set(collapsedGroupKeys));
  };

  const selectAccount = async ({
    id,
    publicKey,
  }: {
    id: string;
    publicKey: string;
  }) => {
    await dispatch(makeAccountActive({ id }));
    dispatch(clearBalancesForAccount({ publicKey, networkDetails }));
    dispatch(clearCollectiblesForAccount({ publicKey, networkDetails }));
    // Close before refetching: Home renders <Loading /> while the new account
    // loads, which unmounts this sheet anyway. Closing first keeps that from
    // reading as a flicker.
    onClose();
    await onAccountChanged({ publicKey });
  };

  const renderRows = (accounts: AccountGroup["accounts"]) =>
    accounts.map(({ id, publicKey, name }) => (
      <WalletRow
        key={id}
        isFetchingTokenPrices={isFetchingTokenPrices}
        accountName={name}
        accountValue={accountValue ? accountValue[publicKey] : ""}
        publicKey={publicKey}
        isSelected={activeAccountId === id}
        onClick={() => selectAccount({ id, publicKey })}
      />
    ));

  const renderGroups = () => {
    const groups = groupAccountsBySource({
      accounts: allAccounts,
      sources: secretSources,
      t,
    });

    // One source has nothing to tell apart, and collapsing it would only hide
    // the whole list, so a single group renders flat.
    if (groups.length <= 1) {
      return renderRows(allAccounts);
    }

    return groups.map((group, i) => {
      const isExpanded = !collapsed.has(group.key);
      const listId = `AccountSheet-group-${group.key}`;

      return (
        <React.Fragment key={group.key}>
          {i > 0 ? <div className="AccountSheet__divider" /> : null}
          <section
            className="AccountSheet__group"
            data-testid="account-sheet-group"
          >
            <button
              type="button"
              className="AccountSheet__group__toggle"
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? listId : undefined}
              data-testid="account-sheet-group-toggle"
            >
              <span>{group.label}</span>
              <Icon.ChevronDown
                className={`AccountSheet__group__chevron${
                  isExpanded ? "" : " AccountSheet__group__chevron--collapsed"
                }`}
                aria-hidden="true"
              />
            </button>
            {isExpanded ? (
              <div id={listId} className="AccountSheet__group__rows">
                {renderRows(group.accounts)}
              </div>
            ) : null}
          </section>
        </React.Fragment>
      );
    });
  };

  // Each body supplies its pinned header and footer; the list between them is
  // what scrolls, under the sheet's edge fades, like mobile's wallets sheet.
  const renderSheet = () => {
    return {
      header: (
        <SheetHeader
          leading={
            <SheetHeaderAction
              onClick={() => navigateTo(ROUTES.settings, navigate)}
              aria-label={t("Settings")}
              data-testid="account-sheet-settings"
            >
              <Icon.Settings02 />
            </SheetHeaderAction>
          }
          onClose={onClose}
          closeTestId="AccountSheet__close"
        />
      ),
      footer: (
        <div className="AccountSheet__add-wallet">
          <Button
            size="xl"
            isRounded
            variant="tertiary"
            iconPosition="left"
            icon={<Icon.Plus />}
            onClick={() => navigateTo(ROUTES.addWallet, navigate)}
            data-testid="add-wallet"
          >
            {t("Add wallet")}
          </Button>
        </div>
      ),
      content: (
        <>
          <div className="AccountSheet__identity" data-testid="wallets-header">
            <div className="AccountSheet__identity__identicon">
              <IdenticonImg publicKey={activePublicKey} />
            </div>
            {/* Name and address are one tight block; the 16px gap belongs
              between the identicon and this block. */}
            <div className="AccountSheet__identity__text">
              <div className="AccountSheet__identity__name">
                {activeAccountName}
              </div>
              <div className="AccountSheet__identity__address">
                {truncatedPublicKey(activePublicKey)}
                {/* account.public_key_copied carries no source and never the
                  raw key. Emitted from copyAddress only once the clipboard
                  write succeeds, so failed copies aren't counted. */}
                <button
                  type="button"
                  className="AccountSheet__identity__copy"
                  onClick={copyAddress}
                  data-testid="wallets-header-copy"
                  aria-label={t("Copy wallet address")}
                >
                  <Icon.Copy01 />
                </button>
              </div>
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
              renderGroups()
            )}
            {isLoading ? (
              <div className="AccountSheet__loader">
                <Loader size="1rem" />
              </div>
            ) : null}
          </div>
        </>
      ),
    };
  };

  const { header, footer, content } = renderSheet();

  return (
    <SlideupModal
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      ariaLabel={t("Wallets")}
    >
      <SheetLayout header={header} footer={footer} data-testid="AccountSheet">
        <div className="AccountSheet">{content}</div>
      </SheetLayout>
    </SlideupModal>
  );
};
