import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import {
  NonHeldAssetDescriptor,
  NonHeldAssetDetail,
} from "popup/components/account/AssetDetail/NonHeldAssetDetail";
import { truncateString } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import * as ApiInternal from "@shared/api/internal";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";
import { TokenChartSource } from "popup/components/account/TokenPriceChart/constants";

// CopyText copies through copy-to-clipboard, which puts the text in a span on
// <body> and runs execCommand("copy"); jsdom has no execCommand.
const mockCopy = jest.fn();
document.execCommand = jest.fn((command: string) => {
  if (command === "copy") {
    mockCopy(document.body.lastElementChild?.textContent);
  }
  return true;
});

jest.mock("popup/components/account/TokenPriceChart", () => ({
  ...jest.requireActual("popup/components/account/TokenPriceChart"),
  TokenPriceChart: () => <div data-testid="TokenPriceChart" />,
}));
jest.mock("popup/components/account/AssetAbout", () => ({
  AssetAbout: ({ assetDomain }: { assetDomain?: string }) => (
    <div data-testid="AssetAbout" data-domain={assetDomain} />
  ),
}));
jest.mock("popup/components/account/TokenStats", () => ({
  TokenStats: () => <div data-testid="TokenStats" />,
}));

const getTokenPricesSpy = jest.spyOn(ApiInternal, "getTokenPrices");
jest
  .spyOn(ApiInternal, "getAssetDomains")
  .mockImplementation(() => Promise.resolve({} as any));

const SHX_ISSUER = "GDSTRSHXHGJ7ZIVRBXEYE5Q74XUVCUSEKEBR7UCHEUUEK72N7I7KJ6JH";
const shx: NonHeldAssetDescriptor = {
  canonical: `SHX:${SHX_ISSUER}`,
  code: "SHX",
  issuer: SHX_ISSUER,
  domain: "stronghold.co",
  iconUrl: null,
};
const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
const tkn: NonHeldAssetDescriptor = {
  canonical: `TKN:${CONTRACT_ID}`,
  code: "TKN",
  issuer: CONTRACT_ID,
  contractId: CONTRACT_ID,
  name: "Token Name",
};

const makeState = (isChartEnabled = true) => ({
  auth: {
    error: null,
    applicationState: ApplicationState.PASSWORD_CREATED,
    publicKey: "G1",
    allAccounts: mockAccounts,
  },
  settings: { networkDetails: MAINNET_NETWORK_DETAILS },
  remoteConfig: {
    isInitialized: true,
    use_token_price_history: isChartEnabled,
  },
});

const renderDetail = (
  asset: NonHeldAssetDescriptor,
  {
    isChartEnabled = true,
    swapTo,
  }: {
    isChartEnabled?: boolean;
    swapTo?: { code: string; side: "to" | "from"; onSelect: () => void };
  } = {},
) =>
  render(
    <Wrapper routes={[ROUTES.account]} state={makeState(isChartEnabled)}>
      <NonHeldAssetDetail
        asset={asset}
        source={
          swapTo ? TokenChartSource.SwapPicker : TokenChartSource.AddToken
        }
        handleClose={() => null}
        swapTo={swapTo}
      />
    </Wrapper>,
  );

