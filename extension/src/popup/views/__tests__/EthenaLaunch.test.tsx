import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useNavigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { Wrapper } from "popup/__testHelpers__";
import { EthenaLaunch } from "popup/views/EthenaLaunch";

jest.mock("popup/helpers/navigate", () => ({
  ...jest.requireActual("popup/helpers/navigate"),
  openTab: jest.fn(),
}));

// The global mock returns keys verbatim; the per-token labels need their
// {{code}} filled in to be told apart.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values: Record<string, string> = {}) =>
      Object.entries(values).reduce(
        (text, [name, value]) => text.split(`{{${name}}}`).join(value),
        key,
      ),
  }),
}));

const { openTab } = jest.requireMock<typeof import("popup/helpers/navigate")>(
  "popup/helpers/navigate",
);

// From XLM (token0) to each token (token1), by their Mainnet token contracts.
const SUSHI_USDE_URL =
  "https://www.sushi.com/stellar/swap?token0=CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA&token1=CCNOV6XVI2O5BSTA3232GIRUQULDEBV7IWGKM6QKI6II5OIIQTU24JJN";
const SUSHI_SUSDE_URL =
  "https://www.sushi.com/stellar/swap?token0=CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA&token1=CACSKWC753QVGC4J6YPDBIR2BEHFVWIAE7CBSS3HOVYMN623OAIQYE2M";
const STARGATE_USDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x4c9EDD5852cd905f086C759E8383e09bff1E68B3&dstChain=stellar&dstToken=CCNOV6XVI2O5BSTA3232GIRUQULDEBV7IWGKM6QKI6II5OIIQTU24JJN";
const STARGATE_SUSDE_URL =
  "https://stargate.finance/?srcChain=ethereum&srcToken=0x9D39A5DE30e57443BfF2A8307A4256c8797A3497&dstChain=stellar&dstToken=CACSKWC753QVGC4J6YPDBIR2BEHFVWIAE7CBSS3HOVYMN623OAIQYE2M";

// The address screen, closed the way the real one is: back in history.
const ViewPublicKeyStub = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      view-public-key
    </button>
  );
};

const renderView = (destination?: string) =>
  render(
    <Wrapper
      state={{}}
      routes={[
        {
          pathname: ROUTES.ethenaLaunch,
          state: destination ? { destination } : undefined,
        },
      ]}
    >
      <Routes>
        <Route path={ROUTES.ethenaLaunch} element={<EthenaLaunch />} />
        <Route path={ROUTES.account} element={<div>account-home</div>} />
        <Route path={ROUTES.settings} element={<div>settings-home</div>} />
        <Route path={ROUTES.viewPublicKey} element={<ViewPublicKeyStub />} />
      </Routes>
    </Wrapper>,
  );

