import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import Usdt0Arcs from "popup/assets/usdt0-arcs.svg";
import Usdt0Lockup from "popup/assets/usdt0-lockup.svg";

import "./styles.scss";

interface Usdt0LaunchSheetProps {
  onClose: () => void;
}

export const Usdt0LaunchSheet = ({ onClose }: Usdt0LaunchSheetProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleTransferClick = () => {
    onClose();
    navigateTo(ROUTES.addFunds, navigate);
  };

  return (
    <div className="Usdt0LaunchSheet" data-testid="usdt0-launch-sheet">
      <div className="Usdt0LaunchSheet__background">
        <div className="Usdt0LaunchSheet__background__gradient" />
        <img
          className="Usdt0LaunchSheet__background__arcs"
          src={Usdt0Arcs}
          alt=""
        />
        <div className="Usdt0LaunchSheet__background__fade" />
        <div className="Usdt0LaunchSheet__background__overlay" />
        <img
          className="Usdt0LaunchSheet__background__lockup"
          src={Usdt0Lockup}
          alt={t("USDT0")}
        />
      </div>
      <div className="Usdt0LaunchSheet__content">
        <div className="Usdt0LaunchSheet__header">
          <button
            type="button"
            className="Usdt0LaunchSheet__close"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="usdt0-launch-sheet-close"
          >
            <Icon.X />
          </button>
        </div>
        <div className="Usdt0LaunchSheet__body">
          <div className="Usdt0LaunchSheet__heading">
            <div className="Usdt0LaunchSheet__title">
              {t("USDT0 is now on Stellar")}
            </div>
            {/* global.scss forces `p` color to inherit (!important), which
                would defeat the muted gray — render as div like the rows */}
            <Text
              as="div"
              size="xs"
              weight="regular"
              addlClassName="Usdt0LaunchSheet__description"
            >
              {t(
                "Move USDT across supported networks and access it on Stellar with USDT0.",
              )}
            </Text>
          </div>
          <div className="Usdt0LaunchSheet__features">
            <div className="Usdt0LaunchSheet__feature">
              <div className="Usdt0LaunchSheet__feature__icon">
                <Icon.Asterisk01 />
              </div>
              <div className="Usdt0LaunchSheet__feature__text">
                <Text
                  as="div"
                  size="sm"
                  weight="medium"
                  addlClassName="Usdt0LaunchSheet__feature__title"
                >
                  {t("Move across networks")}
                </Text>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="Usdt0LaunchSheet__feature__description"
                >
                  {t("Transfer USDT between Stellar and supported networks.")}
                </Text>
              </div>
            </div>
            <div className="Usdt0LaunchSheet__feature">
              <div className="Usdt0LaunchSheet__feature__icon">
                <Icon.Asterisk01 />
              </div>
              <div className="Usdt0LaunchSheet__feature__text">
                <Text
                  as="div"
                  size="sm"
                  weight="medium"
                  addlClassName="Usdt0LaunchSheet__feature__title"
                >
                  {t("1:1 backed, unified liquidity")}
                </Text>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="Usdt0LaunchSheet__feature__description"
                >
                  {t(
                    "USDT0 is backed 1:1 by USDT, without fragmented wrapped versions.",
                  )}
                </Text>
              </div>
            </div>
          </div>
        </div>
        <div className="Usdt0LaunchSheet__footer">
          <Button
            size="lg"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={handleTransferClick}
            data-testid="usdt0-launch-sheet-transfer"
          >
            {t("Transfer USDT0")}
          </Button>
        </div>
      </div>
    </div>
  );
};
