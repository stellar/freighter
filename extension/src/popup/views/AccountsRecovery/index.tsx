import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon, Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { closeWindow, navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";
import {
  AccountGroupKind,
  groupAccountsBySource,
} from "popup/helpers/accountGroups";
import {
  activeAccountIdSelector,
  secretSourcesSelector,
} from "popup/ducks/accountServices";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { Loading } from "popup/components/Loading";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";

import "./styles.scss";

const GROUP_ICON: Record<AccountGroupKind, React.ReactNode> = {
  [AccountGroupKind.PHRASE]: <Icon.Passcode />,
  [AccountGroupKind.SECRET_KEY]: <Icon.Key02 />,
  [AccountGroupKind.HARDWARE]: <Icon.Wallet02 />,
  [AccountGroupKind.OTHER]: <Icon.Wallet02 />,
};

export const AccountsRecovery = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, fetchData } = useGetWalletsData();
  const activeAccountId = useSelector(activeAccountIdSelector);
  const secretSources = useSelector(secretSourcesSelector);

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

  const { allAccounts, accountValue } = state.data;
  const isFetchingTokenPrices = state.data.isFetchingTokenPrices;
  const groups = groupAccountsBySource({
    accounts: allAccounts,
    sources: secretSources,
    t,
  });

  const openEditAccount = (accountId: string) =>
    navigateTo(
      ROUTES.editAccount,
      navigate,
      `?accountId=${encodeURIComponent(accountId)}`,
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
                  {GROUP_ICON[group.kind]}
                  <span>{group.label}</span>
                </div>
                {group.accounts.map((account) => {
                  const isSelected = account.id === activeAccountId;
                  const value = accountValue?.[account.publicKey];
                  return (
                    <div
                      key={account.id}
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
                        onClick={() => openEditAccount(account.id)}
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
