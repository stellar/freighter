import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { useGetCollectibles } from "../hooks/useGetCollectibles";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as CollectiblesCache from "helpers/utils/collectibles/collectiblesCache";
import * as InternalApi from "@shared/api/internal";
import * as FetchCollectiblesApi from "@shared/api/helpers/fetchCollectibles";
import * as ImagePreloader from "helpers/utils/collectibles/imagePreloader";

jest.mock("helpers/utils/collectibles/collectiblesCache", () => ({
  getCachedCollections: jest.fn(),
  hasValidCache: jest.fn(),
}));
jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getCollectibles: jest.fn(),
}));
jest.mock("@shared/api/helpers/fetchCollectibles", () => ({
  fetchCollectibles: jest.fn(),
}));
jest.mock("helpers/utils/collectibles/imagePreloader", () => ({
  preloadImages: jest.fn().mockResolvedValue(undefined),
  extractImageUrls: jest.fn().mockReturnValue([]),
}));

const buildWrapper = (preloadedState = {}) => {
  const store = makeDummyStore(preloadedState);
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, Wrapper } as const;
};

describe("useGetCollectibles cache filtering", () => {
  const getCachedCollectionsMock =
    CollectiblesCache.getCachedCollections as jest.MockedFunction<
      typeof CollectiblesCache.getCachedCollections
    >;
  const hasValidCacheMock =
    CollectiblesCache.hasValidCache as jest.MockedFunction<
      typeof CollectiblesCache.hasValidCache
    >;
  const getCollectiblesMock =
    InternalApi.getCollectibles as jest.MockedFunction<
      typeof InternalApi.getCollectibles
    >;
  const fetchCollectiblesMock =
    FetchCollectiblesApi.fetchCollectibles as jest.MockedFunction<
      typeof FetchCollectiblesApi.fetchCollectibles
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only user-stored collectibles from the cache", async () => {
    const cachedCollections = [
      {
        collection: {
          address: "contract-1",
          name: "First",
          collectibles: [{ id: "1", isUserStored: true }, { id: "2" }],
        },
      },
      {
        collection: {
          address: "contract-2",
          name: "Second",
          collectibles: [{ id: "3" }],
        },
      },
    ];

    getCachedCollectionsMock.mockReturnValue(cachedCollections as any);
    hasValidCacheMock.mockReturnValue(true);

    const { Wrapper } = buildWrapper();

    const { result } = renderHook(() => useGetCollectibles(), {
      wrapper: Wrapper,
    });

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(payload).toEqual({
      collections: [
        {
          collection: {
            address: "contract-1",
            name: "First",
            collectibles: [{ id: "1", isUserStored: true }],
          },
        },
      ],
    });
    expect(getCollectiblesMock).not.toHaveBeenCalled();
    expect(fetchCollectiblesMock).not.toHaveBeenCalled();
  });

  it("falls through to the API when cache filtering removes all collectibles", async () => {
    getCachedCollectionsMock.mockReturnValue([
      {
        collection: {
          address: "contract-1",
          name: "First",
          collectibles: [{ id: "1", isUserStored: false }],
        },
      },
    ] as any);
    hasValidCacheMock.mockReturnValue(true);

    getCollectiblesMock.mockResolvedValue({
      collectiblesList: [{ id: "contract-2", tokenIds: ["10"] }],
    } as any);

    const apiCollections = [
      {
        collection: {
          address: "contract-2",
          collectibles: [{ id: "10", isUserStored: true }],
        },
      },
    ];
    fetchCollectiblesMock.mockResolvedValue(apiCollections as any);

    const { Wrapper } = buildWrapper();

    const { result } = renderHook(() => useGetCollectibles(), {
      wrapper: Wrapper,
    });

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(getCollectiblesMock).toHaveBeenCalledWith({
      publicKey: TEST_PUBLIC_KEY,
      network: TESTNET_NETWORK_DETAILS.network,
    });
    expect(fetchCollectiblesMock).toHaveBeenCalledWith({
      publicKey: TEST_PUBLIC_KEY,
      contracts: [{ id: "contract-2", token_ids: ["10"] }],
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(payload).toEqual({ collections: apiCollections });
  });
});
