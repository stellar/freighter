import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";
import { addTokenWithContractId } from "../add-token-contract-id";

const mockSubscribeTokenBalance = jest.fn();
const mockSubscribeTokenHistory = jest.fn();

jest.mock("background/helpers/account", () => ({
  subscribeTokenBalance: (...args: unknown[]) =>
    mockSubscribeTokenBalance(...args),
  subscribeTokenHistory: (...args: unknown[]) =>
    mockSubscribeTokenHistory(...args),
}));

const KEY = "key-1";
const NETWORK = "TESTNET";
const CONTRACT = "C-TOKEN";
const PUBLIC_KEY = "G-PUBLIC-KEY";

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeTokenBalance.mockResolvedValue(undefined);
    mockSubscribeTokenHistory.mockResolvedValue(undefined);
  });

  it("stores the token and resolves WITHOUT waiting on slow subscriptions", async () => {
    // A subscription that never settles must not delay the result — otherwise
    // the dApp response is sent after the popup closes and reads as "declined".
    let resolveBalanceSub: () => void = () => {};
    mockSubscribeTokenBalance.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveBalanceSub = resolve;
      }),
    );
    const localStore = makeLocalStore();

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK, publicKey: PUBLIC_KEY },
      localStore,
    });

    expect(result).toEqual({ accountTokenIdList: [CONTRACT] });
    expect(result.error).toBeUndefined();
    // Token was persisted before resolving.
    expect(localStore.setItem).toHaveBeenCalledTimes(1);

    resolveBalanceSub();
  });

  it("returns no error when the token is already stored (re-add after removal)", async () => {
    const localStore = makeLocalStore({ [NETWORK]: { [KEY]: [CONTRACT] } });

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK, publicKey: PUBLIC_KEY },
      localStore,
    });

    expect(result).toEqual({ accountTokenIdList: [CONTRACT] });
    expect(result.error).toBeUndefined();
    // Already present: no re-write, no error that would decline the dApp.
    expect(localStore.setItem).not.toHaveBeenCalled();
  });

  it("does not return an error when persisting fails after a successful trustline", async () => {
    const localStore = makeLocalStore();
    localStore.setItem.mockRejectedValueOnce(new Error("storage boom"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await addTokenWithContractId({
      args: { contractId: CONTRACT, network: NETWORK, publicKey: PUBLIC_KEY },
      localStore,
    });

    expect(result.error).toBeUndefined();
  });
});
