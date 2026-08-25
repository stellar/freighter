import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";
import { RemoveTokenIdMessage } from "@shared/api/types/message-request";
import { NETWORKS } from "@shared/constants/stellar";
import { removeTokenId } from "../removeTokenId";

const KEY = "key-1";
const OTHER_KEY = "key-2";
const NETWORK = NETWORKS.TESTNET;
const CONTRACT = "C-TOKEN";
const OTHER_CONTRACT = "C-OTHER-TOKEN";

const makeLocalStore = (tokenIdList: Record<string, unknown> = {}) => {
  const store: Record<string, unknown> = {
    [TOKEN_ID_LIST]: tokenIdList,
    [KEY_ID]: KEY,
  };
  return {
    getItem: jest.fn(async (key: string) => store[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
    read: () => store,
  } as any;
};

const request = {
  contractId: CONTRACT,
  network: NETWORK,
} as RemoveTokenIdMessage;

describe("removeTokenId", () => {
  it("removes the contract from the active account's list", async () => {
    const localStore = makeLocalStore({
      [NETWORK]: { [KEY]: [CONTRACT, OTHER_CONTRACT] },
    });

    const result = await removeTokenId({ request, localStore });

    expect(result).toEqual({ tokenIdList: [OTHER_CONTRACT] });
    expect(localStore.read()[TOKEN_ID_LIST]).toEqual({
      [NETWORK]: { [KEY]: [OTHER_CONTRACT] },
    });
  });

  it("leaves other accounts' lists on the same network intact", async () => {
    // Regression: the network bucket used to be rebuilt from the active keyId
    // alone, wiping every other account's custom tokens on that network.
    const localStore = makeLocalStore({
      [NETWORK]: {
        [KEY]: [CONTRACT],
        [OTHER_KEY]: [OTHER_CONTRACT],
      },
    });

    await removeTokenId({ request, localStore });

    expect(localStore.read()[TOKEN_ID_LIST]).toEqual({
      [NETWORK]: {
        [KEY]: [],
        [OTHER_KEY]: [OTHER_CONTRACT],
      },
    });
  });

  it("leaves other networks intact", async () => {
    const localStore = makeLocalStore({
      [NETWORK]: { [KEY]: [CONTRACT] },
      [NETWORKS.PUBLIC]: { [KEY]: [OTHER_CONTRACT] },
    });

    await removeTokenId({ request, localStore });

    expect(localStore.read()[TOKEN_ID_LIST]).toEqual({
      [NETWORK]: { [KEY]: [] },
      [NETWORKS.PUBLIC]: { [KEY]: [OTHER_CONTRACT] },
    });
  });

  it("is a no-op when the contract is not in the list", async () => {
    const localStore = makeLocalStore({
      [NETWORK]: { [KEY]: [OTHER_CONTRACT] },
    });

    const result = await removeTokenId({ request, localStore });

    expect(result).toEqual({ tokenIdList: [OTHER_CONTRACT] });
  });
});
