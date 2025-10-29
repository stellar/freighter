import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import { ManageAssetRows } from "popup/components/manageAssets/ManageAssetRows";
import { Wrapper, mockBalances } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

import * as ApiInternal from "@shared/api/internal";
import * as StellarSdkServer from "@shared/api/helpers/stellarSdkServer";
import * as CheckForSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import * as GetManageAssetXDR from "popup/helpers/getManageAssetXDR";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import LedgerApi from "@ledgerhq/hw-app-str";

import { ROUTES } from "popup/constants/routes";

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

describe("ManageAssetRows", () => {
  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(mockBalances));

  jest.spyOn(StellarSdkServer, "stellarSdkServer").mockImplementation(
    () =>
      ({
        accounts: {
          accountId: () => ({
            call: () => Promise.resolve({ balances: mockBalances.balances }),
          }),
        },
      }) as any,
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

  jest
    .spyOn(GetManageAssetXDR, "getManageAssetXDR")
    .mockImplementation(() =>
      Promise.resolve(
        "AAAAAgAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAGQACLrWAAAAIQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layf/////////8AAAAAAAAAAA==",
      ),
    );

  afterEach(() => {
    jest.clearAllMocks();
  });
  it("renders ManageAssetRows with change trust internal", async () => {
    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });
  });
  it("renders change trust internal with hardware wallet flow and shows detect state", async () => {
    // we'll hang on detecting the device to allow us to assert on the detect state
    jest
      .spyOn(TransportWebHID, "list")
      .mockImplementationOnce(() => new Promise(() => {}));

    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(
        screen.getByTestId("HardwareSign__connect-text"),
      ).toHaveTextContent("Connect device to computer");
      expect(
        screen.getByTestId("HardwareSign__detect-device-button"),
      ).toHaveTextContent("Detecting");
    });
  });
  it("renders change trust internal with hardware wallet flow and shows connect state", async () => {
    // we'll hang on detecting the device to allow us to assert on the connect state
    // @ts-ignore
    LedgerApi.mockImplementationOnce(() => {
      return {
        getPublicKey: () =>
          Promise.resolve({
            rawPublicKey: jest.fn(),
          }),
        signTransaction: new Promise(() => {}),
      };
    });

    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(
        screen.getByTestId("HardwareSign__connect-text"),
      ).toHaveTextContent("Connect device to computer");
    });
  });
  it("renders change trust internal with hardware wallet flow and shows submitting state", async () => {
    // we'll hang on the /submit-tx endpoint to allow us to assert on the submitting state
    jest
      .spyOn(global, "fetch")
      .mockImplementation(() => Promise.resolve({} as any));

    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("SubmitTransaction__Title")).toHaveTextContent(
        "Submitting",
      );
    });
  });
  it("renders change trust internal with hardware wallet flow and submits trustline change successfully", async () => {
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

    const getAccountBalancesSpy = jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));

    jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() => {
      return Promise.resolve({
        hiddenAssets: {},
        error: "",
      });
    });

    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("SubmitTransaction__Title")).toHaveTextContent(
        "Submitting",
      );
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("SubmitTransaction__Title__Success"),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Done"));

      expect(getAccountBalancesSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText(" Add USDC trustline")).not.toBeInTheDocument();
    });
  });
  it("renders change trust internal with hardware wallet flow and fails to submit", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as any),
    );

    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));

    jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() => {
      return Promise.resolve({
        hiddenAssets: {},
        error: "",
      });
    });

    render(
      <Wrapper
        routes={[ROUTES.manageAssets]}
        state={{
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
                publicKey:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
              },
            ],
            publicKey:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <ManageAssetRows
          balances={{
            balances: [mockBalances?.balances?.native as any],
            isFunded: true,
            subentryCount: 1,
          }}
          verifiedAssetRows={[
            {
              code: "USDC",
              issuer:
                "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
              domain: "test.com",
              image: "icon.png",
            },
          ]}
          unverifiedAssetRows={[]}
          header="header text"
        />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("ManageAssetRowButton"));
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));

    await waitFor(() => screen.getByTestId("ChangeTrustInternal__Body"));
    await waitFor(() => {
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow"),
      ).toHaveTextContent("Confirm Transaction");
      expect(
        screen.getByTestId("ChangeTrustInternal__TitleRow__Domain"),
      ).toHaveTextContent("test.com");
      expect(
        screen.getByTestId("SignTransaction__TrustlineRow__Asset"),
      ).toHaveTextContent("USDC");
      expect(screen.getByTestId("KeyIdenticonKey")).toHaveTextContent(
        "GBKW…G3CH",
      );
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Label__Fee"),
      ).toHaveTextContent("Fee");
      expect(
        screen.getByTestId("ChangeTrustInternal__Metadata__Value__Fee"),
      ).toHaveTextContent("0.00001 XLM");
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("SubmitTransaction__Title")).toHaveTextContent(
        "Failed!",
      );
    });
  });
});
