import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { SubviewHeader } from "popup/components/SubviewHeader";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

import "./styles.scss";

interface AboutLinkProps {
  children?: React.ReactNode | string;
  url: string;
}

const AboutLink = ({ children, url }: AboutLinkProps) => (
  <div className="About__link">
    <Icon.Link2 />
    <a target="_blank" rel="noreferrer" href={`https://${url}`}>
      {children || url}
    </a>
  </div>
);

export const About = () => {
  const { t } = useTranslation();

  return (
    <div className="About">
      <SubviewHeader title="About" />
      <div>
        <img alt="Freighter logo" src={FreighterLogoLockup} />
      </div>
      <div className="About__body">
        <div className="About__info">
          {t(
            "Freighter is a non-custodial wallet extension that enables you to sign Stellar transactions via your browser. It’s a safer alternative to copying and pasting private keys for use with web apps.",
          )}
        </div>
        <div className="About__links-header">{t("LINKS")}</div>
        <AboutLink url="freighter.app" />
        <AboutLink url="stellar.org" />
        <AboutLink url="stellar.org/privacy-policy">
          {t("Privcy Policy")}
        </AboutLink>
        <AboutLink url="stellar.org/terms-of-service">
          {t("Teeeems of Service")}
        </AboutLink>
      </div>

      <div className="About__copyright">
        &copy; 2022 Stellar Development Foundation
      </div>
    </div>
  );
};
