import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const LeaveFeedback = () => {
  const { t } = useTranslation();

  const openLink = (link: string) => {
    window.open(link, "_blank");
    return false;
  };

  return (
    <View>
      <SubviewHeader title="Leave Feedback" />
      <View.Content hasNoTopPadding>
        <div className="LeaveFeedback">
          <div className="LeaveFeedback__itemsContainer">
            {/* Discord */}
            <div className="LeaveFeedback__item">
              <div className="LeaveFeedback__item__icon">
                <Icon.Discord />
              </div>
              <div>
                {t(
                  "Join the #wallets Discord channel for updates and questions",
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<Icon.ArrowRight />}
                isPill
                onClick={() =>
                  openLink(
                    "https://discord.com/channels/897514728459468821/1019346446014759013",
                  )
                }
              >
                Discord
              </Button>
            </div>

            {/* GitHub */}
            <div className="LeaveFeedback__item">
              <div className="LeaveFeedback__item__icon">
                <Icon.Github />
              </div>
              <div>
                {t(
                  "Have a suggestion or bug report? Create an issue on Github",
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={<Icon.ArrowRight />}
                isPill
                onClick={() =>
                  openLink("https://github.com/stellar/freighter/issues")
                }
              >
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </View.Content>
    </View>
  );
};
