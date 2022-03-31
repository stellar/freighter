import React from "react";
import { Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

import "./styles.scss";

interface AboutLinkProps {
  url: string;
}

const AboutLink = ({ url }: AboutLinkProps) => (
  <div className="About__link">
    <Icon.Link2 />
    <a target="_blank" rel="noreferrer" href={`https://${url}`}>
      {url}
    </a>
  </div>
);

export const About = () => (
  <div className="About">
    <SubviewHeader title="About" />
    <div>
      <img alt="Freighter logo" src={FreighterLogoLockup} />
    </div>
    <div className="About__body">
      <div className="About__info">
        Freighter is a non-custodial wallet extension that enables you to sign
        Stellar transactions via your browser. It's a safer alternative to
        copying and pasting private keys for use with web apps.
      </div>
      <div className="About__links-header">LINKS</div>
      <AboutLink url="freighter.app" />
      <AboutLink url="laboratory.stellar.org" />
      <AboutLink url="accountviewer.stellar.org" />
      <AboutLink url="stellarterm.com" />
      <AboutLink url="stellar.org" />
    </div>

    <div className="About__copyright">
      &copy; 2022 Stellar Development Foundation
    </div>
  </div>
);
