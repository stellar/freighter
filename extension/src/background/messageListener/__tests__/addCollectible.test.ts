import { SERVICE_TYPES } from "@shared/constants/services";
import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

import { addCollectible } from "../handlers/addCollectible";

describe("addCollectible", () => {
  it("should add a collectible to an empty store", async () => {
    const result = await addCollectible({
      request: {
        type: SERVICE_TYPES.ADD_COLLECTIBLE,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
        collectibleAddress: "C1234567890",
        collectibleTokenId: "1234567890",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: {
        testnet: {
          GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890"],
            },
          ],
        },
      },
    });
  });
  it("should add a token id to an existing collectible contract", async () => {
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
    const result = await addCollectible({
      request: {
        type: SERVICE_TYPES.ADD_COLLECTIBLE,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
        collectibleAddress: "C1234567890",
        collectibleTokenId: "2345678901",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: {
        testnet: {
          GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890", "2345678901"],
            },
          ],
        },
      },
    });
  });
  it("should return an error if the collectible contract already exists", async () => {
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
    const result = await addCollectible({
      request: {
        type: SERVICE_TYPES.ADD_COLLECTIBLE,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
        collectibleAddress: "C1234567890",
        collectibleTokenId: "1234567890",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      error: "Collectible contract already exists",
    });
  });
  it("should add a new collectible on a different network", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      public: {
        GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
          {
            id: "C1234567890",
            tokenIds: ["1234567890"],
          },
        ],
      },
    });
    const result = await addCollectible({
      request: {
        type: SERVICE_TYPES.ADD_COLLECTIBLE,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
        collectibleAddress: "C1234567890",
        collectibleTokenId: "1234567890",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: {
        public: {
          GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890"],
            },
          ],
        },
        testnet: {
          GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890"],
            },
          ],
        },
      },
    });
  });
  it("should add a new collectible on a different public key", async () => {
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
    const result = await addCollectible({
      request: {
        type: SERVICE_TYPES.ADD_COLLECTIBLE,
        activePublicKey:
          "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        network: "testnet",
        collectibleAddress: "C1234567890",
        collectibleTokenId: "1234567890",
      },
      localStore: mockDataStorage,
    });
    expect(result).toEqual({
      collectiblesList: {
        testnet: {
          GCO3MRY77QAIXKHLNBBDWCJOTBJ3OKE6IUQSO362M6U2P62YXQWN2AEI: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890"],
            },
          ],
          GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
            {
              id: "C1234567890",
              tokenIds: ["1234567890"],
            },
          ],
        },
      },
    });
  });
});