describe("NonHeldAssetDetail", () => {
  beforeEach(() => {
    getTokenPricesSpy.mockReset();
    getTokenPricesSpy.mockImplementation(() => Promise.resolve({}));
    mockCopy.mockClear();
  });

  it("renders a Swap to footer only when the caller offers it", async () => {
    const onSelect = jest.fn();
    const { unmount } = renderDetail(shx, {
      swapTo: { code: "SHX", side: "to", onSelect },
    });
    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    const button = screen.getByTestId("asset-detail-swap-to-button");
    expect(button).toHaveTextContent(/Swap to/);
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    unmount();

    const fromSide = renderDetail(shx, {
      swapTo: { code: "SHX", side: "from", onSelect },
    });
    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.getByTestId("asset-detail-swap-to-button")).toHaveTextContent(
      /Swap from/,
    );
    fromSide.unmount();

    renderDetail(shx);
    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.queryByTestId("asset-detail-swap-to-button")).toBeNull();
  });

  it("offers Cancel and Swap to anyway for a flagged token; Cancel closes the view", async () => {
    const onSelect = jest.fn();
    const handleClose = jest.fn();
    render(
      <Wrapper routes={[ROUTES.account]} state={makeState(true)}>
        <NonHeldAssetDetail
          asset={{ ...shx, isMalicious: true }}
          source={TokenChartSource.SwapPicker}
          handleClose={handleClose}
          swapTo={{ code: "SHX", side: "to", onSelect }}
        />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("AssetDetail__price"));

    expect(screen.queryByTestId("asset-detail-swap-to-button")).toBeNull();
    fireEvent.click(screen.getByTestId("asset-detail-swap-to-cancel"));
    expect(handleClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("asset-detail-swap-to-anyway"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders the body with no Balance or Value rows and no Hide/Remove", async () => {
    renderDetail(shx);

    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.getByTestId("TokenPriceChart")).toBeInTheDocument();
    expect(screen.queryByTestId("asset-detail-available-copy")).toBeNull();

    fireEvent.click(screen.getByAltText("asset options"));
    expect(await screen.findByText("Copy address")).toBeInTheDocument();
    expect(screen.getByText("Stellar.expert")).toBeInTheDocument();
    expect(screen.queryByTestId("AssetDetail__hide")).toBeNull();
    expect(screen.queryByTestId("asset-detail-remove-button")).toBeNull();
  });

  it("fetches the one token's price and shows it", async () => {
    getTokenPricesSpy.mockImplementation(() =>
      Promise.resolve({
        [shx.canonical]: {
          currentPrice: "1.25",
          percentagePriceChange24h: "2.5",
        },
      } as any),
    );

    renderDetail(shx);

    await waitFor(() =>
      expect(screen.getByTestId("AssetDetail__price")).toHaveTextContent(
        "$1.25",
      ),
    );
    expect(getTokenPricesSpy).toHaveBeenCalledTimes(1);
    expect(getTokenPricesSpy).toHaveBeenCalledWith(
      [shx.canonical],
      MAINNET_NETWORK_DETAILS,
      expect.any(AbortSignal),
    );
  });

  it("titles the header with the truncated contract id for a token with no code or name", async () => {
    renderDetail({
      canonical: `:${CONTRACT_ID}`,
      code: "",
      issuer: CONTRACT_ID,
      contractId: CONTRACT_ID,
    });

    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(
      screen.getAllByText(truncateString(CONTRACT_ID)).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("copies a contract token's contract id and links to its contract page", async () => {
    renderDetail(tkn);

    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.getByText("Token Name")).toBeInTheDocument();
    fireEvent.click(screen.getByAltText("asset options"));
    const link = (await screen.findByText("Stellar.expert")).closest("a");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/public/contract/${CONTRACT_ID}`,
    );
    fireEvent.click(screen.getByText("Copy address"));
    await waitFor(() => expect(mockCopy).toHaveBeenCalledWith(CONTRACT_ID));
  });

  it("falls back to the fetched domain when the descriptor carries an empty one", async () => {
    jest
      .spyOn(ApiInternal, "getAssetDomains")
      .mockImplementation(() =>
        Promise.resolve({ home_domain: "stronghold.co" } as any),
      );
    renderDetail({ ...shx, domain: "" });

    await waitFor(() =>
      expect(screen.getByTestId("AssetAbout")).toHaveAttribute(
        "data-domain",
        "stronghold.co",
      ),
    );
  });

  it("shows the flagged-token warning only for a flagged descriptor", async () => {
    const malicious = renderDetail({ ...shx, isMalicious: true });
    const warning = await screen.findByTestId("AssetDetail__warning");
    expect(warning).toHaveTextContent("This token was flagged as malicious");
    // Between the header and the chart, where mobile puts its banner.
    const price = screen.getByTestId("AssetDetail__price");
    expect(
      price.compareDocumentPosition(warning) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    malicious.unmount();

    const suspicious = renderDetail({ ...shx, isSuspicious: true });
    expect(await screen.findByTestId("AssetDetail__warning")).toHaveTextContent(
      "This token was flagged as suspicious",
    );
    suspicious.unmount();

    renderDetail(shx);
    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.queryByTestId("AssetDetail__warning")).toBeNull();
  });

  it("hides the chart, About and stats when the flag is off", async () => {
    renderDetail(shx, { isChartEnabled: false });

    await waitFor(() => screen.getByTestId("AssetDetail__price"));
    expect(screen.getByAltText("asset options")).toBeInTheDocument();
    expect(screen.queryByTestId("TokenPriceChart")).toBeNull();
    expect(screen.queryByTestId("AssetAbout")).toBeNull();
    expect(screen.queryByTestId("TokenStats")).toBeNull();
  });
});
