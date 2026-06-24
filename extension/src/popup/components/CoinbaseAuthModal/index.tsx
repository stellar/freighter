import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "@stellar/design-system";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import CoinbaseLogo from "popup/assets/coinbase-logo.svg";

import "./styles.scss";

export interface CoinbaseAuthModalProps {
  isOpen: boolean;
  accountName: string;
  accountPublicKey: string;
  networkName: string;
  isLoading: boolean;
  errorMessage?: string;
  onAuthorize: () => void;
  onCancel: () => void;
}

export const CoinbaseAuthModal = ({
  isOpen,
  accountName,
  accountPublicKey,
  networkName,
  isLoading,
  errorMessage,
  onAuthorize,
  onCancel,
}: CoinbaseAuthModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="CoinbaseAuthModal" data-testid="coinbase-auth-modal">
      <div className="CoinbaseAuthModal__overlay">
        <div className="CoinbaseAuthModal__content">
          <div className="CoinbaseAuthModal__icon">
            <img src={CoinbaseLogo} alt={t("Coinbase Logo")} />
          </div>
          <Text as="div" size="lg" weight="medium">
            {t("Coinbase")}
          </Text>
          <Text
            as="div"
            size="sm"
            weight="medium"
            addlClassName="CoinbaseAuthModal__domain"
          >
            {t("app.coinbase.com")}
          </Text>

          <div className="CoinbaseAuthModal__badge">
            <Icon.LinkExternal01 />
            <span>{t("Authorization Request")}</span>
          </div>

          <div className="CoinbaseAuthModal__infoCard">
            <Text as="div" size="sm" weight="regular">
              {t(
                "Allow site to view your wallet address, balance, activity and request approval for transactions.",
              )}
            </Text>
          </div>

          <div className="CoinbaseAuthModal__detailsCard">
            <div className="CoinbaseAuthModal__detail">
              <div className="CoinbaseAuthModal__detail__label">
                <Icon.Wallet01 />
                <span>{t("Wallet")}</span>
              </div>
              <div className="CoinbaseAuthModal__detail__value">
                <div className="CoinbaseAuthModal__detail__identicon">
                  <IdenticonImg publicKey={accountPublicKey} />
                </div>
                <span>{accountName}</span>
              </div>
            </div>
            <div className="CoinbaseAuthModal__detail">
              <div className="CoinbaseAuthModal__detail__label">
                <Icon.Globe02 />
                <span>{t("Network")}</span>
              </div>
              <div className="CoinbaseAuthModal__detail__value">
                <span>{networkName}</span>
              </div>
            </div>
          </div>

          <span className="CoinbaseAuthModal__warning">
            {t("Only confirm if you trust this site")}
          </span>
        </div>

        <div className="CoinbaseAuthModal__footer">
          <div className="CoinbaseAuthModal__buttons">
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              onClick={onCancel}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="primary"
              isLoading={isLoading}
              onClick={onAuthorize}
            >
              {t("Authorize")}
            </Button>
          </div>
          {errorMessage && (
            <div className="CoinbaseAuthModal__error">{errorMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
};
