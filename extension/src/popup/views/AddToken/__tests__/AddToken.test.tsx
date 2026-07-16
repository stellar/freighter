/**
 * AddToken view – SAC vs SEP-41 routing test.
 *
 * Key challenge: the view's `useEffect` lists `handleTokenLookup` in its deps
 * array, so returning a fresh function each render triggers an infinite loop.
 * We solve this by returning a `useCallback`-stabilised reference from our
 * mock of `useTokenLookup`, using `jest.requireActual("react")` inside the
 * factory (the only way to call hooks inside a jest.mock factory).
 *
 * The `parsedSearchParam` URL helper expects base64-encoded JSON, so we spy
 * on it and return a plain params object to avoid the atob() crash.
 */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { AddToken } from "popup/views/AddToken";
import { Wrapper, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import * as UrlHelpers from "helpers/urls";
import { getAccountBalances } from "@shared/api/internal";

const SAC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const SEP41_CONTRACT =
  "CAAV3AE3VKD2P4TY7LWTQMMJHIJ4WOCZ5ANCIJPC3NRSERKVXNHBU2W7";

// ---------------------------------------------------------------------------
// Shared mutable state for useTokenLookup mock.
// Variable MUST start with "mock" (case-insensitive) for jest to allow it
// to be referenced inside jest.mock() factories (jest's hoisting scope rule).
// ---------------------------------------------------------------------------
// We use an object so the mock factory closes over the reference (not the
// value), allowing per-test updates to take effect.
const mockTokenLookupConfig = {
  issuer: SAC_ISSUER,
  noResults: false,
};

const mockAppDataConfig = {
  tokenIdList: [] as unknown,
};

const mockTokenIdsConfig = {
  tokenIds: [] as string[],
};

const mockAccountBalancesConfig = {
  balances: [] as Array<{
    token?: { code?: string; issuer?: { key?: string } };
  }>,
};

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock("helpers/hooks/useGetAppData", () => ({
  AppDataType: { RESOLVED: "resolved", REROUTE: "re-route" },
  useGetAppData: () => ({
    state: {
      state: "SUCCESS",
      data: {
        type: "resolved",
        account: {
          publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
          applicationState: "MNEMONIC_PHRASE_CONFIRMED",
          hasPrivateKey: true,
          allAccounts: [
            {
              hardwareWalletType: "",
              imported: false,
              name: "Account 1",
              publicKey:
                "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            },
          ],
          bipPath: "m/44'/148'/0'",
          tokenIdList: mockAppDataConfig.tokenIdList,
        },
        settings: {
          networkDetails: {
            isTestnet: true,
            network: "TESTNET",
            networkName: "Test SDF Network",
            otherNetworkName: "Mainnet",
            networkUrl: "https://horizon-testnet.stellar.org",
            networkPassphrase: "Test SDF Network ; September 2015",
          },
          networksList: [],
          hiddenAssets: {},
          allowList: [],
          error: "",
          isDataSharingAllowed: false,
          isMemoValidationEnabled: false,
          isHideDustEnabled: false,
          isOpenSidebarByDefault: false,
          assetsLists: [],
          autoLockTimeoutMinutes: 30,
          isExperimentalModeEnabled: false,
          isHashSigningEnabled: false,
          isNonSSLEnabled: false,
        },
      },
      error: null,
    },
    fetchData: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Sentinel mock — lets us assert whether the review was shown
jest.mock(
  "popup/components/manageAssets/ManageAssetRows/ChangeTrustInternal",
  () => ({
    ChangeTrustInternal: (props: any) => (
      <div data-testid="ChangeTrustInternal-mock">
        {/* Fires when the trustline tx succeeds — resolves the dApp request. */}
        <button type="button" onClick={props.onTransactionSuccess}>
          mock-transaction-success
        </button>
        {/* The Done button — only closes the popup. */}
        <button type="button" onClick={props.onSuccess}>
          mock-success
        </button>
      </div>
    ),
  }),
);

// useTokenLookup mock that returns a *stable* handleTokenLookup via useCallback
// so the view's useEffect([contractId, handleTokenLookup]) doesn't loop.
jest.mock("popup/helpers/useTokenLookup", () => {
  const { useCallback } = jest.requireActual<typeof import("react")>("react");
  return {
    useTokenLookup: ({
      setAssetRows,
      setIsSearching,
      setIsVerifiedToken,
      setIsVerificationInfoShowing,
    }: any) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const handleTokenLookup = useCallback(async (_contractId: string) => {
        if (mockTokenLookupConfig.noResults) {
          setAssetRows([]);
          setIsVerifiedToken(false);
          setIsVerificationInfoShowing(false);
          setIsSearching(false);
          return;
        }

        setAssetRows([
          {
            code: "USDC",
            // Read issuer from the shared config object (mutated per-test)
            issuer: mockTokenLookupConfig.issuer,
            contract:
              "CAAV3AE3VKD2P4TY7LWTQMMJHIJ4WOCZ5ANCIJPC3NRSERKVXNHBU2W7",
            domain: "centre.io",
          },
        ]);
        setIsVerifiedToken(true);
        setIsVerificationInfoShowing(false);
        setIsSearching(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return { handleTokenLookup };
    },
  };
});

// AddToken imports isContractId + isAssetSac from soroban. Stub both: a contract
// id is a "C..." string, and a token is a SAC when the resolved issuer is a
// classic G-address — matching the SAC vs SEP-41 setup driven by
// mockTokenLookupConfig.issuer above.
jest.mock("popup/helpers/soroban", () => ({
  isContractId: (id?: string) => typeof id === "string" && id.startsWith("C"),
  isAssetSac: ({ asset }: { asset: { issuer?: string } }) =>
    (asset?.issuer || "").startsWith("G"),
}));

jest.mock("@shared/api/helpers/getIconUrlFromIssuer", () => ({
  getIconUrlFromIssuer: jest.fn().mockResolvedValue(""),
}));

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    ...original,
    StellarToml: {
      Resolver: {
        resolve: jest.fn().mockResolvedValue({ CURRENCIES: [] }),
      },
    },
  };
});

jest.mock("popup/helpers/blockaid", () => ({
  scanAsset: jest.fn().mockResolvedValue(null),
  isAssetSuspicious: jest.fn().mockReturnValue(false),
  isAssetMalicious: jest.fn().mockReturnValue(false),
  shouldTreatAssetAsUnableToScan: jest.fn().mockReturnValue(false),
  useIsAssetSuspicious: jest.fn().mockReturnValue(() => false),
  useBlockaidOverrideState: jest.fn().mockReturnValue(null),
}));

jest.mock("@shared/api/internal", () => ({
  getBlockaidOverrideState: jest.fn().mockResolvedValue(null),
  getTokenIds: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockTokenIdsConfig.tokenIds)),
  getAccountBalances: jest.fn().mockImplementation(() =>
    Promise.resolve({
      balances: mockAccountBalancesConfig.balances,
      isFunded: true,
      subentryCount: 0,
    }),
  ),
}));

jest.mock("popup/helpers/useIsDomainListedAllowed", () => ({
  useIsDomainListedAllowed: jest
    .fn()
    .mockReturnValue({ isDomainListedAllowed: true }),
}));

jest.mock("popup/helpers/useMarkQueueActive", () => ({
  useMarkQueueActive: jest.fn(),
}));

jest.mock("popup/helpers/useNetworkFees", () => ({
  useNetworkFees: () => ({
    recommendedFee: "0.0011234",
    networkCongestion: "Low",
    fetchData: jest.fn().mockResolvedValue({ recommendedFee: "0.0011234" }),
  }),
}));

jest.mock("popup/helpers/route", () => ({
  reRouteOnboarding: jest.fn(),
}));

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn().mockResolvedValue(undefined),
  storeAccountMetricsData: jest.fn(),
  registerHandler: jest.fn(),
}));

jest.mock("popup/ducks/access", () => ({
  rejectToken: jest.fn(() => ({ type: "access/rejectToken" })),
  addToken: jest.fn(() => ({ type: "access/addToken" })),
}));

const mockCaptureException = jest.fn();

jest.mock("@sentry/browser", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockAddTokenAndClose = jest.fn();

jest.mock("popup/helpers/useSetupAddTokenFlow", () => ({
  useSetupAddTokenFlow: () => ({
    isConfirming: false,
    isPasswordRequired: false,
    submitError: "",
    clearSubmitError: jest.fn(),
    setIsPasswordRequired: jest.fn(),
    verifyPasswordThenAddToken: jest.fn(),
    handleApprove: jest.fn(),
    addTokenAndClose: mockAddTokenAndClose,
    rejectAndClose: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockState = {
  auth: {
    hasPrivateKey: true,
    publicKey: TEST_PUBLIC_KEY,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [
      {
        hardwareWalletType: "",
        imported: false,
        name: "Account 1",
        publicKey: TEST_PUBLIC_KEY,
      },
    ],
  },
  settings: {
    networkDetails: TESTNET_NETWORK_DETAILS,
  },
};

const renderAt = () =>
  render(
    <Wrapper state={mockState} routes={["/add-token"]}>
      <AddToken />
    </Wrapper>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddToken SAC / SEP-41 routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenLookupConfig.noResults = false;
    mockAppDataConfig.tokenIdList = [];
    mockTokenIdsConfig.tokenIds = [];
    mockAccountBalancesConfig.balances = [];
    // Bypass base64 URL parsing — inject params directly so atob() doesn't crash
    jest.spyOn(UrlHelpers, "parsedSearchParam").mockReturnValue({
      contractId: SEP41_CONTRACT,
      domain: "example.com",
      url: "https://example.com",
      uuid: "test-uuid",
      networkPassphrase: "",
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("SAC: Confirm opens the Change Trust review instead of submitting", async () => {
    // G... issuer → StrKey.isValidEd25519PublicKey = true → SAC branch
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal-mock"),
      ).toBeInTheDocument(),
    );
  });

  it("SAC: Add Token screen shows Fee and Token address rows", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    renderAt();

    await screen.findByTestId("add-token-approve");

    expect(
      screen.getByTestId("AddToken__Metadata__Row__Fee"),
    ).toHaveTextContent("0.0011234 XLM");
    expect(
      screen.getByTestId("AddToken__Metadata__Row__TokenAddress"),
    ).toBeInTheDocument();
  });

  it("SEP-41: Add Token screen does not show Fee or Token address rows", async () => {
    mockTokenLookupConfig.issuer = SEP41_CONTRACT;
    renderAt();

    await screen.findByTestId("add-token-approve");

    expect(
      screen.queryByTestId("AddToken__Metadata__Row__Fee"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("AddToken__Metadata__Row__TokenAddress"),
    ).not.toBeInTheDocument();
  });

  it("SAC: the trustline transaction (not the Done button) resolves the dApp request", async () => {
    // The dApp request resolves off the actual transaction via
    // onTransactionSuccess, not the Done button — so a successful trustline can
    // never report "user rejected". The addTokenAndClose internals (addToken
    // dispatch, metrics) are covered in useSetupAddTokenFlow.test.ts.
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    const txSuccessBtn = await screen.findByText("mock-transaction-success");
    await act(async () => {
      fireEvent.click(txSuccessBtn);
    });

    await waitFor(() => expect(mockAddTokenAndClose).toHaveBeenCalled());
  });

  it("SAC: Done waits for the in-flight resolution, then closes (no double dispatch)", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    mockAddTokenAndClose.mockResolvedValue(true);
    const closeSpy = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    // Transaction success resolves the dApp request exactly once.
    const txSuccessBtn = await screen.findByText("mock-transaction-success");
    await act(async () => {
      fireEvent.click(txSuccessBtn);
    });
    await waitFor(() => expect(mockAddTokenAndClose).toHaveBeenCalledTimes(1));

    // Done closes the popup and does NOT re-dispatch the add.
    const doneBtn = await screen.findByText("mock-success");
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(closeSpy).toHaveBeenCalled();
    expect(mockAddTokenAndClose).toHaveBeenCalledTimes(1);
    closeSpy.mockRestore();
  });

  it("SAC: Done does NOT close when the round-trip fails, so a live trustline is never reported rejected", async () => {
    // The trustline already succeeded on-chain, but the ADD_TOKEN round-trip
    // keeps failing (e.g. a messaging error that never reaches the background,
    // so response(true) is never delivered). Closing here would let
    // rejectOnWindowClose report the dApp a false "user rejected". So Done must
    // retry and, if it stays undeliverable, leave the popup open rather than
    // close.
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    mockAddTokenAndClose.mockResolvedValue(false);
    const closeSpy = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    const txSuccessBtn = await screen.findByText("mock-transaction-success");
    await act(async () => {
      fireEvent.click(txSuccessBtn);
    });

    const doneBtn = await screen.findByText("mock-success");
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    // Retried (eager attempt + retries) but never closed into a false decline.
    expect(mockAddTokenAndClose.mock.calls.length).toBeGreaterThan(1);
    expect(closeSpy).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("SAC: Done retries a transient round-trip failure, then closes on success", async () => {
    // The eager attempt fails but a retry delivers response(true); once the
    // dApp has actually been told success the popup closes normally.
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    mockAddTokenAndClose.mockResolvedValueOnce(false).mockResolvedValue(true);
    const closeSpy = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    const txSuccessBtn = await screen.findByText("mock-transaction-success");
    await act(async () => {
      fireEvent.click(txSuccessBtn);
    });

    const doneBtn = await screen.findByText("mock-success");
    await act(async () => {
      fireEvent.click(doneBtn);
    });

    expect(closeSpy).toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
    closeSpy.mockRestore();
  });

  it("SEP-41: Confirm does not open the Change Trust review", async () => {
    // C... issuer → StrKey.isValidEd25519PublicKey = false → SEP-41 branch
    mockTokenLookupConfig.issuer = SEP41_CONTRACT;
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    // Allow any pending state updates to settle
    await act(async () => {});

    expect(
      screen.queryByTestId("ChangeTrustInternal-mock"),
    ).not.toBeInTheDocument();
  });

  it("shows an error instead of an infinite loader when token lookup returns no results", async () => {
    mockTokenLookupConfig.noResults = true;
    renderAt();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to find your asset. Please try again with a different value.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("keeps confirm enabled for a duplicate SEP-41 token (SEP-41 tokens can be added more than once)", async () => {
    // SEP-41 tokens are only ever recorded locally — no trustline, no fee —
    // so re-adding one, unlike a SAC/classic trustline resubmit, must stay
    // allowed. The trustline wording never applies to SEP-41 either way.
    mockTokenLookupConfig.issuer = SEP41_CONTRACT;
    mockTokenIdsConfig.tokenIds = [SEP41_CONTRACT];
    mockAppDataConfig.tokenIdList = {
      TESTNET: [SEP41_CONTRACT],
    };
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(
      screen.queryByText("This token already has a trustline added."),
    ).not.toBeInTheDocument();
  });

  it("shows the trustline message for a duplicate SAC token", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    mockAccountBalancesConfig.balances = [
      { token: { code: "USDC", issuer: { key: SAC_ISSUER } } },
    ];
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(
      screen.getByText("This token already has a trustline added."),
    ).toBeInTheDocument();
  });

  it("SAC does not block based only on tokenIdList when no classic trustline exists", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    mockTokenIdsConfig.tokenIds = [SEP41_CONTRACT];
    mockAccountBalancesConfig.balances = [];
    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(
      screen.queryByText("This token already has a trustline added."),
    ).not.toBeInTheDocument();
  });

  it("keeps confirm disabled while SAC trustline check is loading", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;

    // Never-resolving balances so the SAC trustline check stays in-flight.
    // Persistent (not Once): the classic-trustline effect can run more than
    // once (dep settling), and a one-time mock would let a later call hit the
    // default resolved mock and end the loading state early. The enable-after-
    // resolve case is covered by the "does not block ... when no classic
    // trustline exists" test.
    (getAccountBalances as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    renderAt();

    await screen.findByTestId("add-token-approve");

    await waitFor(() =>
      expect(screen.getByTestId("add-token-approve")).toBeDisabled(),
    );
  });
});
