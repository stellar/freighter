import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import FreighterLogo from "popup/assets/logo-freighter-welcome-2.svg";

import "./styles.scss";

interface AboutLinkProps {
  children?: React.ReactNode | string;
  url: string;
}

const AboutLink = ({ children, url }: AboutLinkProps) => (
  <div className="About__link">
    <Icon.Link01 />
    <a target="_blank" rel="noreferrer" href={`https://${url}`}>
      {children || url}
    </a>
  </div>
);

export const About = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <React.Fragment>
      <SubviewHeader title="About" />
      <View.Content hasNoTopPadding>
        <div className="About">
          <div>
            <img alt="Freighter logo" src={FreighterLogo} />
          </div>
          <div className="About__body">
            <div className="About__info">
              {t(
                "Freighter is a non-custodial wallet for the Stellar blockchain",
              )}
            </div>
            <div className="About__links-header">{t("Links")}</div>
            <AboutLink url="freighter.app" />
            <AboutLink url="stellar.org" />
            <AboutLink url="stellar.org/privacy-policy">
              {t("Privacy Policy")}
            </AboutLink>
            <AboutLink url="stellar.org/terms-of-service">
              {t("Terms of Service")}
            </AboutLink>
          </div>
        </div>
      </View.Content>
      <View.Footer>
        <div className="About__copyright">
          {`© ${currentYear} Stellar Development Foundation`}
        </div>
      </View.Footer>
    </React.Fragment>
  );
};
