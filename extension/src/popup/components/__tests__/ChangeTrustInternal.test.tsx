import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import { BASE_FEE } from "stellar-sdk";

import { ChangeTrustInternal } from "popup/components/manageAssets/ManageAssetRows/ChangeTrustInternal";
import { Wrapper, mockBalances } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";

import * as GetManageAssetXDR from "popup/helpers/getManageAssetXDR";
import * as ApiInternal from "@shared/api/internal";
import * as CheckForSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import * as StellarSdkServer from "@shared/api/helpers/stellarSdkServer";

const TEST_TX = {
  signatureBase: () => "signatureBase",
  toXDR: () => "toXDR",
  _networkPassphrase: "Test SDF Network ; September 2015",
  _tx: {},
  signatures: [],
  fee: "100",
  _envelopeType: { name: "envelopeTypeTx", value: 2 },
  _memo: {},
  _sequence: "2457228099452961",
  _source: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
  _timeBounds: { minTime: "0", maxTime: "0" },
  operations: [
    {
      type: "changeTrust",
      line: {
        code: "USDC",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      },
      limit: "922337203685.4775807",
    },
  ],
};

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    BASE_FEE: original.BASE_FEE,
    Operation: original.Operation,
    Networks: original.Networks,
    Horizon: original.Horizon,
    rpc: original.rpc,
    StrKey: {
      ...original.StrKey,
      encodeEd25519PublicKey: () =>
        "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
    },
    TransactionBuilder: {
      fromXDR: () => TEST_TX as any,
    },
    Keypair: {
      fromPublicKey: () => ({
        signatureHint: () => "signatureHint",
      }),
    },
    xdr: {
      DecoratedSignature: original.xdr.DecoratedSignature,
    },
  };
});

jest.mock("@ledgerhq/hw-transport-webhid", () => {
  const original = jest.requireActual("@ledgerhq/hw-transport-webhid");
  return {
    ...original,
    create: () => Promise.resolve({ close: () => Promise.resolve() }),
    list: () => Promise.resolve([{ close: () => Promise.resolve() }]),
    request: () => Promise.resolve({ close: () => Promise.resolve() }),
  };
});

jest.mock("@ledgerhq/hw-app-str", () => {
  return jest.fn().mockImplementation(() => {
    return {
      getPublicKey: () =>
        Promise.resolve({
          rawPublicKey: jest.fn(),
        }),
      signTransaction: () => Promise.resolve({ signature: "L1" }),
    };
  });
});

// Ledger account matching keys used by ManageAssetRows tests
const LEDGER_PUBLIC_KEY =
  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH";

const PRELOADED_STATE = {
  auth: {
    hasPrivateKey: true,
    allAccounts: [
      {
        hardwareWalletType: "",
        imported: false,
        name: "Account 1",
        publicKey: "G1",
      },
      {
        hardwareWalletType: "",
        imported: true,
        name: "Account 2",
        publicKey: "G2",
      },
      {
        hardwareWalletType: "Ledger",
        imported: true,
        name: "Ledger 1",
        publicKey: LEDGER_PUBLIC_KEY,
      },
    ],
    publicKey: LEDGER_PUBLIC_KEY,
  },
  settings: {
    networkDetails: TESTNET_NETWORK_DETAILS,
  },
};

const ASSET = {
  code: "USDC",
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  image: null,
  domain: "centre.io",
  contract: "",
};

const renderComponent = (props: Record<string, unknown> = {}) =>
  render(
    <Wrapper state={PRELOADED_STATE} routes={["/"]}>
      <ChangeTrustInternal
        asset={ASSET}
        addTrustline
        publicKey={LEDGER_PUBLIC_KEY}
        networkDetails={TESTNET_NETWORK_DETAILS}
        onCancel={jest.fn()}
        {...props}
      />
    </Wrapper>,
  );

