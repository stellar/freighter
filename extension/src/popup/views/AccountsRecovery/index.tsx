import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon, Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { Account } from "@shared/api/types";
import { ROUTES } from "popup/constants/routes";
import { closeWindow, navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { Loading } from "popup/components/Loading";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";

import "./styles.scss";

interface AccountGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  accounts: Account[];
}

/*
  Groups accounts by what roots them. Until accounts carry a source id, this
  is all the base branch can tell: every phrase-derived account comes from the
  wallet's one phrase, each imported account is its own secret key, and a
  hardware account is grouped by its device.
*/
export const groupAccounts = (
  accounts: Account[],
  t: (key: string, options?: Record<string, unknown>) => string,
): AccountGroup[] => {
  const derived = accounts.filter(
    (acct) => !acct.imported && !acct.hardwareWalletType,
  );
  const imported = accounts.filter(
    (acct) => acct.imported && !acct.hardwareWalletType,
  );
  const hardware = accounts.filter((acct) => !!acct.hardwareWalletType);

  const groups: AccountGroup[] = [];

  if (derived.length) {
    groups.push({
      key: "phrase-1",
      label: t("Recovery phrase {{number}}", { number: 1 }),
      icon: <Icon.Passcode />,
      accounts: derived,
    });
  }

  imported.forEach((acct, i) => {
    groups.push({
      key: `secret-key-${acct.publicKey}`,
      label:
        imported.length === 1
          ? t("Secret key")
          : t("Secret key {{number}}", { number: i + 1 }),
      icon: <Icon.Key02 />,
      accounts: [acct],
    });
  });

  if (hardware.length) {
    groups.push({
      key: "hardware",
      label: hardware[0].hardwareWalletType || t("Hardware wallet"),
      icon: <Icon.Wallet02 />,
      accounts: hardware,
    });
  }

  return groups;
};

export const AccountsRecovery = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, fetchData } = useGetWalletsData();

  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Balances arrive in batches after the first success, so only the very
  // first load shows the full-screen spinner.
  if (
    (state.state === RequestState.IDLE ||
      state.state === RequestState.LOADING) &&
    !state.data
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR || !state.data) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your wallets.")}
        >
          {t("Your wallets could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.applicationState,
    state: state.state,
  });

  const { publicKey: activePublicKey, allAccounts, accountValue } = state.data;
  const isFetchingTokenPrices = state.data.isFetchingTokenPrices;
  const groups = groupAccounts(allAccounts, t);

  const openEditAccount = (publicKey: string) =>
    navigateTo(
      ROUTES.editAccount,
      navigate,
      `?publicKey=${encodeURIComponent(publicKey)}`,
    );

  return (
    <React.Fragment>
      <SubviewHeader
        title={t("Accounts & recovery")}
        rightButton={
          <button
            type="button"
            className="AccountsRecovery__close"
            aria-label={t("Close")}
            onClick={() => navigateTo(ROUTES.account, navigate)}
          >
            <Icon.X />
          </button>
        }
      />
      <View.Content hasNoTopPadding>
        <div className="AccountsRecovery" data-testid="accounts-recovery">
          {groups.map((group, i) => (
            <React.Fragment key={group.key}>
              {i > 0 ? <div className="AccountsRecovery__divider" /> : null}
              <section
                className="AccountsRecovery__group"
                data-testid="accounts-recovery-group"
              >
                <div className="AccountsRecovery__group__label">
                  {group.icon}
                  <span>{group.label}</span>
                </div>
                {group.accounts.map((account) => {
                  const isSelected = account.publicKey === activePublicKey;
                  const value = accountValue?.[account.publicKey];
                  return (
                    <div
                      key={account.publicKey}
                      className="AccountsRecovery__row"
                      data-testid="accounts-recovery-row"
                      aria-current={isSelected ? true : undefined}
                    >
                      <div className="AccountsRecovery__row__identicon">
                        <IdenticonImg publicKey={account.publicKey} />
                        {isSelected ? (
                          <div className="AccountsRecovery__row__selected">
                            <Icon.Check />
                          </div>
                        ) : null}
                      </div>
                      <div className="AccountsRecovery__row__details">
                        <div className="AccountsRecovery__row__name">
                          {account.name}
                        </div>
                        <div className="AccountsRecovery__row__balance">
                          {!value && isFetchingTokenPrices ? (
                            <Loader size="0.75rem" />
                          ) : (
                            (value ?? "")
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="AccountsRecovery__row__edit"
                        aria-label={t("Edit {{name}}", { name: account.name })}
                        onClick={() => openEditAccount(account.publicKey)}
                        data-testid="accounts-recovery-edit"
                      >
                        <Icon.Settings04 />
                      </button>
                    </div>
                  );
                })}
              </section>
            </React.Fragment>
          ))}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
