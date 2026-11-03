import React from "react";
import { render, waitFor } from "@testing-library/react";

import { SendingTransaction } from "popup/components/InternalTransaction/SubmitTransaction";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";
import * as ApiInternal from "@shared/api/internal";
import { initialState as txInitialState } from "popup/ducks/transactionSubmission";
import { emitMetric } from "helpers/metrics";

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));
const mockedEmitMetric = emitMetric as jest.Mock;

const mockHasPrivateKeyAccount = {
  name: "Account 1",
  publicKey: "G1",
  applicationState: ApplicationState.PASSWORD_CREATED,
  allAccounts: mockAccounts,
  tokenIdList: [],
  hasPrivateKey: true,
} as any;

jest
  .spyOn(ApiInternal, "loadAccount")
  .mockImplementation(() => Promise.resolve(mockHasPrivateKeyAccount));
const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

/**
 * A real, parseable XDR carrying a pathPaymentStrictSend op — not a
 * placeholder string.
 *
 * The submit hook parses the signed XDR (to locate the pathPaymentStrictSend
 * op for the settled-amount read) BEFORE it emits `swap.completed`, and the
 * whole block sits inside a try/catch. A placeholder therefore throws at the
 * parse and silently suppresses the very event this file asserts on, which
 * looks identical to the tag never being attached. Built with the same
 * `getSdk` the hook itself uses so the two always agree.
 */
const buildSwapXdr = () => {
  const Sdk = getSdk(TESTNET_NETWORK_DETAILS.networkPassphrase);
  const account = new Sdk.Account(USDC_ISSUER, "0");
  return new Sdk.TransactionBuilder(account, {
    fee: Sdk.BASE_FEE,
    networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
  })
    .addOperation(
      Sdk.Operation.pathPaymentStrictSend({
        sendAsset: Sdk.Asset.native(),
        sendAmount: "1",
        destination: USDC_ISSUER,
        destAsset: new Sdk.Asset("USDC", USDC_ISSUER),
        destMin: "0.1",
        path: [],
      }),
    )
    .setTimeout(30)
    .build()
    .toXdr();
};

const SIGNED_SWAP_XDR = buildSwapXdr();

jest
  .spyOn(ApiInternal, "signFreighterTransaction")
  .mockImplementation(() =>
    Promise.resolve({ signedTransaction: SIGNED_SWAP_XDR }),
  );
jest
  .spyOn(ApiInternal, "submitFreighterTransaction")
  .mockImplementation(() => Promise.resolve({ successful: true } as any));

// Non-custom networks submit through a raw fetch to INDEXER_URL/submit-tx.
jest.spyOn(global, "fetch").mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ successful: true, hash: "h" }),
} as unknown as Response);

const USDC_CANONICAL =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

const renderSwapSubmit = (swapSource: string | null) =>
  render(
    <Wrapper
      // The swap route makes useIsSwap() true for the submit hook.
      routes={[ROUTES.swap]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey: "G1",
          allAccounts: mockAccounts,
          hasPrivateKey: true,
        },
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
        },
        transactionSubmission: {
          ...txInitialState,
          transactionData: {
            ...txInitialState.transactionData,
            asset: "native",
            destinationAsset: USDC_CANONICAL,
            swapSource,
          },
        },
      }}
    >
      <SendingTransaction xdr="xdr" goBack={() => {}} />
    </Wrapper>,
  );

describe("swap.completed source property", () => {
  afterEach(() => {
    mockedEmitMetric.mockReset();
  });

  it("carries source: token_details when the swap was entered from the detail view", async () => {
    renderSwapSubmit("token_details");

    // objectContaining, not an exact match: `swap.completed` also carries the
    // volume-telemetry properties (asset types/issuers, amounts, the
    // amount_usd family). Those are asserted by the volume telemetry tests —
    // this file owns the entry-point tag alone, and pinning the whole payload
    // here would make it fail on every unrelated property added later.
    await waitFor(() =>
      expect(mockedEmitMetric).toHaveBeenCalledWith(
        "swap.completed",
        expect.objectContaining({
          from_asset_code: "XLM",
          to_asset_code: "USDC",
          source: "token_details",
        }),
      ),
    );
  });

  it("omits source entirely for swaps entered elsewhere", async () => {
    renderSwapSubmit(null);

    // Absence is the whole point of this case, and objectContaining cannot
    // express it — it ignores unlisted keys. Assert on the emitted payload
    // directly so a `source: undefined` regression is caught.
    await waitFor(() =>
      expect(mockedEmitMetric).toHaveBeenCalledWith(
        "swap.completed",
        expect.objectContaining({
          from_asset_code: "XLM",
          to_asset_code: "USDC",
        }),
      ),
    );

    const swapCompletedCall = mockedEmitMetric.mock.calls.find(
      ([name]) => name === "swap.completed",
    );
    expect(swapCompletedCall).toBeDefined();
    expect(swapCompletedCall![1]).not.toHaveProperty("source");
  });
});