describe("EthenaLaunch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("introduces Ethena and both of its tokens", () => {
    renderView();

    expect(
      screen.getByRole("heading", { name: "Meet Ethena on Stellar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Discover USDe and sUSDe, now available on Stellar."),
    ).toBeInTheDocument();
    expect(screen.getByText("Scroll to discover tokens")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Dollar")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A synthetic dollar designed to maintain a value of $1.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Staked USDe")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A staked version of USDe that accrues variable protocol rewards.",
      ),
    ).toBeInTheDocument();
  });

  it("stays on the dark theme whatever the app theme is", () => {
    renderView();

    expect(screen.getByTestId("ethena-launch")).toHaveClass("sds-theme-dark");
  });

  it("puts the close button on a bar once the page scrolls", () => {
    renderView();
    const page = screen.getByTestId("ethena-launch");
    const header = screen.getByTestId("ethena-launch-header");

    // Clear over the hero at the top, where the wave runs up behind the X.
    expect(header).not.toHaveClass("EthenaLaunch__header--scrolled");

    fireEvent.scroll(page, { target: { scrollTop: 120 } });
    expect(header).toHaveClass("EthenaLaunch__header--scrolled");

    fireEvent.scroll(page, { target: { scrollTop: 0 } });
    expect(header).not.toHaveClass("EthenaLaunch__header--scrolled");
  });

  describe("scroll cue", () => {
    // jsdom has no layout: the cue 544px down a page scrolled 20px, under
    // the 80px bar.
    const layOut = () => {
      const page = screen.getByTestId("ethena-launch");
      const cue = screen.getByRole("button", {
        name: "Scroll to discover tokens",
      });
      const scrollTo = jest.fn();
      page.scrollTo = scrollTo;
      page.scrollTop = 20;
      jest
        .spyOn(page, "getBoundingClientRect")
        .mockReturnValue({ top: 0 } as DOMRect);
      jest
        .spyOn(cue, "getBoundingClientRect")
        .mockReturnValue({ top: 544 } as DOMRect);
      Object.defineProperty(
        screen.getByTestId("ethena-launch-header"),
        "offsetHeight",
        { configurable: true, value: 80 },
      );
      return { cue, scrollTo };
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("scrolls the tokens up until the cue is 60px below the bar", async () => {
      renderView();
      const { cue, scrollTo } = layOut();

      await userEvent.click(cue);

      expect(scrollTo).toHaveBeenCalledWith({
        top: 20 + 544 - 80 - 60,
        behavior: "smooth",
      });
    });

    it("jumps there instead under reduced motion", async () => {
      jest.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
          ({
            matches: query === "(prefers-reduced-motion: reduce)",
            media: query,
          }) as MediaQueryList,
      );
      renderView();
      const { cue, scrollTo } = layOut();

      await userEvent.click(cue);

      expect(scrollTo).toHaveBeenCalledWith({
        top: 20 + 544 - 80 - 60,
        behavior: "auto",
      });
    });
  });

  it("swaps from XLM to each token on Sushi", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-swap-usde"));
    await userEvent.click(screen.getByTestId("ethena-launch-swap-susde"));

    expect(screen.getByTestId("ethena-launch-swap-usde")).toHaveTextContent(
      "Swap to USDe",
    );
    expect(screen.getByTestId("ethena-launch-swap-susde")).toHaveTextContent(
      "Swap to sUSDe",
    );
    expect(openTab).toHaveBeenNthCalledWith(1, SUSHI_USDE_URL);
    expect(openTab).toHaveBeenNthCalledWith(2, SUSHI_SUSDE_URL);
  });

  it("transfers each token to Stellar through Stargate", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-transfer-usde"));
    await userEvent.click(screen.getByTestId("ethena-launch-transfer-susde"));

    expect(openTab).toHaveBeenNthCalledWith(1, STARGATE_USDE_URL);
    expect(openTab).toHaveBeenNthCalledWith(2, STARGATE_SUSDE_URL);
  });

  it("receives USDe on the wallet's address screen", async () => {
    renderView();

    expect(screen.getByTestId("ethena-launch-receive-usde")).toHaveTextContent(
      "Receive USDe",
    );
    await userEvent.click(screen.getByTestId("ethena-launch-receive-usde"));

    expect(await screen.findByText("view-public-key")).toBeInTheDocument();
  });

  it("receives sUSDe on the wallet's address screen", async () => {
    renderView();

    expect(screen.getByTestId("ethena-launch-receive-susde")).toHaveTextContent(
      "Receive sUSDe",
    );
    await userEvent.click(screen.getByTestId("ethena-launch-receive-susde"));

    expect(await screen.findByText("view-public-key")).toBeInTheDocument();
  });

  it("comes back from Receive as it was left: same scroll, no intro", async () => {
    renderView();
    const page = screen.getByTestId("ethena-launch");
    expect(page).not.toHaveClass("EthenaLaunch--returning");
    page.scrollTop = 420;
    fireEvent.scroll(page);

    await userEvent.click(screen.getByTestId("ethena-launch-receive-usde"));
    await userEvent.click(await screen.findByText("view-public-key"));

    const returned = await screen.findByTestId("ethena-launch");
    expect(returned).toHaveClass("EthenaLaunch--returning");
    expect(returned.scrollTop).toBe(420);
    expect(screen.getByTestId("ethena-launch-header")).toHaveClass(
      "EthenaLaunch__header--scrolled",
    );
  });

  it("still closes to its destination after a trip to Receive", async () => {
    renderView(ROUTES.settings);

    await userEvent.click(screen.getByTestId("ethena-launch-receive-usde"));
    await userEvent.click(await screen.findByText("view-public-key"));
    await userEvent.click(await screen.findByTestId("ethena-launch-close"));

    expect(await screen.findByText("settings-home")).toBeInTheDocument();
  });

  it("links out to Ethena's docs", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-learn-more"));

    expect(openTab).toHaveBeenCalledWith("https://docs.ethena.fi/");
  });

  it("closes to the destination it was given", async () => {
    renderView(ROUTES.settings);

    await userEvent.click(screen.getByTestId("ethena-launch-close"));

    expect(await screen.findByText("settings-home")).toBeInTheDocument();
  });

  it("closes to its destination on Esc, keeping the popup open", async () => {
    renderView(ROUTES.settings);

    // fireEvent returns false when the key was marked handled, which is what
    // stops Chrome closing the popup on Esc.
    expect(fireEvent.keyDown(document, { key: "Escape" })).toBe(false);

    expect(await screen.findByText("settings-home")).toBeInTheDocument();
  });

  it("closes to the account view when no destination was given", async () => {
    renderView();

    await userEvent.click(screen.getByTestId("ethena-launch-close"));

    expect(await screen.findByText("account-home")).toBeInTheDocument();
  });
});
