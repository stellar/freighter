import React from "react";
import { Provider } from "react-redux";
import { useLocation } from "react-router-dom";
import { renderHook, act } from "@testing-library/react";
import { StrKey } from "stellar-sdk";
import {
  makeDummyStore,
  TEST_PUBLIC_KEY,
  mockCollectibles,
} from "popup/__testHelpers__";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { useSendQueryParams } from "../useSendQueryParams";
import {
  saveDestination,
  saveAsset,
  saveCollectibleData,
  saveIsCollectible,
  saveIsToken,
  saveFederationAddress,
} from "popup/ducks/transactionSubmission";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { saveCollections } from "popup/ducks/cache";
import * as StellarHelpers from "@shared/helpers/stellar";
import * as SorobanHelpers from "@shared/api/helpers/soroban";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
}));

jest.mock("@shared/helpers/stellar", () => ({
  ...jest.requireActual("@shared/helpers/stellar"),
  getAssetFromCanonical: jest.fn(),
}));

jest.mock("@shared/api/helpers/soroban", () => ({
  ...jest.requireActual("@shared/api/helpers/soroban"),
  isContractId: jest.fn(),
}));

describe("useSendQueryParams", () => {
  const mockUseLocation = useLocation as jest.Mock;

  const validEd25519PublicKey =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  const validContractId =
    "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  const validAsset =
    "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
  const collectionAddress =
    "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  const collectibleTokenId = "1";

  const defaultState = {
    auth: {
      publicKey: TEST_PUBLIC_KEY,
      allAccounts: [],
      applicationState: "MNEMONIC_PHRASE_CONFIRMED" as const,
    },
    settings: {
      networkDetails: MAINNET_NETWORK_DETAILS,
      networksList: [],
    },
    transactionSubmission: transactionSubmissionInitialState,
    cache: {
      collections: {
        [MAINNET_NETWORK_DETAILS.network]: {
          [TEST_PUBLIC_KEY]: mockCollectibles,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue({
      pathname: "/send",
      search: "",
      state: null,
    });
    jest.spyOn(StrKey, "isValidEd25519PublicKey").mockImplementation((key) => {
      return key === validEd25519PublicKey;
    });
    (SorobanHelpers.isContractId as jest.Mock).mockImplementation((id) => {
      return id === validContractId;
    });
    (StellarHelpers.getAssetFromCanonical as jest.Mock).mockImplementation(
      (canonical) => {
        if (canonical === validAsset) {
          return {
            code: "USDC",
            issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          };
        }
        throw new Error("Invalid asset");
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderHookWithStore = (state = defaultState) => {
    const store = makeDummyStore(state);
    const dispatchSpy = jest.spyOn(store, "dispatch");
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const hookResult = renderHook(() => useSendQueryParams(), {
      wrapper: Wrapper,
    });
    return { hookResult, store, dispatchSpy };
  };

  describe("Collectible query params", () => {
    it("should handle collectible params when collectible is found", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=${collectibleTokenId}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(true));
      expect(dispatchSpy).toHaveBeenCalledWith(saveIsToken(false));
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveCollectibleData({
          collectionAddress,
          tokenId: Number(collectibleTokenId),
          name: "Stellar Frog 1",
          collectionName: "Stellar Frogs",
          image:
            "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
        }),
      );
      // Should not call saveDestination or saveAsset when collectible is found
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveDestination(expect.anything()),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveAsset(expect.anything()),
      );
    });

    it("should handle collectible params when collectible is not found", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=INVALID_ADDRESS&collectible_token_id=999`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      // Should not set collectible data if not found
      expect(dispatchSpy).not.toHaveBeenCalledWith(saveIsCollectible(true));
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveCollectibleData(expect.anything()),
      );
    });

    it("should handle collectible params with missing metadata", () => {
      const collectionsWithMissingMetadata = [
        {
          collection: {
            address: collectionAddress,
            name: "Test Collection",
            symbol: "TEST",
            collectibles: [
              {
                collectionAddress,
                collectionName: "Test Collection",
                owner: TEST_PUBLIC_KEY,
                tokenId: "1",
                tokenUri: "",
                metadata: null,
              },
            ],
          },
        },
      ];

      const state = {
        ...defaultState,
        cache: {
          collections: {
            [MAINNET_NETWORK_DETAILS.network]: {
              [TEST_PUBLIC_KEY]: collectionsWithMissingMetadata,
            },
          },
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=1`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(true));
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveCollectibleData({
          collectionAddress,
          tokenId: 1,
          name: "",
          collectionName: "Test Collection",
          image: "",
        }),
      );
    });

    it("should handle collectible params when collections data is missing", () => {
      const state = {
        ...defaultState,
        cache: {
          collections: {},
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=${collectibleTokenId}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state);

      // Should not set collectible data if collections are missing
      expect(dispatchSpy).not.toHaveBeenCalledWith(saveIsCollectible(true));
    });
  });

  describe("Destination query param", () => {
    it("should save valid Ed25519 public key as destination", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?destination=${validEd25519PublicKey}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(
        saveDestination(validEd25519PublicKey),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(saveFederationAddress(""));
    });

    it("should save valid contract ID as destination", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?destination=${validContractId}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(
        saveDestination(validContractId),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(saveFederationAddress(""));
    });

    it("should ignore invalid destination", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "?destination=INVALID_DESTINATION",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveDestination(expect.anything()),
      );
    });

    it("should ignore empty destination", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "?destination=",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveDestination(expect.anything()),
      );
    });
  });

  describe("Asset query param", () => {
    it("should save valid asset", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?asset=${validAsset}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset(validAsset));
      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(false));
    });

    it("should default to native when asset param is invalid and srcAsset is not set", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: undefined,
          },
        },
      };
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "?asset=INVALID_ASSET",
        state: null,
      });

      (StellarHelpers.getAssetFromCanonical as jest.Mock).mockImplementation(
        () => {
          throw new Error("Invalid asset");
        },
      );

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset("native"));
      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(false));
    });

    it("should default to native when asset param is missing and srcAsset is not set", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: undefined,
          },
        },
      };
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset("native"));
      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(false));
    });

    it("should not override existing asset when invalid asset param is provided", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: "existing-asset",
          },
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "?asset=INVALID_ASSET",
        state: null,
      });

      (StellarHelpers.getAssetFromCanonical as jest.Mock).mockImplementation(
        () => {
          throw new Error("Invalid asset");
        },
      );

      const { dispatchSpy } = renderHookWithStore(state);

      // Should not call saveAsset when asset already exists
      expect(dispatchSpy).not.toHaveBeenCalledWith(saveAsset("native"));
    });

    it("should not set default asset when asset already exists", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: "existing-asset",
          },
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state);

      // Should not call saveAsset when asset already exists
      expect(dispatchSpy).not.toHaveBeenCalledWith(saveAsset("native"));
    });
  });

  describe("Combined query params", () => {
    it("should handle destination and asset together", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?destination=${validEd25519PublicKey}&asset=${validAsset}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(
        saveDestination(validEd25519PublicKey),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset(validAsset));
    });

    it("should prioritize collectible over destination and asset", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=${collectibleTokenId}&destination=${validEd25519PublicKey}&asset=${validAsset}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore();

      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(true));
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveCollectibleData(expect.anything()),
      );
      // Should not process destination or asset when collectible is found
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveDestination(expect.anything()),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        saveAsset(expect.anything()),
      );
    });

    it("should handle valid destination with invalid asset and srcAsset is not set", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: undefined,
          },
        },
      };
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?destination=${validEd25519PublicKey}&asset=INVALID_ASSET`,
        state: null,
      });

      (StellarHelpers.getAssetFromCanonical as jest.Mock).mockImplementation(
        () => {
          throw new Error("Invalid asset");
        },
      );

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(
        saveDestination(validEd25519PublicKey),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset("native"));
    });
  });

  describe("Network-specific behavior", () => {
    it("should work with testnet network", () => {
      const testnetState = {
        ...defaultState,
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: [],
        },
        cache: {
          collections: {
            [TESTNET_NETWORK_DETAILS.network]: {
              [TEST_PUBLIC_KEY]: mockCollectibles,
            },
          },
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=${collectibleTokenId}`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(testnetState);

      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(true));
    });
  });

  describe("Edge cases", () => {
    it("should handle empty query string and srcAsset is not set", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: undefined,
          },
        },
      };
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset("native"));
    });

    it("should handle query string with no relevant params and srcAsset is not set", () => {
      const state = {
        ...defaultState,
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          transactionData: {
            ...transactionSubmissionInitialState.transactionData,
            asset: undefined,
          },
        },
      };
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: "?other_param=value",
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveAsset("native"));
    });

    it("should handle collectible with partial metadata", () => {
      const collectionsWithPartialMetadata = [
        {
          collection: {
            address: collectionAddress,
            name: "Test Collection",
            symbol: "TEST",
            collectibles: [
              {
                collectionAddress,
                collectionName: "Test Collection",
                owner: TEST_PUBLIC_KEY,
                tokenId: "1",
                tokenUri: "",
                metadata: {
                  name: "Test NFT",
                  // Missing image and other fields
                },
              },
            ],
          },
        },
      ];

      const state = {
        ...defaultState,
        cache: {
          collections: {
            [MAINNET_NETWORK_DETAILS.network]: {
              [TEST_PUBLIC_KEY]: collectionsWithPartialMetadata,
            },
          },
        },
      };

      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?collection_address=${collectionAddress}&collectible_token_id=1`,
        state: null,
      });

      const { dispatchSpy } = renderHookWithStore(state as any);

      expect(dispatchSpy).toHaveBeenCalledWith(saveIsCollectible(true));
      expect(dispatchSpy).toHaveBeenCalledWith(
        saveCollectibleData({
          collectionAddress,
          tokenId: 1,
          name: "Test NFT",
          collectionName: "Test Collection",
          image: "",
        }),
      );
    });
  });

  describe("In-flow asset selection (issue #2871)", () => {
    // Repro: open a token's detail page -> Send (URL carries ?asset=<that token>
    // for the whole flow) -> switch to a different token -> submit. The success
    // ("Sent!") screen reads transactionData.asset, so the user's switched asset
    // must survive any effect re-run that happens after the switch (e.g. the
    // account/collections refresh triggered by a successful submit).
    const switchedAsset =
      "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

    it("does not revert the user's switched asset when the effect re-runs without a URL change", () => {
      mockUseLocation.mockReturnValue({
        pathname: "/send",
        search: `?asset=${validAsset}`,
        state: null,
      });

      const store = makeDummyStore(defaultState);
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );
      renderHook(() => useSendQueryParams(), { wrapper: Wrapper });

      // Mount pre-populates the asset from the URL param.
      expect(store.getState().transactionSubmission.transactionData.asset).toBe(
        validAsset,
      );

      // The user switches the source asset mid-flow (SendDestinationAsset).
      act(() => {
        store.dispatch(saveAsset(switchedAsset));
      });
      expect(store.getState().transactionSubmission.transactionData.asset).toBe(
        switchedAsset,
      );

      // An unrelated store change re-triggers the hook's effect without any URL
      // change (mirrors the account/collections refresh after a successful send,
      // which changes the collections dependency reference).
      act(() => {
        store.dispatch(
          saveCollections({
            networkDetails: MAINNET_NETWORK_DETAILS,
            publicKey: TEST_PUBLIC_KEY,
            collections: [],
          }),
        );
      });

      // The switched asset must survive — the URL param must not clobber it.
      expect(store.getState().transactionSubmission.transactionData.asset).toBe(
        switchedAsset,
      );
    });
  });
});
