import React, { useEffect } from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { trackDiscoverWelcomeModalViewed } from "popup/metrics/discover";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

interface DiscoverWelcomeModalProps {
  onDismiss: () => void;
}

export const DiscoverWelcomeModal = ({
  onDismiss,
}: DiscoverWelcomeModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    trackDiscoverWelcomeModalViewed();
  }, []);

  return (
    <>
      <div className="DiscoverWelcomeModal">
        <div className="DiscoverWelcomeModal__card">
          <div className="DiscoverWelcomeModal__icon">
            <Icon.Compass03 />
          </div>
          <div className="DiscoverWelcomeModal__title">
            <Text as="div" size="lg" weight="semi-bold">
              {t("Welcome to Discover!")}
            </Text>
          </div>
          <div className="DiscoverWelcomeModal__body">
            <Text as="p" size="sm" weight="regular">
              {t(
                "Your gateway to the Stellar ecosystem. Browse and connect to decentralized applications built on Stellar.",
              )}
            </Text>
            <Text as="p" size="sm" weight="regular">
              {t(
                "These services are operated by independent third parties, not by Freighter or SDF. Inclusion here is not an endorsement. DeFi carries risk, including loss of funds. Use at your own risk.",
              )}
            </Text>
          </div>
          <Button
            size="md"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={onDismiss}
            data-testid="discover-welcome-dismiss"
          >
            {t("Let’s go")}
          </Button>
        </div>
      </div>
      <LoadingBackground isActive onClick={onDismiss} />
    </>
  );
};
