import React from "react";
import { useTranslation } from "react-i18next";
import { Tooltip, Icon } from "@stellar/design-system";

import "./styles.scss";

export const AssetNotification = ({ isVerified }: { isVerified: boolean }) => {
  const { t } = useTranslation();

  return (
    <div className="AssetNotification" data-testid="asset-notification">
      {isVerified ? t("On your lists") : t("Not on your lists")}
      <Tooltip
        placement="bottom"
        triggerEl={
          <button className="AssetNotification__button">
            <Icon.InfoCircle className="AssetNotification__info" />
          </button>
        }
      >
        {t(
          "Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
        )}
      </Tooltip>
    </div>
  );
};
