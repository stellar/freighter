import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { V2OperationType } from "@shared/api/types/backend-api";
import { makeDummyStore } from "popup/__testHelpers__";
import { AdvancedDetailsSheet } from "popup/components/accountHistory/TransactionDetailSheet/AdvancedDetailsSheet";
import {
  HistoryEntry,
  HistoryOperation,
} from "popup/views/AccountHistory/model";

jest.mock("@shared/api/internal", () => ({
  getContractSpec: jest.fn().mockRejectedValue(new Error("no spec")),
}));

// uploadContractWasm carrying 12 bytes of wasm (magic + version + non-UTF-8
// tail); sha256 of the blob is asserted below — real base64 xdr.Operation
const INVOKE_UPLOAD_WASM_XDR =
  "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAACAAAADABhc20BAAAA//6AgQAAAAA=";
const UPLOADED_WASM_SHA256 =
  "dc5edf33c4f98f25f29fba67875794abc17a776e84915e307f422674dd15c13f";

// usdcSac.decimals() — an invocation with ZERO args; real base64 xdr.Operation
const INVOKE_NO_ARGS_XDR =
  "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAAAAAAAAa3vzlmu5Slo92Bh1JTCUlt1ZZ+kKWpl9JnvKeVkd+SWAAAACGRlY2ltYWxzAAAAAAAAAAA=";

// usdcSac.transfer(self, account2, 404000000 i128) — real base64 xdr.Operation
const INVOKE_TRANSFER_XDR =
  "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAAAAAAAAa3vzlmu5Slo92Bh1JTCUlt1ZZ+kKWpl9JnvKeVkd+SWAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAEgAAAAAAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAKAAAAAAAAAAAAAAAAGBSNAAAAAAA=";

const op = (
  xdrStr: string,
  type: V2OperationType = "INVOKE_HOST_FUNCTION",
): HistoryOperation => ({
  id: "op-1",
  type,
  xdr: xdrStr,
  successful: true,
});

const makeEntry = (operations: HistoryOperation[] = []): HistoryEntry => ({
  id: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  kind: "contract",
  createdAt: "2024-04-08T14:33:00Z",
  rowIcon: { type: "contract" },
  primaryText: "Contract",
  secondaryText: "Contract",
  secondaryIcon: "contract",
  amounts: null,
  details: {
    title: "Contract",
    status: "success",
    fee: "0.0051234",
    rate: null,
    contractId: null,
    functionName: null,
    protocol: null,
    counterparty: null,
    balanceChanges: [],
    stateChangeCards: [],
    operations,
  },
});

const renderSheet = (entry: HistoryEntry, onBack = jest.fn()) => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [],
      publicKey: "GSELF",
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
    settings: {
      networkDetails: TESTNET_NETWORK_DETAILS,
    },
  });
  const utils = render(
    <Provider store={store}>
      <AdvancedDetailsSheet entry={entry} onBack={onBack} />
    </Provider>,
  );
  return { ...utils, onBack };
};

describe("AdvancedDetailsSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the truncated hash, operation count and fee", () => {
    renderSheet(makeEntry([op(INVOKE_TRANSFER_XDR)]));
    // hash is truncated with an ellipsis
    expect(screen.getByTestId("advanced-hash")).toHaveTextContent("…");
    // Operations count + fee summary rows
    expect(screen.getByTestId("advanced-summary")).toHaveTextContent(
      "Operations",
    );
    expect(screen.getByTestId("advanced-summary")).toHaveTextContent("1");
    expect(screen.getByTestId("advanced-summary")).toHaveTextContent(
      "0.0051234 XLM",
    );
  });

  it("decodes an invoke-host-function op into the operations breakdown", () => {
    renderSheet(makeEntry([op(INVOKE_TRANSFER_XDR)]));
    const details = screen.getByTestId("DetailsBody");
    expect(details).toHaveTextContent("Invoke Contract");
    expect(details).toHaveTextContent("transfer");
  });

  it("shows Parameters for an invocation with args, and omits header and row entirely for a no-arg call", () => {
    // transfer(from, to, amount) has parameters
    const withArgs = renderSheet(makeEntry([op(INVOKE_TRANSFER_XDR)]));
    expect(screen.getByText("Parameters")).toBeDefined();
    withArgs.unmount();

    // decimals() has none — no "Parameters" header hovering over an empty row
    renderSheet(makeEntry([op(INVOKE_NO_ARGS_XDR)]));
    expect(screen.queryByText("Parameters")).toBeNull();
    // the operation itself still renders
    expect(screen.getByText("decimals")).toBeDefined();
  });

  it("renders the uploaded wasm's hash as the parameter, never a text decode of the bytes", () => {
    renderSheet(makeEntry([op(INVOKE_UPLOAD_WASM_XDR)]));

    // The regression: the wasm blob used to be rendered via
    // Buffer.toString(), printing mojibake ("asm �`~~~ …"). The row must
    // show the SHA-256 the ledger stores the code under, truncated with the
    // full value copyable.
    // Appears in the operation's own Wasm Hash row AND the Parameters row —
    // both must show the hash, neither the bytes.
    expect(
      screen.getAllByText(
        `${UPLOADED_WASM_SHA256.slice(0, 8)}…${UPLOADED_WASM_SHA256.slice(-8)}`,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    // The old rendering decoded the blob as UTF-8; the fixture's non-UTF-8
    // tail decodes to U+FFFD replacement characters ("�"), the mojibake
    // signature. None may reach the DOM. (Not /asm/: the legitimate "Upload
    // Contract Wasm" label contains that substring.)
    expect(screen.queryByText(/\uFFFD/)).toBeNull();
  });

  it("renders no invoke content when there are no invoke-host-fn ops", () => {
    renderSheet(makeEntry([]));
    expect(screen.queryByText(/Invoke Contract/i)).toBeNull();
  });

  it("ignores operations whose xdr fails to decode", () => {
    renderSheet(makeEntry([op("not-valid-base64-xdr")]));
    expect(screen.queryByText(/Invoke Contract/i)).toBeNull();
    // summary still renders
    expect(screen.getByTestId("advanced-summary")).toBeInTheDocument();
  });

  it("calls onBack when the back button is clicked", () => {
    const { onBack } = renderSheet(makeEntry([]));
    fireEvent.click(screen.getByTestId("advanced-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
