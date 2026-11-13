import React from "react";
import { Button, Heading, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import get from "lodash/get";

import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";

import EthenaLaunchWave from "popup/assets/ethena-launch-wave.svg";
import EthenaCoinLight from "popup/assets/ethena-launch-coin-light.png";
import EthenaCoinDark from "popup/assets/ethena-launch-coin-dark.png";
import LogoUsde from "popup/assets/logo-usde.svg";
import LogoSusde from "popup/assets/logo-susde.svg";

import "./styles.scss";

// Sushi's Stellar swap page reads no URL parameters (its pair is set in
// code), so this can only land on it; the user picks USDe or sUSDe there.
const SUSHI_STELLAR_SWAP_URL = "https://www.sushi.com/stellar/swap";
// Stargate, from Ethereum to Stellar with the token preselected on both
// sides. Addresses are the ones LayerZero's transfer token list publishes.
const STARGATE_USDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x4c9EDD5852cd905f086C759E8383e09bff1E68B3&dstChain=stellar&dstToken=CCNOV6XVI2O5BSTA3232GIRUQULDEBV7IWGKM6QKI6II5OIIQTU24JJN";
const STARGATE_SUSDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x9D39A5DE30e57443BfF2A8307A4256c8797A3497&dstChain=stellar&dstToken=CACSKWC753QVGC4J6YPDBIR2BEHFVWIAE7CBSS3HOVYMN623OAIQYE2M";
const ETHENA_DOCS_URL = "https://docs.ethena.fi/";

interface EthenaTokenSectionProps {
  id: string;
  code: string;
  logo: string;
  name: string;
  description: string;
  transferUrl: string;
  onReceive: () => void;
}

const EthenaTokenSection = ({
  id,
  code,
  logo,
  name,
  description,
  transferUrl,
  onReceive,
}: EthenaTokenSectionProps) => {
  const { t } = useTranslation();

  const handleSwap = () => {
    openTab(SUSHI_STELLAR_SWAP_URL);
  };

  const handleTransfer = () => {
    openTab(transferUrl);
  };

  return (
    <div className="EthenaLaunch__token">
      <div className="EthenaLaunch__token__info">
        <div className="EthenaLaunch__token__heading">
          {/* Decorative: the code beside it names the token */}
          <img className="EthenaLaunch__token__logo" src={logo} alt="" />
          <div>
            <div className="EthenaLaunch__token__code">{code}</div>
            <div className="EthenaLaunch__token__name">{name}</div>
          </div>
        </div>
        <div className="EthenaLaunch__token__description">{description}</div>
      </div>
      <div className="EthenaLaunch__token__actions">
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          icon={<Icon.ArrowUpRight />}
          iconPosition="right"
          onClick={handleSwap}
          data-testid={`ethena-launch-swap-${id}`}
        >
          {t("Swap to {{code}}", { code })}
        </Button>
        <Button
          size="lg"
          variant="tertiary"
          isFullWidth
          isRounded
          onClick={onReceive}
          data-testid={`ethena-launch-receive-${id}`}
        >
          {t("Receive {{code}}", { code })}
        </Button>
        <button
          type="button"
          className="EthenaLaunch__transfer"
          onClick={handleTransfer}
          data-testid={`ethena-launch-transfer-${id}`}
        >
          {t("Transfer to Stellar")}
          <Icon.ArrowUpRight />
        </button>
      </div>
    </div>
  );
};

/**
 * Full-screen "Meet Ethena on Stellar" launch promo. UnlockAccount routes here
 * once per eligible wallet (the background marks it seen as it hands it out),
 * and the Home banner opens it on demand. Closing returns to the destination
 * in location state, or Home.
 */
export const EthenaLaunch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = get(
    location,
    "state.destination",
    ROUTES.account,
  ) as string;

  const handleClose = () => {
    navigate(destination, { replace: true });
  };

  const handleReceive = () => {
    navigateTo(ROUTES.viewPublicKey, navigate);
  };

  const handleLearnMore = () => {
    openTab(ETHENA_DOCS_URL);
  };

  return (
    // Pinned dark: the hero art is drawn for a black page and there is no
    // light design.
    <div className="EthenaLaunch sds-theme-dark" data-testid="ethena-launch">
      <div className="EthenaLaunch__header">
        <button
          type="button"
          className="EthenaLaunch__close"
          aria-label={t("Close")}
          onClick={handleClose}
          data-testid="ethena-launch-close"
        >
          <Icon.X />
        </button>
      </div>

      <section className="EthenaLaunch__hero">
        <div className="EthenaLaunch__wave" aria-hidden="true">
          <img src={EthenaLaunchWave} alt="" />
        </div>
        <div className="EthenaLaunch__coins" aria-hidden="true">
          <img
            className="EthenaLaunch__coin EthenaLaunch__coin--light"
            src={EthenaCoinLight}
            alt=""
          />
          <img
            className="EthenaLaunch__coin EthenaLaunch__coin--dark"
            src={EthenaCoinDark}
            alt=""
          />
        </div>
        <div className="EthenaLaunch__intro">
          <Heading
            as="h1"
            size="sm"
            weight="medium"
            addlClassName="EthenaLaunch__title"
          >
            {t("Meet Ethena on Stellar")}
          </Heading>
          <div className="EthenaLaunch__subtitle">
            {t("Discover USDe and sUSDe, now available on Stellar.")}
          </div>
        </div>
        <div className="EthenaLaunch__scroll-hint">
          {t("Scroll to discover tokens")}
          <Icon.ChevronDown aria-hidden="true" />
        </div>
      </section>

      <section className="EthenaLaunch__tokens">
        <EthenaTokenSection
          id="usde"
          code="USDe"
          logo={LogoUsde}
          name={t("Synthetic Dollar")}
          description={t(
            "A synthetic dollar designed to maintain a value of $1.",
          )}
          transferUrl={STARGATE_USDE_URL}
          onReceive={handleReceive}
        />
        <EthenaTokenSection
          id="susde"
          code="sUSDe"
          logo={LogoSusde}
          name={t("Staked USDe")}
          description={t(
            "A staked version of USDe that accrues variable protocol rewards.",
          )}
          transferUrl={STARGATE_SUSDE_URL}
          onReceive={handleReceive}
        />
        <button
          type="button"
          className="EthenaLaunch__learn-more"
          onClick={handleLearnMore}
          data-testid="ethena-launch-learn-more"
        >
          {t("Learn more about Ethena")}
          <Icon.ArrowUpRight />
        </button>
      </section>
    </div>
  );
};
