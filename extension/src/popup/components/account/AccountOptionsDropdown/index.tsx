import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { NavButton, Icon, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo, openTab } from "popup/helpers/navigate";
import { isMainnet } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { newTabHref } from "helpers/urls";
import {
  saveAssetSelectType,
  AssetSelectType,
} from "popup/ducks/transactionSubmission";
import { publicKeySelector } from "popup/ducks/accountServices";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  WarningMessage,
  WarningMessageVariant,
} from "popup/components/WarningMessages";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { AppDispatch } from "popup/App";

import "./styles.scss";

interface DropdownModalProps {
  isFunded: boolean;
}

const DropdownModal = ({ isFunded }: DropdownModalProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const {
    isLoading: isTokenRequestLoading,
    fetchData,
    tokenError,
    clearTokenError,
  } = useGetOnrampToken({
    publicKey,
  });

  const handleBuyClick = async () => {
    await fetchData();
  };

  return (
    <div className="AccountOptionsDropdown__modal">
      <div
        className="AccountOptionsDropdown__modal__item"
        onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
      >
        <div className="AccountOptionsDropdown__modal__item__title">
          {t("Account details")}
        </div>
        <div className="AccountOptionsDropdown__modal__item__icon">
          <Icon.QrCode01 />
        </div>
      </div>

      {isMainnet(networkDetails) && (
        <div
          className="AccountOptionsDropdown__modal__item"
          onClick={handleBuyClick}
        >
          <div className="AccountOptionsDropdown__modal__item__title">
            {t("Buy with Coinbase")}
          </div>
          <div className="AccountOptionsDropdown__modal__item__icon">
            {isTokenRequestLoading ? <Loader /> : <Icon.PlusCircle />}
          </div>
        </div>
      )}

      <div
        className="AccountOptionsDropdown__modal__item"
        onClick={() => navigateTo(ROUTES.manageConnectedApps, navigate)}
      >
        <div className="AccountOptionsDropdown__modal__item__title">
          {t("Connected apps")}
        </div>
        <div className="AccountOptionsDropdown__modal__item__icon">
          <Icon.Coins03 />
        </div>
      </div>
      {isFunded && (
        <div
          className="AccountOptionsDropdown__modal__item"
          onClick={() => {
            dispatch(saveAssetSelectType(AssetSelectType.MANAGE));
            navigateTo(ROUTES.manageAssets, navigate);
          }}
        >
          <div className="AccountOptionsDropdown__modal__item__title">
            {t("Manage assets")}
          </div>
          <div className="AccountOptionsDropdown__modal__item__icon">
            <Icon.Link01 />
          </div>
        </div>
      )}

      <div
        className="AccountOptionsDropdown__modal__item"
        onClick={() => openTab(newTabHref(ROUTES.account))}
      >
        <div className="AccountOptionsDropdown__modal__item__title">
          {t("Expand view")}
        </div>
        <div className="AccountOptionsDropdown__modal__item__icon">
          <Icon.Expand04 />
        </div>
      </div>
      {tokenError
        ? createPortal(
            <WarningMessage
              header={t("Error fetching Coinbase token. Please try again.")}
              isActive={!!tokenError}
              variant={WarningMessageVariant.warning}
              handleCloseClick={clearTokenError}
            >
              <div>{tokenError}</div>
            </WarningMessage>,
            document.querySelector("#modal-root")!,
          )
        : null}
    </div>
  );
};

interface AccountOptionsDropdownProps {
  isFunded: boolean;
}

export const AccountOptionsDropdown = ({
  isFunded,
}: AccountOptionsDropdownProps) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      <NavButton
        showBorder
        title={t("View options")}
        id="nav-btn-qr"
        icon={<Icon.DotsHorizontal />}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      />
      {isDropdownOpen && <DropdownModal isFunded={isFunded} />}
      {isDropdownOpen
        ? createPortal(
            <LoadingBackground
              onClick={() => {
                setIsDropdownOpen(false);
              }}
              isClear
              isActive={isDropdownOpen}
            />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </>
  );
};
