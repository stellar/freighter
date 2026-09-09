import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";
import { Wrapper } from "popup/__testHelpers__";
import { ReserveSendError } from "popup/helpers/reserve";

const USDC = "USDC:GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";
const mockOption = {
  asset: USDC,
  code: "USDC",
  issuer: "GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2",
  available: "25.0000000",
  balanceId: "00".repeat(36),
};

jest.mock("popup/components/hardwareConnect/HardwareSign", () => ({
  HardwareSign: ({
    onSubmit,
  }: {
    onSubmit?: (signed?: string) => void;
  }) => (
    <div data-testid="HardwareSign__internal">
      <button type="button" onClick={() => onSubmit?.("HW_SIGNED")}>
        sign-hw
      </button>
    </div>
  ),
}));

jest.mock("popup/helpers/reserve", () => {
  const actual = jest.requireActual("popup/helpers/reserve");
  return {
    ...actual,
    useReserveBootstrap: () => ({
      options: [mockOption],
      isLoading: false,
    }),
    quoteAndBuildBootstrap: jest.fn(),
    createReserveClient: jest.fn(),
  };
});

import * as reserve from "popup/helpers/reserve";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

const publicKey = "GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA";

function renderActivate({
  reloadBalances = jest.fn().mockResolvedValue(undefined),
  hardware = false,
}: {
  reloadBalances?: jest.Mock;
  hardware?: boolean;
} = {}) {
  render(
    <Wrapper
      routes={["/"]}
      state={{
        auth: {
          publicKey,
          allAccounts: [
            {
              publicKey,
              name: "Test",
              imported: hardware,
              hardwareWalletType: hardware ? "Ledger" : "",
            },
          ],
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: [TESTNET_NETWORK_DETAILS],
        },
      }}
    >
      <NotFundedMessage
        canUseFriendbot={true}
        publicKey={publicKey}
        reloadBalances={reloadBalances}
      />
    </Wrapper>,
  );
  return reloadBalances;
}

describe("NotFundedMessage token activation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reserve.quoteAndBuildBootstrap as jest.Mock).mockResolvedValue({
      xdr: "XDR",
      quote: { id: "q" },
      fee: { amount: "0.34", code: "USDC", asset: USDC },
    });
  });

  it("offers Activate with the quoted ceiling, not the waiting balance", async () => {
    renderActivate();

    expect(
      await screen.findByTestId("activate-with-token"),
    ).toHaveTextContent("Activate with 0.34 USDC");
    expect(screen.getByTestId("activate-with-token")).not.toHaveTextContent(
      "25 USDC",
    );
    expect(
      screen.getByRole("button", { name: "Fund with Friendbot" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Add XLM")).not.toBeInTheDocument();
  });

  it("quotes, signs, submits, and refreshes balances", async () => {
    const user = userEvent.setup();
    const reloadBalances = renderActivate();
    const submit = jest.fn().mockResolvedValue({ hash: "h", ledger: 1 });
    (reserve.createReserveClient as jest.Mock).mockReturnValue({ submit });
    jest.spyOn(ApiInternal, "signFreighterTransaction").mockResolvedValue({
      signedTransaction: "SIGNED",
    } as any);

    await waitFor(() =>
      expect(screen.getByTestId("activate-with-token")).toHaveTextContent(
        "Activate with 0.34 USDC",
      ),
    );
    await user.click(screen.getByTestId("activate-with-token"));

    expect(reserve.quoteAndBuildBootstrap).toHaveBeenCalledWith({
      publicKey,
      option: mockOption,
      networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
    });
    expect(submit).toHaveBeenCalledWith({ id: "q" }, "SIGNED");
    expect(reloadBalances).toHaveBeenCalled();
  });

  it("shows a signing error without submitting", async () => {
    const user = userEvent.setup();
    renderActivate();
    const submit = jest.fn();
    (reserve.createReserveClient as jest.Mock).mockReturnValue({ submit });
    jest
      .spyOn(ApiInternal, "signFreighterTransaction")
      .mockRejectedValue(new Error("nope"));

    await waitFor(() =>
      expect(screen.getByTestId("activate-with-token")).toHaveTextContent(
        "Activate with 0.34 USDC",
      ),
    );
    await user.click(screen.getByTestId("activate-with-token"));

    expect(await screen.findByTestId("activate-error")).toHaveTextContent(
      "Could not sign the activation transaction.",
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it("routes hardware accounts through the hardware overlay", async () => {
    const user = userEvent.setup();
    const reloadBalances = renderActivate({ hardware: true });
    const submit = jest.fn().mockResolvedValue({ hash: "h", ledger: 1 });
    (reserve.createReserveClient as jest.Mock).mockReturnValue({ submit });
    const sign = jest.spyOn(ApiInternal, "signFreighterTransaction");

    await waitFor(() =>
      expect(screen.getByTestId("activate-with-token")).toHaveTextContent(
        "Activate with 0.34 USDC",
      ),
    );
    await user.click(screen.getByTestId("activate-with-token"));

    expect(sign).not.toHaveBeenCalled();
    expect(screen.getByTestId("HardwareSign__internal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "sign-hw" }));

    expect(submit).toHaveBeenCalledWith({ id: "q" }, "HW_SIGNED");
    expect(reloadBalances).toHaveBeenCalled();
  });

  it("shows a quote error without signing", async () => {
    (reserve.quoteAndBuildBootstrap as jest.Mock).mockRejectedValue(
      new ReserveSendError("Could not activate this wallet with {{asset}}.", {
        asset: "USDC",
      }),
    );
    renderActivate();
    const sign = jest.spyOn(ApiInternal, "signFreighterTransaction");

    expect(await screen.findByTestId("activate-error")).toHaveTextContent(
      "Could not activate this wallet with {{asset}}.",
    );
    expect(sign).not.toHaveBeenCalled();
  });
});
