import React from "react";
import { Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

import "./styles.scss";

interface AboutLinkProps {
  url: string;
}

const AboutLink = ({ url }: AboutLinkProps) => (
  <p className="About--link">
    <Icon.Link2 />
    <a target="_blank" rel="noreferrer" href={`https://${url}`}>
      {url}
    </a>
  </p>
);

export const About = () => (
  <>
    <PopupWrapper>
      <SubviewHeader title="About" />
      <div className="About">
        <img alt="Freighter logo" src={FreighterLogoLockup} />
        <p className="About--info">
          Freighter is a non-custodial wallet extension that enables you to sign
          Stellar transactions via your browser. It's a safer alternative to
          copying and pasting private keys for use with web apps.
        </p>
        <p className="About--links-header">LINKS</p>
        <AboutLink url="freighter.app" />
        <AboutLink url="laboratory.stellar.org" />
        <AboutLink url="accountviewer.stellar.org" />
        <AboutLink url="stellarterm.com" />
        <AboutLink url="stellar.org" />
        <p className="About--copyright">
          &copy; 2022 Stellar Development Foundation
        </p>
      </div>
    </PopupWrapper>
    <BottomNav />
  </>
);
