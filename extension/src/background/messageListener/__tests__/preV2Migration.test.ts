import { Keypair } from "stellar-sdk";
import { KeyType, ScryptEncrypter } from "@stellar/typescript-wallet-sdk-km";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { WalletType } from "@shared/constants/hardwareWallet";
import {
  ConfirmPasswordMessage,
  RecoverAccountMessage,
} from "@shared/api/types/message-request";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { deriveSourceIdentity } from "@shared/api/helpers/deriveAuthKeypair";
import { Account, AccountType, SecretSourceType } from "@shared/api/types";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { migratePreV2Storage } from "background/helpers/pre-v2-migration";
import { getAnalyticsUserId } from "background/helpers/analyticsUserId";
import {
  ACCOUNT_NAME_LIST_ID,
  ACCOUNT_PROVENANCE_ID,
  DERIVATION_INDICES_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
  PENDING_ATTRIBUTION_ID,
  PINNED_SOURCE_ID,
  SECRET_SOURCES_ID,
} from "constants/localStorageTypes";
import { decodeString } from "helpers/urls";
import {
  PRE_V2_DERIVED_0_ID,
  PRE_V2_DERIVED_1_ID,
  PRE_V2_HW_ID,
  PRE_V2_IMPORTED_ID,
  PRE_V2_IMPORTED_SECRET,
  PRE_V2_KEYSTORES,
  PRE_V2_PASSWORD,
  PRE_V2_PHRASE,
  PRE_V2_STORAGE,
} from "./fixtures/preV2Storage";

// Acceptance: a wallet created before the multi-source model opens
// afterwards with every account present and attributed, pinned to the phrase
// its analytics id was already derived from, with nothing re-onboarded.

const [PHRASE] = AUTH_KEYPAIR_VECTORS;
// The pre-upgrade `metrics_user_id` of the fixture wallet: the value the last
// single-phrase build derived from its phrase.
const PRE_UPGRADE_METRICS_USER_ID =
  "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797";

// The linker is fire-and-forget: a real pass outlives the test that started it
// and writes the pin into the next test's storage. link-sources.test.ts covers
// it; here only the trigger matters.
jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop, see
// deriveAuthKeypair.ts), so derive from the pinned (mnemonic, index) rows.
jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors } = jest.requireActual(
    "@shared/api/helpers/authKeypairVectors",
  );
  return {
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      return {
        getPublicKey: (i: number) => rows[i]?.publicKey,
        getSecret: (i: number) => rows[i]?.secret,
      };
    },
  };
});

const mockCaptureException = jest.fn();
jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const testAlarm = new MockBrowserAlarm(() => {});
const send = (request: object) =>
  popupMessageListener(
    request as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  );

const unlock = (password = PRE_V2_PASSWORD) =>
  send({
    type: SERVICE_TYPES.CONFIRM_PASSWORD,
    password,
  } as ConfirmPasswordMessage) as Promise<{ error?: string }>;

const installPass = () => migratePreV2Storage({ localStore: mockDataStorage });

const snapshot = async () =>
  JSON.parse(JSON.stringify(await mockStorageApi.get(null as any)));

const allAccounts = (): Account[] =>
  mockSessionStore.getState().session.allAccounts ?? [];

const importedSourceId = async () =>
  (
    await deriveSourceIdentity(
      Keypair.fromSecret(PRE_V2_IMPORTED_SECRET).rawSecretKey(),
    )
  ).sourceId;

// Every key a pre-V2 build reads. The migration must leave each one exactly
// as it found it, which is what lets a downgraded build open the storage.
const PRE_V2_KEYS = Object.keys(PRE_V2_STORAGE).filter(
  (key) => key !== "storageVersion",
);

