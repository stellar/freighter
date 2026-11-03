import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import VarialLogo from "popup/assets/logo-varial.svg?react";

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
      <SubviewHeader title={t("About")} />
      <View.Content hasNoTopPadding>
        <div className="About">
          <div>
            <VarialLogo role="img" aria-label={t("Varial logo")} />
          </div>
          <div className="About__body">
            <div className="About__info">
              {t("Varial is a non-custodial wallet for the Stellar blockchain")}
            </div>
            <div className="About__links-header">{t("Links")}</div>
            <AboutLink url="varialwallet.com" />
            <AboutLink url="stellar.org" />
            <AboutLink url="varialwallet.com/privacy">
              {t("Privacy Policy")}
            </AboutLink>
            <AboutLink url="varialwallet.com/terms">
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
