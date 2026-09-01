import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import {
  Account,
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import * as ApiInternal from "@shared/api/internal";
import { makeDummyStore } from "popup/__testHelpers__";
import { initialState as txSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { useSubmitTxData } from "../useSubmitTxData";

// The emit site is the unit under test — emitMetric itself is mocked so no
// event ever reaches Amplitude, and every network dependency is mocked below.
jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
}));

// Post-success refetches are outside the telemetry contract; stub them so the
// test never touches the balance/collectible backends.
jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({
    fetchData: jest.fn().mockResolvedValue({ balances: [] }),
  }),
}));
jest.mock("helpers/hooks/useGetCollectibles", () => ({
  useGetCollectibles: () => ({
    fetchData: jest.fn().mockResolvedValue({}),
  }),
}));

const PUBLIC_KEY = Keypair.random().publicKey();
const DESTINATION = Keypair.random().publicKey();
const USDC_ISSUER = Keypair.random().publicKey();
const USDC_CANONICAL = `USDC:${USDC_ISSUER}`;
const PASSPHRASE = MAINNET_NETWORK_DETAILS.networkPassphrase;
const CUSTOM_NETWORK_DETAILS: NetworkDetails = {
  ...MAINNET_NETWORK_DETAILS,
  network: CUSTOM_NETWORK,
};

/** A real signed-shape swap transaction, so the settled-amount parse in the
 * swap.completed path runs against genuine XDR. */
const buildSwapXdr = (): string =>
  new TransactionBuilder(new Account(PUBLIC_KEY, "0"), {
    fee: "100",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "100",
        destination: PUBLIC_KEY,
        destAsset: new Asset("USDC", USDC_ISSUER),
        destMin: "90",
        path: [],
      }),
    )
    .setTimeout(0)
    .build()
    .toXdr();

/** Horizon TransactionResult XDR whose single op settled a
 * pathPaymentStrictSend for `stroops`. */
const buildResultXdr = (stroops: string): string => {
  const simple = new xdr.SimplePaymentResult({
    destination: xdr.PublicKey.publicKeyTypeEd25519(
      Keypair.random().rawPublicKey(),
    ),
    asset: new Asset("USDC", USDC_ISSUER).toXdrObject(),
    amount: BigInt(stroops),
  });
  const opResult = xdr.OperationResult.opInner(
    xdr.OperationResultTr.pathPaymentStrictSend(
      xdr.PathPaymentStrictSendResult.pathPaymentStrictSendSuccess(
        new xdr.PathPaymentStrictSendResultSuccess({
          offers: [],
          last: simple,
        }),
      ),
    ),
  );
  return new xdr.TransactionResult({
    feeCharged: BigInt("100"),
    result: xdr.TransactionResultResult.txSuccess([opResult]),
    ext: xdr.TransactionResultExt.v0(),
  }).toXdr("base64");
};

const makeState = ({
  asset,
  destinationAsset = "",
  amount = "100",
  destinationAmount = "",
  tokenPrices = {},
  preparedTransaction = buildSwapXdr(),
}: {
  asset: string;
  destinationAsset?: string;
  amount?: string;
  destinationAmount?: string;
  tokenPrices?: Record<string, { currentPrice: string }>;
  /** Null for a classic payment — see the regression test below. */
  preparedTransaction?: string | null;
}) => ({
  auth: {
    // The destination is "self-owned" so the addRecentAddress thunk (and its
    // backend call) is skipped — recent-address bookkeeping isn't telemetry.
    allAccounts: [{ publicKey: DESTINATION, name: "t", imported: false }],
    publicKey: PUBLIC_KEY,
  },
  cache: {
    balanceData: {},
    tokenPrices: { [PASSPHRASE]: { [PUBLIC_KEY]: tokenPrices } },
  },
  transactionSubmission: {
    ...txSubmissionInitialState,
    transactionData: {
      ...txSubmissionInitialState.transactionData,
      asset,
      amount,
      destination: DESTINATION,
      destinationAsset,
      destinationAmount,
      isCollectible: false,
    },
    transactionSimulation: {
      ...txSubmissionInitialState.transactionSimulation,
      preparedTransaction,
    },
  },
});

const renderSubmitHook = (
  state: ReturnType<typeof makeState>,
  networkDetails: NetworkDetails = MAINNET_NETWORK_DETAILS,
) => {
  const store = makeDummyStore(state);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    () =>
      useSubmitTxData({
        isHardwareWallet: false,
        networkDetails,
        publicKey: PUBLIC_KEY,
        xdr: buildSwapXdr(),
      }),
    { wrapper },
  );
};

