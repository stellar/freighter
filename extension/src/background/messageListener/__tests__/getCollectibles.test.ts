import { SERVICE_TYPES } from "@shared/constants/services";
import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

import { getCollectibles } from "../handlers/getCollectibles";
import { CollectibleContract } from "@shared/api/types/types";

describe("getCollectibles", () => {
  it("should return an empty array if the collectibles store is empty", async () => {
    const result = await getCollectibles({
      request: {
        type: SERVICE_TYPES.GET_COLLECTIBLES,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: [] as CollectibleContract[],
    });
  });
  it("should return the collectibles list if the collectibles store is not empty", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
          {
            id: "C1234567890",
            tokenIds: ["1234567890"],
          },
        ],
      },
    });
    const result = await getCollectibles({
      request: {
        type: SERVICE_TYPES.GET_COLLECTIBLES,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: [
        {
          id: "C1234567890",
          tokenIds: ["1234567890"],
        },
      ],
    });
  });
  it("should return an empty array if the collectibles store is not empty but the public key is not found", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        GCO3MRY77QAIXKHLNBBDWCJOTBJ3OKE6IUQSO362M6U2P62YXQWN2AEI: [
          {
            id: "C1234567890",
            tokenIds: ["1234567890"],
          },
        ],
      },
    });
    const result = await getCollectibles({
      request: {
        type: SERVICE_TYPES.GET_COLLECTIBLES,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ collectiblesList: [] as CollectibleContract[] });
  });
});
