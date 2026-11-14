import React, { useLayoutEffect, useRef, useState } from "react";
import { Button, Heading, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { useEscapeToClose } from "popup/helpers/hooks/useEscapeToClose";

import EthenaLaunchWave from "popup/assets/ethena-launch-wave.svg";
import EthenaCoinLight from "popup/assets/ethena-launch-coin-light.png";
import EthenaCoinDark from "popup/assets/ethena-launch-coin-dark.png";
import LogoUsde from "popup/assets/logo-usde.svg";
import LogoSusde from "popup/assets/logo-susde.svg";

import "./styles.scss";

// Mainnet token contracts on Stellar: XLM's Stellar Asset Contract, and USDe's
// and sUSDe's, which LayerZero's transfer token list also publishes.
const XLM_CONTRACT_ID =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const USDE_CONTRACT_ID =
  "CCNOV6XVI2O5BSTA3232GIRUQULDEBV7IWGKM6QKI6II5OIIQTU24JJN";
const SUSDE_CONTRACT_ID =
  "CACSKWC753QVGC4J6YPDBIR2BEHFVWIAE7CBSS3HOVYMN623OAIQYE2M";
// The same tokens on Ethereum, from the same list.
const USDE_ETHEREUM_ADDRESS = "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3";
const SUSDE_ETHEREUM_ADDRESS = "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497";

// Sushi's Stellar swap, from XLM to the token. Sushi is adding these
// parameters; until they ship, the page opens on its default pair.
const sushiSwapUrl = (contractId: string) =>
  `https://www.sushi.com/stellar/swap?token0=${XLM_CONTRACT_ID}&token1=${contractId}`;
// Stargate, from Ethereum to Stellar with the token preselected on both sides.
const stargateUrl = (ethereumAddress: string, contractId: string) =>
  `https://stargate.finance/?srcChain=ethereum&srcToken=${ethereumAddress}&dstChain=stellar&dstToken=${contractId}`;
const ETHENA_DOCS_URL = "https://docs.ethena.fi/";

// The scroll cue scrolls the page until it sits this far below the close
// button's bar, with the tokens under it.
const SCROLL_CUE_GAP = 60;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface EthenaTokenSectionProps {
  id: string;
  code: string;
  logo: string;
  name: string;
  description: string;
  swapUrl: string;
  transferUrl: string;
  onReceive: () => void;
}

const EthenaTokenSection = ({
  id,
  code,
  logo,
  name,
  description,
  swapUrl,
  transferUrl,
  onReceive,
}: EthenaTokenSectionProps) => {
  const { t } = useTranslation();

  const handleSwap = () => {
    openTab(swapUrl);
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

interface EthenaLaunchLocationState {
  // Where closing goes: UnlockAccount's original destination, or Home.
  destination?: string;
  // How far the page was scrolled when it left for Receive.
  scrollTop?: number;
}

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
  const locationState = (location.state ?? {}) as EthenaLaunchLocationState;
  const destination = locationState.destination ?? ROUTES.account;
  // Back from Receive's address screen: the page comes back as it was left,
  // scrolled where it was and without replaying the intro.
  const returnScrollTop = locationState.scrollTop;

  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // The close button's bar fills in once the page scrolls (see styles).
  const [isScrolled, setIsScrolled] = useState(Boolean(returnScrollTop));

  // Before the first paint, so the page never shows at the top first.
  useLayoutEffect(() => {
    if (returnScrollTop !== undefined && pageRef.current) {
      pageRef.current.scrollTop = returnScrollTop;
    }
  }, [returnScrollTop]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(event.currentTarget.scrollTop > 0);
  };

  const handleScrollToTokens = (event: React.MouseEvent<HTMLButtonElement>) => {
    const page = pageRef.current;
    if (!page) {
      return;
    }
    const cueTop =
      event.currentTarget.getBoundingClientRect().top -
      page.getBoundingClientRect().top;
    const barHeight = headerRef.current?.offsetHeight ?? 0;
    page.scrollTo({
      top: page.scrollTop + cueTop - barHeight - SCROLL_CUE_GAP,
      behavior: window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches
        ? "auto"
        : "smooth",
    });
  };

  const handleClose = () => {
    navigate(destination, { replace: true });
  };

  // Esc closes the promo like the X does, rather than the popup.
  useEscapeToClose(handleClose);

  const handleReceive = () => {
    // The address screen closes by going back, to this history entry, so
    // note in it where the page is.
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {
        ...locationState,
        scrollTop: pageRef.current?.scrollTop ?? 0,
      },
    });
    navigateTo(ROUTES.viewPublicKey, navigate);
  };

  const handleLearnMore = () => {
    openTab(ETHENA_DOCS_URL);
  };

  return (
    // Home's frame: in fullscreen mode a centred column with vertical
    // borders, which the promo fills instead of the whole window.
    <View.Inset
      hasVerticalBorder
      hasNoPadding
      additionalClassName="EthenaLaunch__frame"
      data-testid="ethena-launch-frame"
    >
      {/* Pinned dark: the hero art is drawn for a black page and there is no
        light design. */}
      <div
        ref={pageRef}
        className={`EthenaLaunch sds-theme-dark${returnScrollTop === undefined ? "" : " EthenaLaunch--returning"}`}
        onScroll={handleScroll}
        data-testid="ethena-launch"
      >
        <div
          ref={headerRef}
          className={`EthenaLaunch__header${isScrolled ? " EthenaLaunch__header--scrolled" : ""}`}
          data-testid="ethena-launch-header"
        >
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
          <button
            type="button"
            className="EthenaLaunch__scroll-hint"
            onClick={handleScrollToTokens}
            data-testid="ethena-launch-scroll-hint"
          >
            {t("Scroll to discover tokens")}
            <Icon.ChevronDown aria-hidden="true" />
          </button>
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
            swapUrl={sushiSwapUrl(USDE_CONTRACT_ID)}
            transferUrl={stargateUrl(USDE_ETHEREUM_ADDRESS, USDE_CONTRACT_ID)}
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
            swapUrl={sushiSwapUrl(SUSDE_CONTRACT_ID)}
            transferUrl={stargateUrl(SUSDE_ETHEREUM_ADDRESS, SUSDE_CONTRACT_ID)}
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
    </View.Inset>
  );
};