const mockSubmitOk = (resultXdr: string) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      successful: true,
      hash: "txhash",
      result_xdr: resultXdr,
    }),
  }) as unknown as typeof fetch;
};

const mockSubmitRejected = (problemJson: Record<string, unknown>) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => problemJson,
  }) as unknown as typeof fetch;
};

const emitted = (eventName: string): Record<string, unknown> => {
  const call = (emitMetric as jest.Mock).mock.calls.find(
    ([name]) => name === eventName,
  );
  expect(call).toBeDefined();
  return call![1];
};

describe("useSubmitTxData terminal-event telemetry", () => {
  beforeEach(() => {
    jest
      .spyOn(ApiInternal, "signFreighterTransaction")
      .mockResolvedValue({ signedTransaction: buildSwapXdr() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (emitMetric as jest.Mock).mockClear();
  });

  it("payment.completed carries identity, token amount, and the source-leg USD family (confirmation_fetch)", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(makeState({ asset: "native" }));
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitted(METRIC_NAMES.paymentCompleted)).toEqual({
      payment_type: "payment",
      asset_code: "XLM",
      asset_type: "native",
      amount: 100,
      amount_usd_status: "ok",
      amount_usd: 50,
      amount_usd_rate: 0.5,
      amount_usd_source: "token_prices_v2",
      amount_usd_price_freshness: "confirmation_fetch",
    });
    expect(emitMetric).toHaveBeenCalledTimes(1);
  });

  it("falls back to the display-cache price when the confirmation fetch is still pending (cached_display)", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementation(() => new Promise(() => {}));
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(
      makeState({
        asset: "native",
        tokenPrices: { native: { currentPrice: "0.4" } },
      }),
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitted(METRIC_NAMES.paymentCompleted)).toEqual(
      expect.objectContaining({
        amount_usd_status: "ok",
        amount_usd: 40,
        amount_usd_rate: 0.4,
        amount_usd_price_freshness: "cached_display",
      }),
    );
  });

  it("swap.completed carries both legs: settled destination from the result XDR, quote, and both slippage figures", async () => {
    const getTokenPricesSpy = jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({
        native: { currentPrice: "0.5" },
        [USDC_CANONICAL]: { currentPrice: "0.55" },
      });
    // Settled for 88 USDC against a quote of 90.
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(
      makeState({
        asset: "native",
        destinationAsset: USDC_CANONICAL,
        destinationAmount: "90",
      }),
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: true });
    });

    // One request, both legs' canonical ids.
    expect(getTokenPricesSpy).toHaveBeenCalledTimes(1);
    expect(getTokenPricesSpy.mock.calls[0][0]).toEqual([
      "native",
      USDC_CANONICAL,
    ]);

    expect(emitted(METRIC_NAMES.swapCompleted)).toEqual({
      from_asset_code: "XLM",
      to_asset_code: "USDC",
      from_asset_type: "native",
      to_asset_issuer: USDC_ISSUER,
      to_asset_type: "classic",
      from_amount: 100,
      to_amount_quoted: 90,
      to_amount: 88,
      to_amount_usd_status: "ok",
      to_amount_usd: 48.4,
      to_amount_usd_rate: 0.55,
      // (88 * 0.55 - 100 * 0.5) / (100 * 0.5) * 100 = -3.2
      usd_slippage_pct: -3.2,
      // (88 - 90) / 90 * 100 = -2.2222… → -2.22
      execution_slippage_pct: -2.22,
      amount_usd_status: "ok",
      amount_usd: 50,
      amount_usd_rate: 0.5,
      amount_usd_source: "token_prices_v2",
      amount_usd_price_freshness: "confirmation_fetch",
    });
  });

  it("swap.failed carries from_amount, failure_category: slippage for a submit-time quote expiry, and no destination amounts", async () => {
    // Both legs priced (not the partial-fetch case, which has its own
    // coverage) - this test is about reason_code/failure_category.
    jest.spyOn(ApiInternal, "getTokenPrices").mockResolvedValue({
      native: { currentPrice: "0.5" },
      [USDC_CANONICAL]: { currentPrice: "1.0" },
    });
    mockSubmitRejected({
      status: 400,
      title: "Transaction Failed",
      extras: {
        result_codes: {
          transaction: "tx_failed",
          operations: ["op_under_dest_min"],
        },
      },
    });

    const { result } = renderSubmitHook(
      makeState({
        asset: "native",
        destinationAsset: USDC_CANONICAL,
        destinationAmount: "90",
      }),
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: true });
    });

    const props = emitted(METRIC_NAMES.swapFailed);
    expect(props).toEqual(
      expect.objectContaining({
        from_asset_code: "XLM",
        to_asset_code: "USDC",
        to_asset_issuer: USDC_ISSUER,
        to_asset_type: "classic",
        from_amount: 100,
        reason_code: "op_under_dest_min",
        failure_category: "slippage",
        amount_usd_status: "ok",
        amount_usd: 50,
      }),
    );
    expect(props).not.toHaveProperty("to_amount");
    expect(props).not.toHaveProperty("to_amount_usd");
    expect(props).not.toHaveProperty("to_amount_quoted");
  });

  it("payment.failed falls back to the transaction-level code when no operation ran (tx_bad_seq)", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitRejected({
      status: 400,
      title: "Transaction Failed",
      extras: {
        result_codes: {
          transaction: "tx_bad_seq",
          operations: [],
        },
      },
    });

    const { result } = renderSubmitHook(makeState({ asset: "native" }));
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitted(METRIC_NAMES.paymentFailed)).toEqual(
      expect.objectContaining({
        reason_code: "tx_bad_seq",
        failure_category: "sequence",
      }),
    );
  });

  it("payment.failed classifies an answered-without-a-verdict 5xx as transport", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitRejected({ status: 503, title: "Service Unavailable" });

    const { result } = renderSubmitHook(makeState({ asset: "native" }));
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitted(METRIC_NAMES.paymentFailed)).toEqual(
      expect.objectContaining({
        payment_type: "payment",
        asset_code: "XLM",
        amount: 100,
        reason_code: "unknown",
        failure_category: "transport",
      }),
    );
  });

  it("emits no_price (never 0) when the snapshot holds no price for the leg", async () => {
    jest.spyOn(ApiInternal, "getTokenPrices").mockResolvedValue({});
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(makeState({ asset: "native" }));
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    const props = emitted(METRIC_NAMES.paymentCompleted);
    expect(props.amount_usd_status).toBe("no_price");
    expect(props).not.toHaveProperty("amount_usd");
    expect(props).not.toHaveProperty("amount_usd_rate");
  });

  it("still submits (and emits) a classic payment, which has no prepared transaction", async () => {
    // Regression: simulateTx's "classic" arm returns a fee and no payload, so
    // transactionSimulation.preparedTransaction is null for every classic
    // payment — the built XDR reaches the hook via the `xdr` prop and the
    // signing step supplies signedXDR. Guarding on preparedTransaction here
    // threw before signing and broke the whole classic send flow.
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(
      makeState({ asset: "native", preparedTransaction: null }),
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitted(METRIC_NAMES.paymentCompleted)).toEqual(
      expect.objectContaining({
        payment_type: "payment",
        asset_code: "XLM",
        amount: 100,
        amount_usd_status: "ok",
        amount_usd: 50,
      }),
    );
  });

  it("emits no volume telemetry for a payment on a custom network", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(
      makeState({ asset: "native" }),
      CUSTOM_NETWORK_DETAILS,
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitMetric).not.toHaveBeenCalled();
  });

  it("emits no volume telemetry for a failed payment on a custom network", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });
    mockSubmitRejected({
      status: 400,
      title: "Transaction Failed",
      extras: {
        result_codes: { transaction: "tx_bad_seq", operations: [] },
      },
    });

    const { result } = renderSubmitHook(
      makeState({ asset: "native" }),
      CUSTOM_NETWORK_DETAILS,
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: false });
    });

    expect(emitMetric).not.toHaveBeenCalled();
  });

  it("emits no volume telemetry for a swap on a custom network", async () => {
    jest.spyOn(ApiInternal, "getTokenPrices").mockResolvedValue({
      native: { currentPrice: "0.5" },
      [USDC_CANONICAL]: { currentPrice: "0.55" },
    });
    mockSubmitOk(buildResultXdr("880000000"));

    const { result } = renderSubmitHook(
      makeState({
        asset: "native",
        destinationAsset: USDC_CANONICAL,
        destinationAmount: "90",
      }),
      CUSTOM_NETWORK_DETAILS,
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: true });
    });

    expect(emitMetric).not.toHaveBeenCalled();
  });

  it("emits no volume telemetry for a failed swap on a custom network", async () => {
    jest.spyOn(ApiInternal, "getTokenPrices").mockResolvedValue({
      native: { currentPrice: "0.5" },
      [USDC_CANONICAL]: { currentPrice: "1.0" },
    });
    mockSubmitRejected({
      status: 400,
      title: "Transaction Failed",
      extras: {
        result_codes: {
          transaction: "tx_failed",
          operations: ["op_under_dest_min"],
        },
      },
    });

    const { result } = renderSubmitHook(
      makeState({
        asset: "native",
        destinationAsset: USDC_CANONICAL,
        destinationAmount: "90",
      }),
      CUSTOM_NETWORK_DETAILS,
    );
    await act(async () => {
      await result.current.fetchData({ isSwap: true });
    });

    expect(emitMetric).not.toHaveBeenCalled();
  });
  describe("pre-submission (signing) failure", () => {
    const mockSigningFailure = () =>
      jest
        .spyOn(ApiInternal, "signFreighterTransaction")
        .mockRejectedValue(new Error("Incorrect password"));

    it("emits payment.failed with its failure properties and no volume data", async () => {
      mockSigningFailure();
      jest
        .spyOn(ApiInternal, "getTokenPrices")
        .mockResolvedValue({ native: { currentPrice: "0.5" } });

      const { result } = renderSubmitHook(makeState({ asset: "native" }));
      await act(async () => {
        await result.current.fetchData({ isSwap: false });
      });

      const props = emitted(METRIC_NAMES.paymentFailed);
      expect(props).toEqual({
        payment_type: "payment",
        asset_code: "XLM",
        reason_code: "unknown",
      });
      // The transaction never left the device, so it has no attempted volume.
      expect(props).not.toHaveProperty("amount");
      expect(props).not.toHaveProperty("amount_usd");
      expect(props).not.toHaveProperty("amount_usd_status");
      // ...and it is emphatically not a transport failure, which per the
      // catalog reads as "unresolved — may have settled".
      expect(props).not.toHaveProperty("failure_category");
    });

    it("emits swap.failed with both asset codes and no volume data", async () => {
      mockSigningFailure();
      jest.spyOn(ApiInternal, "getTokenPrices").mockResolvedValue({
        native: { currentPrice: "0.5" },
        [USDC_CANONICAL]: { currentPrice: "1.0" },
      });

      const { result } = renderSubmitHook(
        makeState({
          asset: "native",
          destinationAsset: USDC_CANONICAL,
          destinationAmount: "90",
        }),
      );
      await act(async () => {
        await result.current.fetchData({ isSwap: true });
      });

      expect(emitted(METRIC_NAMES.swapFailed)).toEqual({
        from_asset_code: "XLM",
        to_asset_code: "USDC",
        reason_code: "unknown",
      });
    });

    it("does not submit a classic payment whose signature failed", async () => {
      mockSigningFailure();
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      const { result } = renderSubmitHook(
        // preparedTransaction: null is the classic-payment shape, where a
        // failed signature used to leave signedXDR as "" and submit it.
        makeState({ asset: "native", preparedTransaction: null }),
      );
      await act(async () => {
        await result.current.fetchData({ isSwap: false });
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not submit the UNSIGNED prepared XDR when a token transfer's signature failed", async () => {
      mockSigningFailure();
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      const { result } = renderSubmitHook(
        // A Soroban/token transfer carries a prepared XDR, so `signedXDR` is
        // truthy even when signing failed — the guard has to key off whether
        // signing actually succeeded, not off the XDR being empty.
        makeState({ asset: "native", preparedTransaction: buildSwapXdr() }),
      );
      await act(async () => {
        await result.current.fetchData({ isSwap: false });
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("issues no confirmation price fetch when signing fails", async () => {
      mockSigningFailure();
      const pricesSpy = jest
        .spyOn(ApiInternal, "getTokenPrices")
        .mockResolvedValue({ native: { currentPrice: "0.5" } });

      const { result } = renderSubmitHook(makeState({ asset: "native" }));
      await act(async () => {
        await result.current.fetchData({ isSwap: false });
      });

      // The snapshot starts only once signing has succeeded, so a signing
      // failure never issues a price request it would just have to abort.
      expect(pricesSpy).not.toHaveBeenCalled();
    });
  });
});
