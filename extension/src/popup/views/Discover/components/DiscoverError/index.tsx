import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface DiscoverErrorProps {
  onRetry: () => void;
}

export const DiscoverError = ({ onRetry }: DiscoverErrorProps) => {
  const { t } = useTranslation();

  return (
    <div className="DiscoverError" data-testid="discover-error">
      <div className="DiscoverError__icon">
        <Icon.AlertTriangle />
      </div>
      <div className="DiscoverError__text">
        <Text as="div" size="sm" weight="medium">
          {t("Unable to fetch protocols")}
        </Text>
        <Text
          as="div"
          size="xs"
          weight="medium"
          addlClassName="DiscoverError__text__subtitle"
        >
          {t(
            "There was an error fetching protocols. Please refresh and try again.",
          )}
        </Text>
      </div>
      <Button
        size="md"
        variant="secondary"
        isRounded
        onClick={onRetry}
        data-testid="discover-error-retry"
      >
        <Icon.RefreshCcw01 />
        {t("Refresh")}
      </Button>
    </div>
  );
};