describe("pre-V2 storage migration", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    await mockStorageApi.set(PRE_V2_STORAGE);
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    mockCaptureException.mockReset();
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
  });

  it("the fixture is a pre-V2 wallet", async () => {
    // Guards the assertions below: each one checks a value that differs from
    // the fixture's starting state.
    const before = await snapshot();
    expect(before[SECRET_SOURCES_ID]).toBeUndefined();
    expect(before[PINNED_SOURCE_ID]).toBeUndefined();
    expect(before[DERIVATION_INDICES_ID]).toBeUndefined();
    expect(before[ACCOUNT_PROVENANCE_ID]).toBeUndefined();
    expect(before[PENDING_ATTRIBUTION_ID]).toBeUndefined();
  });

  describe("install pass (no password)", () => {
    it("attributes hardware accounts and marks the rest pending", async () => {
      await installPass();

      expect(await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)).toEqual({
        [PRE_V2_HW_ID]: { type: AccountType.HW },
      });
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([
        PRE_V2_DERIVED_0_ID,
        PRE_V2_DERIVED_1_ID,
        PRE_V2_IMPORTED_ID,
      ]);
      // The phrase is encrypted; no source can be created before unlock.
      expect(await mockDataStorage.getItem(SECRET_SOURCES_ID)).toBeUndefined();
      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBeUndefined();
    });

    it("leaves every pre-V2 key untouched, so a downgrade still opens", async () => {
      const before = await snapshot();

      await installPass();

      const after = await snapshot();
      for (const key of PRE_V2_KEYS) {
        expect(after[key]).toEqual(before[key]);
      }
    });

    it("is idempotent", async () => {
      await installPass();
      const once = await snapshot();

      await installPass();

      expect(await snapshot()).toEqual(once);
    });

    it("writes nothing on a fresh install", async () => {
      await mockStorageApi.clear();

      await installPass();

      expect(await snapshot()).toEqual({});
    });
  });

  describe("unlock pass", () => {
    beforeEach(async () => {
      await installPass();
    });

    it("opens with every account present and attributed", async () => {
      expect((await unlock()).error).toBeUndefined();

      const sourceId = await importedSourceId();

      const sources = await mockDataStorage.getItem(SECRET_SOURCES_ID);
      expect(Object.keys(sources).sort()).toEqual(
        [PHRASE.userId, sourceId].sort(),
      );
      expect(sources[PHRASE.userId]).toMatchObject({
        type: SecretSourceType.PHRASE,
        label: "Seed Phrase 1",
      });
      expect(sources[sourceId]).toMatchObject({
        type: SecretSourceType.SECRET_KEY,
        label: "Secret Key 1",
      });

      expect(await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)).toEqual({
        [PRE_V2_DERIVED_0_ID]: {
          type: AccountType.FREIGHTER,
          sourceId: PHRASE.userId,
        },
        [PRE_V2_DERIVED_1_ID]: {
          type: AccountType.FREIGHTER,
          sourceId: PHRASE.userId,
        },
        [PRE_V2_IMPORTED_ID]: { type: AccountType.IMPORTED, sourceId },
        [PRE_V2_HW_ID]: { type: AccountType.HW },
      });
      expect(await mockDataStorage.getItem(DERIVATION_INDICES_ID)).toEqual({
        [PHRASE.userId]: [0, 1],
      });
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([]);

      // Nothing re-onboarded: the same four accounts, in order, by name.
      expect(allAccounts().map(({ id, name }) => ({ id, name }))).toEqual([
        { id: PRE_V2_DERIVED_0_ID, name: "Account 1" },
        { id: PRE_V2_DERIVED_1_ID, name: "Account 2" },
        { id: PRE_V2_IMPORTED_ID, name: "Account 3" },
        { id: PRE_V2_HW_ID, name: "Ledger 1" },
      ]);
      expect(allAccounts()[2]).toMatchObject({ imported: true, sourceId });
      expect(allAccounts()[0]).toMatchObject({
        imported: false,
        sourceId: PHRASE.userId,
      });
      expect(allAccounts()[3]).toMatchObject({
        imported: true,
        hardwareWalletType: WalletType.LEDGER,
      });
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it("pins the phrase, so the identity equals the pre-upgrade metrics_user_id", async () => {
      expect(PHRASE.mnemonic).toBe(PRE_V2_PHRASE);

      await unlock();

      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
      // Before the first link the server has no user (404): the analytics id
      // is the pinned phrase, unconfirmed.
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(null, { status: 404 }),
      );
      expect(
        await getAnalyticsUserId(mockSessionStore, mockDataStorage),
      ).toEqual({
        analyticsUserId: PRE_UPGRADE_METRICS_USER_ID,
        isConfirmed: false,
      });

      // After it, the root is the phrase that signed the link, so the
      // server's canonical id is the same value.
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { userId: PRE_UPGRADE_METRICS_USER_ID, sources: [] },
          }),
          { status: 200 },
        ),
      );
      expect(
        await getAnalyticsUserId(mockSessionStore, mockDataStorage),
      ).toEqual({
        analyticsUserId: PRE_UPGRADE_METRICS_USER_ID,
        isConfirmed: true,
      });
    });

    it("leaves every source unlinked, so the first unlock fires the link call", async () => {
      await unlock();

      // The rule linking builds on: a source with no linked entry is unlinked.
      // The migration writes no linked state at all.
      const after = await snapshot();
      expect(Object.keys(after).filter((key) => /link/i.test(key))).toEqual([]);
    });

    it("still leaves every pre-V2 key untouched", async () => {
      const before = await snapshot();

      await unlock();

      const after = await snapshot();
      for (const key of PRE_V2_KEYS) {
        expect(after[key]).toEqual(before[key]);
      }
      expect(after[KEY_DERIVATION_NUMBER_ID]).toBe("1");
      expect(Object.keys(PRE_V2_KEYSTORES).every((k) => k in after)).toBe(true);
    });

    it("is idempotent across unlocks", async () => {
      await unlock();
      const once = await snapshot();
      const accountsOnce = allAccounts();

      await unlock();

      const twice = await snapshot();
      for (const key of [
        SECRET_SOURCES_ID,
        PINNED_SOURCE_ID,
        DERIVATION_INDICES_ID,
        ACCOUNT_PROVENANCE_ID,
        PENDING_ATTRIBUTION_ID,
      ]) {
        expect(twice[key]).toEqual(once[key]);
      }
      expect(allAccounts()).toEqual(accountsOnce);
    });

    it("resumes on the next unlock when attribution is interrupted", async () => {
      // Simulates a pass that stopped after the first account: one entry
      // written, two still pending.
      await unlock();
      const complete = await snapshot();
      await mockStorageApi.clear();
      await mockStorageApi.set(PRE_V2_STORAGE);
      await installPass();
      await mockDataStorage.setItem(ACCOUNT_PROVENANCE_ID, {
        [PRE_V2_HW_ID]: { type: AccountType.HW },
        [PRE_V2_DERIVED_0_ID]:
          complete[ACCOUNT_PROVENANCE_ID][PRE_V2_DERIVED_0_ID],
      });
      mockSessionStore.dispatch(sessionSlice.actions.reset());

      await unlock();

      const after = await snapshot();
      expect(after[ACCOUNT_PROVENANCE_ID]).toEqual(
        complete[ACCOUNT_PROVENANCE_ID],
      );
      expect(after[PENDING_ATTRIBUTION_ID]).toEqual([]);
      expect(
        Object.values(after[SECRET_SOURCES_ID]).map((s: any) => s.label),
      ).toEqual(
        Object.values(complete[SECRET_SOURCES_ID]).map((s: any) => s.label),
      );
    });

    it("pins before the last pending id is removed", async () => {
      // A pass that stops between the two writes must still have pinned:
      // once the pending list is empty the next unlock does nothing.
      const setItem = jest.spyOn(mockDataStorage, "setItem");
      let pinnedWhenDrained: unknown;
      setItem.mockImplementation(async (key, value) => {
        if (key === PENDING_ATTRIBUTION_ID && !(value as string[]).length) {
          pinnedWhenDrained = await mockDataStorage.getItem(PINNED_SOURCE_ID);
        }
        await mockStorageApi.set({ [key]: value });
      });

      try {
        await unlock();
      } finally {
        setItem.mockRestore();
      }

      expect(pinnedWhenDrained).toBe(PRE_UPGRADE_METRICS_USER_ID);
    });

    it("repairs the pin in the same unlock and retries the pass on the next when its write fails", async () => {
      // Rejects the first pin write only.
      const setItem = jest.spyOn(mockDataStorage, "setItem");
      setItem.mockImplementation(async (key, value) => {
        if (key === PINNED_SOURCE_ID) {
          setItem.mockRestore();
          throw new Error("storage write failed");
        }
        await mockStorageApi.set({ [key]: value });
      });

      expect((await unlock()).error).toBeUndefined();

      // The aborted pass had already registered the identity phrase, so the
      // unlock's repair pins it from the persisted set.
      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([
        PRE_V2_DERIVED_0_ID,
        PRE_V2_DERIVED_1_ID,
        PRE_V2_IMPORTED_ID,
      ]);

      mockSessionStore.dispatch(sessionSlice.actions.reset());
      await unlock();

      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([]);
    });

    it("a wrong password attributes nothing", async () => {
      const before = await snapshot();

      expect((await unlock("not the password")).error).toBe(
        "Incorrect password",
      );

      expect(await snapshot()).toEqual(before);
    });

    it("with a hardware account active, pins the first keystore's phrase", async () => {
      await mockDataStorage.setItem(KEY_ID, PRE_V2_HW_ID);

      await unlock();

      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
    });

    it("with the import active, still pins the phrase stamped into it", async () => {
      // A pre-V2 build derived the analytics id from the active keystore's
      // phrase, and stamped the wallet phrase into imports too.
      await mockDataStorage.setItem(KEY_ID, PRE_V2_IMPORTED_ID);

      await unlock();

      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
      expect(
        (await mockDataStorage.getItem(SECRET_SOURCES_ID))[PHRASE.userId].label,
      ).toBe("Seed Phrase 1");
    });

    it("drops pending ids that are no longer in the wallet", async () => {
      await mockDataStorage.setItem(KEY_ID_LIST, [
        PRE_V2_DERIVED_0_ID,
        PRE_V2_HW_ID,
      ]);

      await unlock();

      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([]);
      expect(
        Object.keys(await mockDataStorage.getItem(SECRET_SOURCES_ID)),
      ).toEqual([PHRASE.userId]);
    });

    it("attributes phrase accounts a pre-5.45 recovery flagged imported", async () => {
      // Recovery's preload loop stored funded indices 1..n with
      // `imported: true` and the recovered phrase until 5.45.0.
      const recovered = ACCOUNT_SOURCE_VECTORS[0].accounts[2];
      const { id: recoveredId } = await mockKeyManager.storeKey({
        key: {
          extra: { imported: true, mnemonicPhrase: PRE_V2_PHRASE },
          type: KeyType.plaintextKey,
          publicKey: recovered.publicKey,
          privateKey: recovered.secret,
        },
        password: PRE_V2_PASSWORD,
        encrypterName: ScryptEncrypter.name,
      });
      await mockDataStorage.setItem(KEY_ID_LIST, [
        ...(PRE_V2_STORAGE.keyIdList as string[]),
        recoveredId,
      ]);
      // Left at 1, so only the derivation search can mark index 2.
      await installPass();

      await unlock();

      const sourceId = await importedSourceId();
      expect(await mockDataStorage.getItem(ACCOUNT_PROVENANCE_ID)).toEqual(
        expect.objectContaining({
          [recoveredId]: {
            type: AccountType.FREIGHTER,
            sourceId: PHRASE.userId,
          },
          [PRE_V2_IMPORTED_ID]: { type: AccountType.IMPORTED, sourceId },
        }),
      );
      expect(
        Object.keys(await mockDataStorage.getItem(SECRET_SOURCES_ID)).sort(),
      ).toEqual([PHRASE.userId, sourceId].sort());
      expect(await mockDataStorage.getItem(DERIVATION_INDICES_ID)).toEqual({
        [PHRASE.userId]: [0, 1, 2],
      });
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([]);
    });

    describe("after a recovery before the first unlock", () => {
      const RECOVERED_PHRASE = ACCOUNT_SOURCE_VECTORS.find(
        (v) => v.mnemonic !== PRE_V2_PHRASE,
      )!.mnemonic;

      const recover = () =>
        send({
          type: SERVICE_TYPES.RECOVER_ACCOUNT,
          password: PRE_V2_PASSWORD,
          recoverMnemonic: RECOVERED_PHRASE,
          isOverwritingAccount: true,
        } as RecoverAccountMessage);

      beforeEach(async () => {
        // A wallet that derived far past the one account a recovery creates.
        await mockDataStorage.setItem(KEY_DERIVATION_NUMBER_ID, "20");
      });

      it("discards the old wallet's pending list", async () => {
        await recover();

        expect(
          await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID),
        ).toBeUndefined();

        await unlock();

        expect(
          Object.values(await mockDataStorage.getItem(DERIVATION_INDICES_ID)),
        ).toEqual([[0]]);
      });

      it("does not seed the recovered phrase from a stale pending list", async () => {
        await recover();
        // The ids a wipe path left behind, none of them in the wallet now.
        await mockDataStorage.setItem(PENDING_ATTRIBUTION_ID, [
          PRE_V2_DERIVED_0_ID,
          PRE_V2_DERIVED_1_ID,
          PRE_V2_IMPORTED_ID,
        ]);

        await unlock();

        expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual(
          [],
        );
        // Only the recovered account's own index, so the next account on the
        // phrase derives index 1, not 21.
        expect(
          Object.values(await mockDataStorage.getItem(DERIVATION_INDICES_ID)),
        ).toEqual([[0]]);
        expect(
          Object.keys(await mockDataStorage.getItem(SECRET_SOURCES_ID)),
        ).toHaveLength(1);
      });
    });
  });

  describe("legacy repairs folded into the install pass", () => {
    it("backfills keyIdList for a pre-v1.0.6 wallet", async () => {
      await mockStorageApi.clear();
      await mockStorageApi.set({
        [`stellarkeys:${PRE_V2_DERIVED_0_ID}`]:
          PRE_V2_KEYSTORES[`stellarkeys:${PRE_V2_DERIVED_0_ID}`],
        keyId: PRE_V2_DERIVED_0_ID,
      });

      await installPass();

      expect(await mockDataStorage.getItem(KEY_ID_LIST)).toEqual([
        PRE_V2_DERIVED_0_ID,
      ]);
      expect(
        JSON.parse(
          decodeString(await mockDataStorage.getItem(ACCOUNT_NAME_LIST_ID)),
        ),
      ).toEqual({ [PRE_V2_DERIVED_0_ID]: "Account 1" });
      expect(await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID)).toEqual([
        PRE_V2_DERIVED_0_ID,
      ]);

      await unlock();

      expect(allAccounts().map((a) => a.id)).toEqual([PRE_V2_DERIVED_0_ID]);
      expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
        PRE_UPGRADE_METRICS_USER_ID,
      );
      expect(await mockDataStorage.getItem(DERIVATION_INDICES_ID)).toEqual({
        [PHRASE.userId]: [0],
      });
    });

    it("does not resurrect a stale keyId whose keystore is gone", async () => {
      await mockStorageApi.clear();
      await mockStorageApi.set({ keyId: "0.123" });

      await installPass();

      expect(await mockDataStorage.getItem(KEY_ID_LIST)).toBeUndefined();
      expect(
        await mockDataStorage.getItem(PENDING_ATTRIBUTION_ID),
      ).toBeUndefined();
    });

    it("coerces a numeric keyId and keyIdList entries to strings", async () => {
      await mockStorageApi.clear();
      const keystore = PRE_V2_KEYSTORES[`stellarkeys:${PRE_V2_DERIVED_0_ID}`];
      await mockStorageApi.set({
        [`stellarkeys:${PRE_V2_DERIVED_0_ID}`]: keystore,
        keyId: Number(PRE_V2_DERIVED_0_ID),
        keyIdList: [Number(PRE_V2_DERIVED_0_ID)],
      });

      await installPass();

      expect(await mockDataStorage.getItem(KEY_ID)).toBe(PRE_V2_DERIVED_0_ID);
      expect(await mockDataStorage.getItem(KEY_ID_LIST)).toEqual([
        PRE_V2_DERIVED_0_ID,
      ]);
    });

    it("confirmPassword no longer repairs storage itself", async () => {
      // The v1.0.6 backfill used to run inline here, before the password was
      // checked. Now the install pass owns it, and unlock writes nothing to
      // the legacy keys.
      await mockStorageApi.clear();
      await mockStorageApi.set({
        [`stellarkeys:${PRE_V2_DERIVED_0_ID}`]:
          PRE_V2_KEYSTORES[`stellarkeys:${PRE_V2_DERIVED_0_ID}`],
        keyId: PRE_V2_DERIVED_0_ID,
      });

      await unlock("not the password");

      expect(await mockDataStorage.getItem(KEY_ID_LIST)).toBeUndefined();
      expect(
        await mockDataStorage.getItem(KEY_DERIVATION_NUMBER_ID),
      ).toBeUndefined();
      expect(
        await mockDataStorage.getItem(ACCOUNT_NAME_LIST_ID),
      ).toBeUndefined();
    });
  });
});
