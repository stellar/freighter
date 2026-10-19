import { SERVICE_TYPES } from "@shared/constants/services";
import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

import { removeCollectible } from "../handlers/removeCollectible";

const PUBLIC_KEY = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const OTHER_KEY = "GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2";
const CONTRACT = "C1234567890";

const remove = (tokenId: string, network = "testnet", publicKey = PUBLIC_KEY) =>
  removeCollectible({
    request: {
      type: SERVICE_TYPES.REMOVE_COLLECTIBLE,
      activePublicKey: publicKey,
      publicKey,
      network,
      collectibleContractAddress: CONTRACT,
      collectibleTokenId: tokenId,
    },
    localStore: mockDataStorage,
  });

describe("removeCollectible", () => {
  it("removes one token id and keeps the rest of the contract", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        [PUBLIC_KEY]: [{ id: CONTRACT, tokenIds: ["1", "2"] }],
      },
    });

    const result = await remove("1");

    expect(result).toEqual({
      collectiblesList: [{ id: CONTRACT, tokenIds: ["2"] }],
    });
  });

  it("drops the contract entirely when its last token id goes", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        [PUBLIC_KEY]: [
          { id: CONTRACT, tokenIds: ["1"] },
          { id: "COTHER", tokenIds: ["9"] },
        ],
      },
    });

    const result = await remove("1");

    // An emptied contract would otherwise linger as a collection header with
    // no rows under it.
    expect(result).toEqual({
      collectiblesList: [{ id: "COTHER", tokenIds: ["9"] }],
    });
  });

  it("errors rather than silently succeeding when the token is not tracked", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        [PUBLIC_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
      },
    });

    expect(await remove("does-not-exist")).toEqual({
      error: "Collectible not found",
    });
  });

  it("leaves other accounts and networks untouched", async () => {
    mockDataStorage.setItem(COLLECTIBLES_ID, {
      testnet: {
        [PUBLIC_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
        [OTHER_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
      },
      mainnet: {
        [PUBLIC_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
      },
    });

    await remove("1");

    const stored = await mockDataStorage.getItem(COLLECTIBLES_ID);
    expect(stored).toEqual({
      testnet: {
        [PUBLIC_KEY]: [],
        [OTHER_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
      },
      mainnet: {
        [PUBLIC_KEY]: [{ id: CONTRACT, tokenIds: ["1"] }],
      },
    });
  });
});
