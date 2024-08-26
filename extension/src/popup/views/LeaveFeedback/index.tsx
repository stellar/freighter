import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import "./styles.scss";

export const LeaveFeedback = () => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <SubviewHeader title="Leave Feedback" />
      <View.Content hasNoTopPadding>
        <ListNavLinkWrapper>
          <ListNavLink
            icon={<Icon.Link01 />}
            href="https://discord.com/channels/897514728459468821/1019346446014759013"
          >
            {t("Join community Discord")}
          </ListNavLink>
          <ListNavLink
            icon={<Icon.Link01 />}
            href="https://github.com/stellar/freighter/issues"
          >
            {t("Report issue on Github")}
          </ListNavLink>
        </ListNavLinkWrapper>
      </View.Content>
    </React.Fragment>
  );
};
