import { act, renderHook } from "@testing-library/react";
import { Account, MuxedAccount, Federation } from "stellar-sdk";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getAddressFromInput, useSendToData } from "../useSendToData";
import { resolveSoranName } from "popup/helpers/soran";
import { FederationMemoType } from "popup/helpers/federationMemo";
import { RequestState } from "constants/request";

const mockFetchBalances = jest.fn().mockResolvedValue({ isFunded: true });
jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));
jest.mock("helpers/hooks/useGetAppData", () => ({
  AppDataType: { RESOLVED: "resolved", REROUTE: "re-route" },
  useGetAppData: () => ({
    fetchData: async () => ({
      type: "resolved",
      account: {
        publicKey: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        applicationState: "APPLICATION_READY",
      },
      settings: {
        networkDetails: require("@shared/constants/stellar")
          .TESTNET_NETWORK_DETAILS,
      },
    }),
  }),
}));
jest.mock("@shared/api/internal", () => ({
  loadRecentAddresses: async () => ({ recentAddresses: ["alice.nova"] }),
}));
jest.mock("popup/helpers/account", () => ({
  getBaseAccount: async (address: string) => address,
}));
jest.mock("popup/helpers/soroban", () => ({
  isContractId: (address: string) => address.startsWith("C"),
}));
jest.mock("popup/helpers/soran", () => ({
  ...jest.requireActual("popup/helpers/soran"),
  resolveSoranName: jest.fn(),
}));
jest.mock("popup/helpers/localizationConfig", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

const G = "GBHKTFVBDUA6RYP5JM4SPZ76OXYAAHV4QHUOFV4S4TK342FMVGPHA2WN";
const payment = {
  name: "alice.nova",
  address: G,
  memo: "12345",
  memoType: FederationMemoType.Id,
};
const resolve = jest.mocked(resolveSoranName);

beforeEach(() => {
  jest.clearAllMocks();
  resolve.mockResolvedValue(payment);
});
afterEach(() => jest.restoreAllMocks());

it("carries the canonical name and typed memo into send data", async () => {
  const result = await getAddressFromInput(
    " Alice.Nova ",
    TESTNET_NETWORK_DETAILS,
  );
  expect(result).toEqual({
    validatedAddress: G,
    fedAddress: "alice.nova",
    federationMemo: "12345",
    federationMemoType: "id",
  });
  expect(resolve).toHaveBeenCalledWith(" Alice.Nova ", TESTNET_NETWORK_DETAILS);
});
it("leaves literal addresses unchanged", async () => {
  expect(await getAddressFromInput(G)).toEqual({
    validatedAddress: G,
    fedAddress: "",
    federationMemo: "",
    federationMemoType: "",
  });
  expect(resolve).not.toHaveBeenCalled();
});
it("keeps federation resolution working", async () => {
  jest
    .spyOn(Federation.Server, "resolve")
    .mockResolvedValue({ account_id: G, memo: "12345", memo_type: "id" });
  expect(await getAddressFromInput("alice*example.com")).toMatchObject({
    validatedAddress: G,
    fedAddress: "alice*example.com",
    federationMemo: "12345",
    federationMemoType: "id",
  });
  expect(resolve).not.toHaveBeenCalled();
});
it("surfaces lookup failure without fetching a fallback destination", async () => {
  resolve.mockRejectedValue(new Error("Lookup unavailable"));
  const { result } = renderHook(() => useSendToData());
  await act(async () => {
    await result.current.fetchData("alice.nova", {});
  });
  expect(result.current.state.state).toBe(RequestState.ERROR);
  expect(mockFetchBalances).not.toHaveBeenCalled();
});
it("blocks a Soran self-send", async () => {
  resolve.mockResolvedValue({
    ...payment,
    address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  });
  const { result } = renderHook(() => useSendToData());
  await act(async () => {
    await result.current.fetchData("alice.nova", {});
  });
  expect(result.current.state.error).toEqual(
    new Error("You cannot send to yourself"),
  );
  expect(mockFetchBalances).not.toHaveBeenCalled();
});
it("rejects collectible sends that cannot preserve a required memo", async () => {
  const { result } = renderHook(() => useSendToData({ isCollectible: true }));
  await act(async () => {
    await result.current.fetchData("alice.nova", {});
  });
  expect(result.current.state.error).toEqual(
    new Error("This token transfer cannot preserve the Soran memo"),
  );
  expect(mockFetchBalances).not.toHaveBeenCalled();
});
it("ignores an older lookup that completes after the next recipient", async () => {
  let finishFirst!: (value: typeof payment) => void;
  resolve.mockImplementationOnce(
    () =>
      new Promise((done) => {
        finishFirst = done;
      }),
  );
  const { result } = renderHook(() => useSendToData());
  let first!: Promise<unknown>;
  await act(async () => {
    first = result.current.fetchData("alice.nova", {});
  });
  await act(async () => {
    await result.current.fetchData(G, {});
  });
  await act(async () => {
    finishFirst(payment);
    await first;
  });
  expect(result.current.state.data).toMatchObject({
    validatedAddress: G,
    fedAddress: "",
    federationMemo: "",
  });
});

it("rejects collectible muxed destinations before balance loading", async () => {
  resolve.mockResolvedValue({
    ...payment,
    address: new MuxedAccount(new Account(G, "0"), "42").accountId(),
    memo: "",
    memoType: "",
  });
  const { result } = renderHook(() => useSendToData({ isCollectible: true }));
  await act(async () => {
    await result.current.fetchData("alice.nova", {});
  });
  expect(result.current.state.state).toBe(RequestState.ERROR);
  expect(result.current.state.error).toEqual(
    new Error(
      "This transfer cannot preserve the Soran muxed address. Choose another recipient.",
    ),
  );
  expect(mockFetchBalances).not.toHaveBeenCalled();
});
