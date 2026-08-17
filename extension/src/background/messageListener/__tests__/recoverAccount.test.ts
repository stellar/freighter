import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { RecoverAccountMessage } from "@shared/api/types/message-request";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";

// Distinct keys per derivation index, so the recovery preload loop stores a
// separate account for each one rather than collapsing into a single entry.
jest.mock("stellar-hd-wallet", () => ({
  generateMnemonic: () => "mocked mnemonic phrase",
  fromMnemonic: () => ({
    getPublicKey: (index: number) => `pubKey${index}`,
    getSecret: (index: number) => `secret${index}`,
  }),
}));

const testAlarm = new MockBrowserAlarm(() => {});

const recover = () =>
  popupMessageListener(
    {
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
      password: "test",
      recoverMnemonic: "mocked mnemonic phrase",
      isOverwritingAccount: false,
    } as RecoverAccountMessage,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  );

describe("Recover account message listener", () => {
  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());

    // Every derived key looks funded on Mainnet, so the preload loop stores
    // all of them — the case where the bug was visible.
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ account_id: "funded" }),
      }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Regression: the preload loop used to store derivation indices 1..n with
  // `imported: true`, so recovering a phrase with several funded accounts
  // tagged every account but the first as "Imported" in the wallets list.
  // They are derived from the recovery phrase, exactly like the ones
  // `addAccount` creates — "Imported" belongs only to secret-key imports.
  it("does not mark phrase-derived accounts as imported", async () => {
    await recover();

    const { session } = mockSessionStore.getState();
    const allAccounts = session.allAccounts ?? [];

    expect(allAccounts.length).toBeGreaterThan(1);
    expect(allAccounts.every((account) => account.imported === false)).toBe(
      true,
    );
  });
});
