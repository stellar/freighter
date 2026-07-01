import React from "react";
import { render, waitFor, fireEvent, screen } from "@testing-library/react";

import {
  Wrapper,
  mockBalances,
  mockTestnetBalances,
  mockAccounts,
} from "../../__testHelpers__";
import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as BlockaidHelpers from "popup/helpers/blockaid";
import * as UseGetCollectibles from "helpers/hooks/useGetCollectibles";
import * as ExtensionMessaging from "@shared/api/helpers/extensionMessaging";
import * as TokenList from "@shared/api/helpers/token-list";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Send } from "popup/views/Send";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import * as AccountServices from "popup/ducks/accountServices";
import * as CheckSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as RouteHelpers from "popup/helpers/route";
import * as tokenPaymentActions from "popup/ducks/token-payment";
import * as GetIconHelper from "@shared/api/helpers/getIconUrlFromIssuer";
import { WalletType } from "@shared/constants/hardwareWallet";

jest.mock("lodash/debounce", () => jest.fn((fn) => fn));

jest
  .spyOn(GetIconHelper, "getIconUrlFromIssuer")
  .mockImplementation(() => Promise.resolve("icon_url"));

jest.spyOn(ApiInternal, "getAccountBalances").mockImplementation(() => {
  return Promise.resolve(mockBalances);
});

jest.spyOn(ApiInternal, "loadRecentAddresses").mockImplementation(() => {
  return Promise.resolve({ recentAddresses: [] });
});

jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() => {
  return Promise.resolve({
    hiddenAssets: {},
    error: "",
  });
});

jest.spyOn(ApiInternal, "getAssetIcons").mockImplementation(() => {
  return Promise.resolve({});
});

jest.spyOn(ApiInternal, "getTokenPrices").mockImplementation(() => {
  return Promise.resolve({});
});

jest.spyOn(RouteHelpers, "reRouteOnboarding").mockImplementation(() => {});
jest
  .spyOn(AccountServices, "hardwareWalletTypeSelector")
  .mockImplementation(() => WalletType.NONE);

jest.spyOn(UseGetCollectibles, "useGetCollectibles").mockImplementation(
  () =>
    ({
      state: { collections: [] },
      fetchData: () => Promise.resolve({ collections: [] }),
    }) as any,
);

jest
  .spyOn(ExtensionMessaging, "sendMessageToBackground")
  .mockImplementation(() => Promise.resolve({} as any));

jest
  .spyOn(TokenList, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([]));

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() => {
  return Promise.resolve({
    signedTransaction:
      "AAAAAgAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAAAAAAAAAvrwgAAAAAAAAAABHUtNEwAAAEBY/jSiXJNsA2NpiXrOi6Ll6RiIY7v8QZEEZviM8HmmzeI4FBP9wGZm7YMorQue+DK9KI5BEXDt3hi0VOA9gD8A",
  });
});

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => {
  return {
    recommendedFee: ".00001",
    networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
    fetchData: () => Promise.resolve({ recommendedFee: "00.1" }),
    isLoading: false,
  };
});

jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
  const setLoading = () => {};
  return {
    scanTx: () => Promise.resolve(null),
    setLoading,
    isLoading: false,
    data: null,
    error: null,
  };
});

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    StrKey: original.StrKey,
    Networks: original.Networks,
    Operation: original.Operation,
    Horizon: {
      Server: class {
        loadAccount() {
          return {
            sequenceNumber: () => 1,
            accountId: () => publicKey,
            incrementSequenceNumber: () => {},
          };
        }
      },
    },
    rpc: original.rpc,
    TransactionBuilder: original.TransactionBuilder,
  };
});

jest
  .spyOn(CheckSuspiciousAsset, "checkForSuspiciousAsset")
  .mockImplementation(({ issuer }: { issuer: string }) => {
    let isRevocable = false;
    let isNewAsset = false;
    let isInvalidDomain = false;

    if (issuer === "GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP") {
      isRevocable = true;
      isNewAsset = true;
      isInvalidDomain = true;
    }

    return Promise.resolve({ isRevocable, isNewAsset, isInvalidDomain });
  });

jest.mock("react-router-dom", () => {
  const ReactRouter = jest.requireActual("react-router-dom");
  return {
    ...ReactRouter,
    Redirect: ({ to }: any) => <div>redirect {to}</div>,
  };
});

