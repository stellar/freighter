import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, CopyText, Icon, Notification } from "@stellar/design-system";
import classNames from "classnames";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import {
  makeAccountActive,
  allAccountsSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  clearBalancesForAccount,
  clearCollectiblesForAccount,
} from "popup/ducks/cache";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { truncatedPublicKey } from "helpers/stellar";
import { getColorPubKey } from "helpers/stellarIdenticon";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { useGetWalletsData } from "./hooks/useGetWalletsData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { reRouteOnboarding } from "popup/helpers/route";
import { WalletType } from "@shared/constants/hardwareWallet";
import { AddWallet } from "popup/components/account/AddWallet";
import { RenameWallet } from "popup/components/account/RenameWallet";

import "./styles.scss";

interface WalletRowProps {
  isFetchingTokenPrices: boolean;
  accountName: string;
  accountValue: string;
  isImported: boolean;
  hardwareWalletType?: WalletType;
  isSelected: boolean;
  publicKey: string;
  onClick: (publicKey: string) => unknown;
  setOptionsOpen: (publicKey: string) => unknown;
}

const WalletRow = ({
  isFetchingTokenPrices,
  accountName,
  accountValue,
  isImported,
  hardwareWalletType,
  isSelected,
  publicKey,
  onClick,
  setOptionsOpen,
}: WalletRowProps) => {
  const shortPublicKey = truncatedPublicKey(publicKey);
  const identiconWrapperStyles = classNames("identicon-wrapper", {
    "is-selected": isSelected,
  });
  const selectedBorderColorRgb = getColorPubKey(publicKey);
  const isSelectedColor = `rgb(${selectedBorderColorRgb.r} ${selectedBorderColorRgb.g} ${selectedBorderColorRgb.b} / 100%`;
  const borderColor = isSelected ? isSelectedColor : "#232323";

  let subTitle = accountValue
    ? `${shortPublicKey} - ${accountValue}`
    : shortPublicKey;
  if (isFetchingTokenPrices && !accountValue) {
    subTitle = `${shortPublicKey} - ...`;
  }
  const { t } = useTranslation();
  const walletIdentifier =
    hardwareWalletType || isImported ? t("Imported") : "";
  return (
    <div className="WalletRow">
      <div
        className="WalletRow__identicon"
        onClick={() => onClick(publicKey)}
        data-testid="wallet-row-select"
      >
        <div
          className={identiconWrapperStyles}
          style={{ borderColor: borderColor }}
        >
          <IdenticonImg publicKey={publicKey} />
        </div>
        {isSelected ? (
          <div
            className="WalletRow__identicon__selected-check"
            style={{ backgroundColor: isSelectedColor }}
          >
            <Icon.Check width="14px" height="14px" />
          </div>
        ) : null}
      </div>
      <div className="WalletRow__details" onClick={() => onClick(publicKey)}>
        <p className="detail-name">{accountName}</p>
        <p className="detail-short-key">{subTitle}</p>
        <p className="detail-short-key">{walletIdentifier}</p>
      </div>
      <div
        className="WalletRow__options"
        data-testid="wallet-row-options"
        onClick={() => setOptionsOpen(publicKey)}
      >
        <img src={IconEllipsis} alt={t("wallet action options")} />
      </div>
    </div>
  );
};

export const Wallets = () => {
  const activeOptionsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = React.useState("");
  const [isAddingWallet, setIsAddingWallet] = React.useState(false);
  const [activeOptionsPublicKey, setActiveOptionsPublicKey] =
    React.useState("");
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        activeOptionsRef.current &&
        !activeOptionsRef.current.contains(event.target as Node)
      ) {
        setActiveOptionsPublicKey("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeOptionsRef]);

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
      <div className="Wallets__fail">
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
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant="secondary"
            iconPosition="left"
            icon={<Icon.PlusCircle />}
            onClick={() => setIsAddingWallet(true)}
            data-testid="add-wallet"
          >
            {t("Add a wallet")}
          </Button>
        }
      >
        <div>
          {allAccounts.map(
            ({ publicKey, name, imported, hardwareWalletType }) => {
              const isSelected = activePublicKey === publicKey;
              const totalValueUsd = accountValue ? accountValue[publicKey] : "";

              return (
                <>
                  <WalletRow
                    isFetchingTokenPrices={isFetchingTokenPrices}
                    accountName={name}
                    accountValue={totalValueUsd}
                    isImported={imported}
                    hardwareWalletType={hardwareWalletType}
                    publicKey={publicKey}
                    isSelected={isSelected}
                    onClick={async (publicKey) => {
                      await dispatch(makeAccountActive(publicKey));
                      await dispatch(
                        clearBalancesForAccount({ publicKey, networkDetails }),
                      );
                      await dispatch(
                        clearCollectiblesForAccount({
                          publicKey,
                          networkDetails,
                        }),
                      );
                      navigateTo(ROUTES.account, navigate);
                    }}
                    setOptionsOpen={setActiveOptionsPublicKey}
                  />
                  {activeOptionsPublicKey === publicKey ? (
                    <div
                      className="WalletRow__options-actions"
                      ref={activeOptionsRef}
                    >
                      <div
                        className="WalletRow__options-actions__row"
                        onClick={() => {
                          setIsEditingName(publicKey);
                          setActiveOptionsPublicKey("");
                        }}
                      >
                        <div className="action-copy">
                          <div className="WalletRow__options-actions__label">
                            {t("Rename Wallet")}
                          </div>
                          <Icon.Edit05 />
                        </div>
                      </div>
                      <div className="WalletRow__options-actions__row">
                        <CopyText textToCopy={publicKey}>
                          <div className="action-copy">
                            <div className="WalletRow__options-actions__label">
                              {t("Copy address")}
                            </div>
                            <Icon.Copy01 />
                          </div>
                        </CopyText>
                      </div>
                    </div>
                  ) : null}
                </>
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
