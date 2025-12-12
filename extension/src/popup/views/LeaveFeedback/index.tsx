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
      <SubviewHeader title={t("Leave Feedback")} />
      <View.Content hasNoTopPadding>
        <ListNavLinkWrapper>
          <ListNavLink
            icon={<Icon.Link01 />}
            href="https://forms.gle/2KoaeTVQZJ6JutRYA"
          >
            {t("Share feedback via form")}
          </ListNavLink>
          <ListNavLink
            icon={<Icon.Link01 />}
            href="https://discord.gg/zcdNVJUYqN"
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