const publicKey = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
// A destination distinct from the active account - sending to your own address
// is blocked ("You cannot send to yourself"), so payment-flow tests must use
// a different recipient.
const destinationPublicKey =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

describe("Send", () => {
  beforeEach(() => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
      return {
        scanTx: () => Promise.resolve(null),
        isLoading: false,
        data: null,
        error: null,
        setLoading: () => {},
      };
    });
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("token-list")).toBeDefined();
      expect(screen.queryByTestId("send-amount-amount-input")).toBeNull();
    });
  });

  it("starts on the token picker step when no asset is pre-selected", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("token-list")).toBeDefined();
    });
    expect(screen.queryByTestId("send-amount-amount-input")).toBeNull();
  });

  it("sending native asset on Mainnet works", async () => {
    await testPaymentFlow("native", true);
  });

  it("sending non-native asset on Mainnet with Blockaid validation and asset warnings", async () => {
    jest.spyOn(BlockaidHelpers, "scanAsset").mockImplementation(() =>
      Promise.resolve({
        address: "",
        chain: "stellar",
        attack_types: {},
        fees: {},
        malicious_score: "0.5",
        metadata: {},
        financial_stats: {},
        trading_limits: {},
        result_type: "Malicious",
        features: [
          { description: "", feature_id: "KNOWN_MALICIOUS", type: "Malicious" },
        ],
      }),
    );
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      true,
    );
  });

  it("sending non-native asset on Mainnet with Blockaid simulation error", async () => {
    jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
      const scanTxResult = {
        simulation: {
          error: "Sim failed",
        } as any,
        validation: {
          classification: "",
          features: [
            {
              feature_id: "KNOWN_MALICIOUS",
              type: "Malicious",
              address: "baz",
              description: "foo",
            },
          ] as any,
          description: "foo",
          reason: "",
          result_type: "Malicious" as any,
          status: "Success" as any,
        },
        request_id: "123",
      };
      return {
        scanTx: () => Promise.resolve(null),
        isLoading: false,
        data: scanTxResult,
        error: null,
        setLoading: () => {},
      };
    });
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      true,
    );
  });

  it("sending native asset on Testnet works", async () => {
    await testPaymentFlow("native", false);
  });

  it("sending non-native asset on Testnet works", async () => {
    await testPaymentFlow(
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      false,
    );
  });

  it("pre-populates destination from query params", async () => {
    const testDestination =
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
    render(
      <Wrapper
        routes={[
          `${ROUTES.sendPayment}?destination=${testDestination}&asset=native`,
        ]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              destination: testDestination,
            },
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      const input = screen.getByTestId("send-to-input") as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe(testDestination);
    });
  });

  it("blocks sending to your own account", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("token-list")).toBeDefined();
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId("SendRow-native"));
    });

    const input = await screen.findByTestId("send-to-input");
    // Entering the active account's own address is rejected.
    fireEvent.change(input, { target: { value: publicKey } });

    await waitFor(() => {
      expect(
        screen.getByText("You cannot send to yourself"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("send-to-suggestion-button"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("send-to-btn-continue"),
    ).not.toBeInTheDocument();
  });

  it("pre-populates asset from query params", async () => {
    const testAsset =
      "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
    render(
      <Wrapper
        routes={[`${ROUTES.sendPayment}?asset=${testAsset}`]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            assetDomains: {
              "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
                "domain.com",
            },
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("send-to-input")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("send-to-input"), {
      target: { value: destinationPublicKey },
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("send-to-suggestion-button"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("send-to-btn-continue")).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId("send-to-btn-continue"));

    await waitFor(() => {
      expect(screen.getByTestId("send-amount-amount-input")).toBeDefined();
      expect(screen.getAllByText(/USDC/).length).toBeGreaterThan(0);
    });
  });
  it("ignores invalid destination query param - malformed public key", async () => {
    render(
      <Wrapper
        routes={[
          `${ROUTES.sendPayment}?destination=INVALID_PUBLIC_KEY_123&asset=native`,
        ]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      const input = screen.getByTestId("send-to-input") as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe("");
    });
    expect(screen.queryByTestId("send-to-btn-continue")).toBeNull();
  });

  it("ignores invalid destination query param - empty string", async () => {
    render(
      <Wrapper
        routes={[`${ROUTES.sendPayment}?destination=&asset=native`]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      const input = screen.getByTestId("send-to-input") as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe("");
    });
    expect(screen.queryByTestId("send-to-btn-continue")).toBeNull();
  });

  it("ignores invalid asset query param - missing issuer", async () => {
    render(
      <Wrapper
        routes={[`${ROUTES.sendPayment}?asset=CODE:`]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      // ?asset param present → routes to DESTINATION, not token picker
      expect(screen.getByTestId("send-to-input")).toBeDefined();
      expect(screen.queryByTestId("token-list")).toBeNull();
    });
  });

  it("ignores invalid asset query param - no colon divider", async () => {
    render(
      <Wrapper
        routes={[`${ROUTES.sendPayment}?asset=NODIVIDER`]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("send-to-input")).toBeDefined();
      expect(screen.queryByTestId("token-list")).toBeNull();
    });
  });

  it("handles valid destination but invalid asset - uses default asset", async () => {
    const validDestination =
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
    render(
      <Wrapper
        routes={[
          `${ROUTES.sendPayment}?destination=${validDestination}&asset=MALFORMED`,
        ]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              destination: validDestination,
            },
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      const input = screen.getByTestId("send-to-input") as HTMLInputElement;
      expect(input.value).toBe(validDestination);
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("send-to-btn-continue")).toBeDefined();
      },
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByTestId("send-to-btn-continue"));

    await waitFor(() => {
      expect(screen.getByTestId("send-amount-amount-input")).toBeDefined();
      expect(screen.getAllByText(/XLM/).length).toBeGreaterThan(0);
    });
  });

  it("does not show continue button when destination is not set", async () => {
    render(
      <Wrapper
        routes={[`${ROUTES.sendPayment}?asset=native`]}
        state={{
          auth: {
            error: null,
            hasPrivateKey: true,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            accountBalances: mockBalances,
          },
          tokenPaymentSimulation: tokenPaymentActions.initialState,
        }}
      >
        <Send />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("send-to-input")).toBeDefined();
    });
    expect(screen.queryByTestId("send-to-btn-continue")).toBeNull();
  });
});

