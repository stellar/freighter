import React from "react";
import { Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

interface DiscoverDisclaimerProps {
  as: "div" | "p";
  size: "xs" | "sm";
  addlClassName?: string;
}

export const DiscoverDisclaimer = ({
  as,
  size,
  addlClassName,
}: DiscoverDisclaimerProps) => {
  const { t } = useTranslation();

  return (
    <Text as={as} size={size} weight="regular" addlClassName={addlClassName}>
      {t(
        "These services are operated by independent third parties, not by Freighter or SDF. Inclusion here is not an endorsement. DeFi carries risk, including loss of funds. Use at your own risk.",
      )}
    </Text>
  );
};
