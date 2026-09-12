import { Networks, Keypair } from "stellar-sdk";
import { SERVICE_TYPES } from "@shared/constants/services";
import { SORAN_PAYMENT_NAMES } from "constants/localStorageTypes";
import { dataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  saveSoranPaymentName,
  getSoranPaymentName,
} from "../soranPaymentNames";

const account = Keypair.random().publicKey();
const destination = Keypair.random().publicKey();
const payment = {
  networkPassphrase: Networks.TESTNET,
  transactionHash: "a".repeat(64),
  destination,
  memo: "hello",
  memoType: "text",
  name: "alice.nova",
};
const saveRequest = {
  activePublicKey: account,
  payment,
  type: SERVICE_TYPES.SAVE_SORAN_PAYMENT_NAME as const,
};
const readRequest = {
  activePublicKey: account,
  payment,
  type: SERVICE_TYPES.GET_SORAN_PAYMENT_NAME as const,
};
let data: Record<string, unknown>;
let localStore: ReturnType<typeof dataStorageAccess>;
beforeEach(() => {
  data = {};
  localStore = {
    getItem: jest.fn(async (key) => data[key]),
    setItem: jest.fn(async (key, value) => {
      data[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
  };
});
it("saves the original name immutably and keeps accounts and complete routes separate", async () => {
  expect(
    await saveSoranPaymentName({ request: saveRequest, localStore }),
  ).toEqual({ saved: true });
  await saveSoranPaymentName({
    request: { ...saveRequest, payment: { ...payment, name: "changed.nova" } },
    localStore,
  });
  expect(
    await getSoranPaymentName({ request: readRequest, localStore }),
  ).toEqual({ name: "alice.nova" });
  for (const change of [
    { memo: "other" },
    { memoType: "id" },
    { transactionHash: "b".repeat(64) },
    { destination: account },
    { networkPassphrase: Networks.PUBLIC },
  ]) {
    expect(
      await getSoranPaymentName({
        request: { ...readRequest, payment: { ...payment, ...change } },
        localStore,
      }),
    ).toEqual({ name: null });
  }
  expect(
    await getSoranPaymentName({
      request: { ...readRequest, activePublicKey: destination },
      localStore,
    }),
  ).toEqual({ name: null });
});
it("normalizes the no-memo representation", async () => {
  await saveSoranPaymentName({
    request: {
      ...saveRequest,
      payment: { ...payment, memo: "", memoType: "" },
    },
    localStore,
  });
  expect(
    await getSoranPaymentName({
      request: {
        ...readRequest,
        payment: { ...payment, memo: "", memoType: "none" },
      },
      localStore,
    }),
  ).toEqual({ name: "alice.nova" });
});
it.each([
  { name: "ALICE.NOVA" },
  { name: "<script>.nova" },
  { transactionHash: "bad" },
  { destination: "bad" },
  { memo: "x".repeat(129) },
  { networkPassphrase: Networks.PUBLIC },
])("rejects invalid annotations %#", async (change) => {
  expect(
    await saveSoranPaymentName({
      request: { ...saveRequest, payment: { ...payment, ...change } },
      localStore,
    }),
  ).toEqual({ saved: false });
  expect(localStore.setItem).not.toHaveBeenCalled();
});
it("serializes concurrent writes and bounds retained history", async () => {
  data[SORAN_PAYMENT_NAMES] = Array.from({ length: 1000 }, (_, i) => ({
    key: `old-${i}`,
    name: "old.nova",
  }));
  await Promise.all([
    saveSoranPaymentName({ request: saveRequest, localStore }),
    saveSoranPaymentName({
      request: {
        ...saveRequest,
        payment: { ...payment, transactionHash: "b".repeat(64) },
      },
      localStore,
    }),
  ]);
  expect(data[SORAN_PAYMENT_NAMES]).toHaveLength(1000);
  expect((data[SORAN_PAYMENT_NAMES] as unknown[]).slice(-2)).toEqual([
    expect.objectContaining({ name: "alice.nova" }),
    expect.objectContaining({ name: "alice.nova" }),
  ]);
});
it("contains storage failures without failing a successful payment", async () => {
  jest.mocked(localStore.setItem).mockRejectedValue(new Error("disk error"));
  expect(
    await saveSoranPaymentName({ request: saveRequest, localStore }),
  ).toEqual({ saved: false });
  jest.mocked(localStore.getItem).mockRejectedValue(new Error("disk error"));
  expect(
    await getSoranPaymentName({ request: readRequest, localStore }),
  ).toEqual({ name: null });
});