it("falls back to native asset when asset query param is invalid", async () => {
  const invalidAsset = "MALFORMED";
  render(
    <Wrapper
      routes={[`${ROUTES.sendPayment}?asset=${invalidAsset}`]}
      state={{
        auth: {
          error: null,
          hasPrivateKey: true,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          accountBalances: mockBalances,
        },
        tokenPaymentSimulation: tokenPaymentActions.initialState,
      }}
    >
      <Send />
    </Wrapper>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("send-to-input")).toBeDefined();
  });
});

const testPaymentFlow = async (asset: string, isMainnet: boolean) => {
  render(
    <Wrapper
      routes={[ROUTES.sendPayment]}
      state={{
        auth: {
          error: null,
          hasPrivateKey: true,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
        },
        settings: {
          networkDetails: isMainnet
            ? MAINNET_NETWORK_DETAILS
            : TESTNET_NETWORK_DETAILS,
          networksList: DEFAULT_NETWORKS,
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset,
          },
          accountBalances: isMainnet ? mockBalances : mockTestnetBalances,
          assetDomains: {
            "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
              "domain.com",
          },
        },
        tokenPaymentSimulation: tokenPaymentActions.initialState,
      }}
    >
      <Send />
    </Wrapper>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("token-list")).toBeDefined();
  });

  await waitFor(() => {
    fireEvent.click(screen.getByTestId(`SendRow-${asset}`));
  });

  await waitFor(() => {
    const input = screen.getByTestId("send-to-input");
    fireEvent.change(input, { target: { value: destinationPublicKey } });
  });

  await waitFor(
    async () => {
      const continueBtn = screen.getByTestId("send-to-btn-continue");
      await fireEvent.click(continueBtn);
    },
    { timeout: 3000 },
  );

  await waitFor(async () => {
    const input = screen.getByTestId("send-amount-amount-input");
    fireEvent.change(input, { target: { value: "5" } });
  });

  await waitFor(async () => {
    const continueBtn = screen.getByTestId("send-amount-btn-continue");
    expect(continueBtn).not.toBeDisabled();
    await fireEvent.click(continueBtn);
  });

  await waitFor(async () => {
    expect(screen.getByText("You are sending")).toBeInTheDocument();
    const sendBtn = screen.getByTestId("SubmitAction");
    expect(sendBtn).toBeInTheDocument();
    await fireEvent.click(sendBtn);
  });
};
