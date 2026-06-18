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
import { addToken } from "popup/ducks/access";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

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
          tokenIdList: [],
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
}));

jest.mock("popup/helpers/useIsDomainListedAllowed", () => ({
  useIsDomainListedAllowed: jest
    .fn()
    .mockReturnValue({ isDomainListedAllowed: true }),
}));

jest.mock("popup/helpers/useMarkQueueActive", () => ({
  useMarkQueueActive: jest.fn(),
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

jest.mock("popup/helpers/useSetupAddTokenFlow", () => ({
  useSetupAddTokenFlow: () => ({
    isConfirming: false,
    isPasswordRequired: false,
    setIsPasswordRequired: jest.fn(),
    verifyPasswordThenAddToken: jest.fn(),
    handleApprove: jest.fn(),
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
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(
        screen.getByTestId("ChangeTrustInternal-mock"),
      ).toBeInTheDocument(),
    );
  });

  it("SAC: a successful review resolves the dApp request (addToken + metric + close)", async () => {
    mockTokenLookupConfig.issuer = SAC_ISSUER;
    const closeSpy = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);

    renderAt();

    const confirm = await screen.findByTestId("add-token-approve");
    fireEvent.click(confirm);

    const successBtn = await screen.findByText("mock-success");
    await act(async () => {
      fireEvent.click(successBtn);
    });

    await waitFor(() =>
      expect(jest.mocked(addToken)).toHaveBeenCalledWith({ uuid: "test-uuid" }),
    );
    expect(jest.mocked(emitMetric)).toHaveBeenCalledWith(
      METRIC_NAMES.tokenAddedApi,
    );
    expect(closeSpy).toHaveBeenCalled();
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
});