describe("ChangeTrustInternal", () => {
  jest
    .spyOn(GetManageAssetXDR, "getManageAssetXDR")
    .mockImplementation(() =>
      Promise.resolve(
        "AAAAAgAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAGQACLrWAAAAIQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layf/////////8AAAAAAAAAAA==",
      ),
    );

  jest
    .spyOn(CheckForSuspiciousAsset, "checkForSuspiciousAsset")
    .mockImplementation(() =>
      Promise.resolve({ isRevocable: false, isInvalidDomain: false }),
    );

  jest.spyOn(BlockaidHelpers, "scanAsset").mockImplementation(() =>
    Promise.resolve({
      result_type: "Benign",
      address: "",
      chain: "stellar",
      attack_types: {},
      fees: {},
    } as any),
  );

  jest.spyOn(StellarSdkServer, "stellarSdkServer").mockImplementation(
    () =>
      ({
        accounts: {
          accountId: () => ({
            call: () => Promise.resolve({ balances: [] }),
          }),
        },
      }) as any,
  );

  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(mockBalances));

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls onSuccess (not onCancel) after a successful submit", async () => {
    const onSuccess = jest.fn();
    const onCancel = jest.fn();

    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          envelope_xdr:
            "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAYjdAAAA9gAAAAEAAAAAAAAAAAAAAABmXjffAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAACYFzNOyHT8GgwiyzcOOhwLtCctwM/RiSnrFp7JOe8xeAAAAAAAAAAAAAAAAAAAAAcskg+QAAABAA/rRMU+KKsxCX1pDBuCvYDz+eQTCsY9bzgPU4J+Xe3vOWUa8YOzWlL3N3zlxHVx9hsB7a8dpSXMSAINjjsY4Dg==",
          hash: "hash",
          successful: true,
        }),
      } as any),
    );

    jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
      Promise.resolve({
        hiddenAssets: {},
        error: "",
      }),
    );

    renderComponent({ onSuccess, onCancel });

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal__Body"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() =>
      expect(screen.getByTestId("SubmitTransaction__Title")).toHaveTextContent(
        "Submitting",
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("SubmitTransaction__Title__Success"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Done"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel on Done when onSuccess is not provided (backward-compatible default)", async () => {
    const onCancel = jest.fn();

    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          envelope_xdr: "AAAAAgAAAA==",
          hash: "hash",
          successful: true,
        }),
      } as any),
    );

    jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
      Promise.resolve({
        hiddenAssets: {},
        error: "",
      }),
    );

    renderComponent({ onCancel });

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal__Body"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() =>
      expect(
        screen.getByTestId("SubmitTransaction__Title__Success"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Done"));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it("shows Issuer and Account reserve rows only when showSacDisclosure is set", async () => {
    const { rerender } = renderComponent({ showSacDisclosure: false });

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal__Body"),
      ).toBeInTheDocument(),
    );

    expect(
      screen.queryByTestId("ChangeTrustInternal__Metadata__Row__Reserve"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ChangeTrustInternal__Metadata__Row__Issuer"),
    ).not.toBeInTheDocument();

    rerender(
      <Wrapper state={PRELOADED_STATE} routes={["/"]}>
        <ChangeTrustInternal
          asset={ASSET}
          addTrustline
          publicKey={LEDGER_PUBLIC_KEY}
          networkDetails={TESTNET_NETWORK_DETAILS}
          onCancel={jest.fn()}
          showSacDisclosure
        />
      </Wrapper>,
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Row__Reserve"),
      ).toHaveTextContent("0.5 XLM"),
    );

    expect(
      screen.getByTestId("ChangeTrustInternal__Metadata__Row__Issuer"),
    ).toBeInTheDocument();
  });

  it("does not display the raw BASE_FEE stroops value as the XLM fee (regression for 100 XLM bug)", async () => {
    // Reproduce the pre-fetch state of useNetworkFees, where recommendedFee is
    // the raw BASE_FEE in stroops ("100"). The seed effect must NOT promote this
    // into the XLM-denominated `fee` (which would render and charge "100 XLM").
    const spy = jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      recommendedFee: BASE_FEE,
      networkCongestion: "" as UseNetworkFees.NetworkCongestion,
      fetchData: jest.fn().mockResolvedValue({ recommendedFee: BASE_FEE }),
    });

    renderComponent({ showSacDisclosure: true });

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal__Body"),
      ).toBeInTheDocument(),
    );

    const feeValue = screen.getByTestId(
      "ChangeTrustInternal__Metadata__Value__Fee",
    );
    // baseFeeStroops = stroopToXlm(BASE_FEE) = "0.00001"
    expect(feeValue).toHaveTextContent("0.00001 XLM");
    expect(feeValue).not.toHaveTextContent("100 XLM");

    spy.mockRestore();
  });
});
