import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { closeWindow, navigateTo, openTab } from "popup/helpers/navigate";
import {
  getStellarExpertUrl,
  isStellarExpertSupported,
} from "popup/helpers/account";
import { allAccountsSelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { SlideupModal } from "popup/components/SlideupModal";
import { SheetLayout } from "popup/components/SheetLayout";
import { RenameWallet } from "popup/components/account/RenameWallet";

import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";

interface RowProps {
  label: string;
  value?: string;
  trailingIcon: React.ReactNode;
  onClick: () => void;
  testId: string;
}

const Row = ({ label, value, trailingIcon, onClick, testId }: RowProps) => (
  <button
    type="button"
    className="EditAccount__row"
    onClick={onClick}
    data-testid={testId}
  >
    <span className="EditAccount__row__label">{label}</span>
    {value ? <span className="EditAccount__row__value">{value}</span> : null}
    <span className="EditAccount__row__icon">{trailingIcon}</span>
  </button>
);

/**
 * One account's settings: its name, its secret key, and its explorer link.
 * Reached with `?publicKey=`; without one it edits the active account.
 *
 * Not yet here: the Recovery phrase row, which needs to know which phrase
 * roots the account, and Networks and Hide wallet, which are out of scope.
 */
export const EditAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);
  const allAccounts = useSelector(allAccountsSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { state, fetchData } = useGetAppData();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === AppDataType.REROUTE) {
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
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

  const publicKey =
    new URLSearchParams(location.search).get("publicKey") ||
    state.data.account.publicKey;
  const account = allAccounts.find((acct) => acct.publicKey === publicKey);

  if (!account) {
    return <Navigate to={ROUTES.account} replace />;
  }

  // A hardware account's key never leaves the device.
  const hasSecretKey = !account.hardwareWalletType;

  return (
    <React.Fragment>
      <SubviewHeader title={t("Edit account")} />
      <View.Content hasNoTopPadding>
        <div className="EditAccount" data-testid="edit-account">
          <div className="EditAccount__identicon">
            <IdenticonImg publicKey={publicKey} />
          </div>
          <div className="EditAccount__card">
            <Row
              label={t("Account name")}
              value={account.name}
              trailingIcon={<Icon.ChevronRight />}
              onClick={() => setIsRenaming(true)}
              testId="edit-account-name"
            />
          </div>
          {hasSecretKey ? (
            <div className="EditAccount__card">
              <Row
                label={t("Secret key")}
                value={t("Unlock to reveal")}
                trailingIcon={<Icon.ChevronRight />}
                onClick={() =>
                  navigateTo(
                    ROUTES.revealSecretKey,
                    navigate,
                    `?publicKey=${encodeURIComponent(publicKey)}`,
                  )
                }
                testId="edit-account-secret-key"
              />
            </div>
          ) : null}
          {isStellarExpertSupported(networkDetails) ? (
            <div className="EditAccount__card">
              <Row
                label={t("View on block explorer")}
                trailingIcon={<Icon.LinkExternal01 />}
                onClick={() =>
                  openTab(
                    `${getStellarExpertUrl(networkDetails)}/account/${publicKey}`,
                  )
                }
                testId="edit-account-explorer"
              />
            </div>
          ) : null}
        </div>
      </View.Content>
      <SlideupModal
        isModalOpen={isRenaming}
        setIsModalOpen={setIsRenaming}
        ariaLabel={t("Rename wallet")}
      >
        <SheetLayout>
          {isRenaming ? (
            <RenameWallet
              allAccounts={allAccounts}
              publicKey={publicKey}
              onSubmit={() => {}}
              onClose={() => setIsRenaming(false)}
            />
          ) : (
            <div />
          )}
        </SheetLayout>
      </SlideupModal>
    </React.Fragment>
  );
};
