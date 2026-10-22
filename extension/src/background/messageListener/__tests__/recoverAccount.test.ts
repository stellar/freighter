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
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { SecretSourceType } from "@shared/api/types";
import { getMnemonics } from "background/helpers/session";
import {
  getPinnedSourceId,
  getSecretSources,
  setPinnedSourceId,
} from "background/helpers/secret-sources";

// A real BIP39 phrase: the handler derives the phrase's source id from it.
const VECTOR = AUTH_KEYPAIR_VECTORS[0];

// Distinct keys per derivation index, so the recovery preload loop stores a
// separate account for each one rather than collapsing into a single entry.
jest.mock("stellar-hd-wallet", () => ({
  generateMnemonic: () => "unused",
  fromMnemonic: () => ({
    getPublicKey: (index: number) => `pubKey${index}`,
    getSecret: (index: number) => `secret${index}`,
  }),
}));

const testAlarm = new MockBrowserAlarm(() => {});

const recover = (isOverwritingAccount = false) =>
  popupMessageListener(
    {
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
      password: "test",
      recoverMnemonic: VECTOR.mnemonic,
      isOverwritingAccount,
    } as RecoverAccountMessage,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  );

describe("Recover account message listener", () => {
  // Each recovery stores one keystore per funded index through Scrypt, and
  // one case recovers twice; under a full parallel run that outlasts the
  // 5 s default, as the sibling suites already allow for.
  jest.setTimeout(60_000);

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

  it("registers the recovered phrase once despite the preloaded accounts", async () => {
    await recover();

    const { session } = mockSessionStore.getState();
    expect((session.allAccounts ?? []).length).toBeGreaterThan(1);
    expect(await getSecretSources({ localStore: mockDataStorage })).toEqual({
      [VECTOR.userId]: {
        id: VECTOR.userId,
        type: SecretSourceType.PHRASE,
        label: "Seed Phrase 1",
        createdAt: expect.any(Number),
      },
    });
    expect(
      await getMnemonics({
        sessionStore: mockSessionStore,
        localStore: mockDataStorage,
      }),
    ).toEqual({ [VECTOR.userId]: VECTOR.mnemonic });
  });

  it("recovering over an existing wallet leaves one record, pinned to the recovered phrase", async () => {
    await recover();
    // A pin the old wallet held that the new phrase does not derive.
    await setPinnedSourceId({
      localStore: mockDataStorage,
      sourceId: "f".repeat(64),
    });

    await recover(true);

    const sources = await getSecretSources({ localStore: mockDataStorage });
    expect(Object.values(sources).map((s) => s.label)).toEqual([
      "Seed Phrase 1",
    ]);
    expect(await getPinnedSourceId({ localStore: mockDataStorage })).toBe(
      VECTOR.userId,
    );
  });
});
