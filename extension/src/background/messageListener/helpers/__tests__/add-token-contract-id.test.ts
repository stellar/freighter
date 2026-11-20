import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";
import { addTokenWithContractId } from "../add-token-contract-id";

const KEY = "key-1";
const NETWORK = "TESTNET";
const CONTRACT = "C-TOKEN";

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
  } as any;
};

describe("addTokenWithContractId", () => {
  it("stores the token for the active account", async () => {
    const localStore = makeLocalStore();

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK },
      localStore,
    });

    expect(result).toEqual({ accountTokenIdList: [CONTRACT] });
    expect(localStore.setItem).toHaveBeenCalledWith(TOKEN_ID_LIST, {
      [NETWORK]: { [KEY]: [CONTRACT] },
    });
  });

  it("returns no error when the token is already stored (re-add after removal)", async () => {
    const localStore = makeLocalStore({ [NETWORK]: { [KEY]: [CONTRACT] } });

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK },
      localStore,
    });

    expect(result).toEqual({ accountTokenIdList: [CONTRACT] });
    expect(result.error).toBeUndefined();
    // Already present: no re-write, no error that would decline the dApp.
    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("surfaces an error when persisting the token fails", async () => {
    // The helper reports the failure; the addToken handler decides whether to
    // swallow it (trustline-backed SAC) or report it to the dApp (SEP-41).
    const localStore = makeLocalStore();
    localStore.setItem.mockRejectedValueOnce(new Error("storage boom"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK },
      localStore,
    });

    expect(result.error).toBeDefined();
  });
});
