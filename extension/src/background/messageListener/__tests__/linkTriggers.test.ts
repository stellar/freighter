import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  AddAccountMessage,
  ConfirmMnemonicPhraseMessage,
  ConfirmPasswordMessage,
  CreateAccountMessage,
  ImportAccountMessage,
  RecoverAccountMessage,
} from "@shared/api/types/message-request";
import { AUTH_KEYPAIR_VECTORS } from "@shared/api/helpers/authKeypairVectors";
import { linkWalletSources } from "background/helpers/link-sources";
import { recordLinkResults } from "background/helpers/link-status";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { LINK_STATUS_ID } from "constants/localStorageTypes";

// #68: every place a source can be added, and every unlock, starts a link
// pass. What the pass sends is link-sources.test.ts's business.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const STANDALONE_SECRET =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
const PASSWORD = "test";

jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop, see
// deriveAuthKeypair.ts), so derive from the pinned (mnemonic, index) rows.
jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors, AUTH_KEYPAIR_VECTORS: phrases } =
    jest.requireActual("@shared/api/helpers/authKeypairVectors");
  return {
    generateMnemonic: () => phrases[0].mnemonic,
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      return {
        getPublicKey: (i: number) => rows[i].publicKey,
        getSecret: (i: number) => rows[i].secret,
      };
    },
  };
});

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

const mockLink = linkWalletSources as jest.Mock;

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

const createWallet = () =>
  send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  } as CreateAccountMessage);

const confirmPhrase = (mnemonicPhraseToConfirm: string) =>
  send({
    type: SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE,
    mnemonicPhraseToConfirm,
  } as ConfirmMnemonicPhraseMessage);

const recover = (mnemonic: string, isOverwritingAccount: boolean) =>
  send({
    type: SERVICE_TYPES.RECOVER_ACCOUNT,
    password: PASSWORD,
    recoverMnemonic: mnemonic,
    isOverwritingAccount,
  } as RecoverAccountMessage);

describe("link triggers", () => {
  jest.setTimeout(60_000);

  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch;
    mockLink.mockClear();
  });

  it("links when onboarding confirms the right phrase", async () => {
    await createWallet();
    mockLink.mockClear();

    await confirmPhrase(PHRASE_1.mnemonic);

    expect(mockLink).toHaveBeenCalledTimes(1);
    expect(mockLink).toHaveBeenCalledWith({
      sessionStore: mockSessionStore,
      localStore: mockDataStorage,
    });
  });

  it("does not link when onboarding confirms the wrong phrase", async () => {
    await createWallet();
    mockLink.mockClear();

    await confirmPhrase(PHRASE_2.mnemonic);

    expect(mockLink).not.toHaveBeenCalled();
  });

  it("links after a recover, and again on a re-import of the same phrase", async () => {
    await recover(PHRASE_1.mnemonic, false);
    expect(mockLink).toHaveBeenCalledTimes(1);

    await recover(PHRASE_1.mnemonic, true);
    expect(mockLink).toHaveBeenCalledTimes(2);
  });

  it("clears every link status on a recover, which replaces every source", async () => {
    await createWallet();
    await recordLinkResults({
      localStore: mockDataStorage,
      linked: [PHRASE_1.userId],
      conflicts: [],
    });

    await recover(PHRASE_2.mnemonic, true);

    expect(await mockDataStorage.getItem(LINK_STATUS_ID)).toBeUndefined();
  });

  it("links after an account is derived", async () => {
    await createWallet();
    mockLink.mockClear();

    await send({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PASSWORD,
    } as AddAccountMessage);

    expect(mockLink).toHaveBeenCalled();
  });

  it("links after a key is imported", async () => {
    await createWallet();
    mockLink.mockClear();

    const res = (await send({
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
      password: PASSWORD,
      privateKey: STANDALONE_SECRET,
    } as ImportAccountMessage)) as { error?: string };

    expect(res.error).toBeUndefined();
    expect(mockLink).toHaveBeenCalled();
  });

  it("links on unlock, the retry for a source added while offline", async () => {
    await createWallet();
    await send({ type: SERVICE_TYPES.SIGN_OUT });
    mockLink.mockClear();

    await send({
      type: SERVICE_TYPES.CONFIRM_PASSWORD,
      password: PASSWORD,
    } as ConfirmPasswordMessage);

    expect(mockLink).toHaveBeenCalledTimes(1);
  });

  it("returns stored conflicts on unlock and on loadAccount", async () => {
    await createWallet();
    await recordLinkResults({
      localStore: mockDataStorage,
      linked: [PHRASE_1.userId],
      conflicts: [PHRASE_2.userId],
    });
    await send({ type: SERVICE_TYPES.SIGN_OUT });

    const unlocked = (await send({
      type: SERVICE_TYPES.CONFIRM_PASSWORD,
      password: PASSWORD,
    } as ConfirmPasswordMessage)) as { linkConflicts?: string[] };
    const loaded = (await send({
      type: SERVICE_TYPES.LOAD_ACCOUNT,
    })) as { linkConflicts?: string[] };

    expect(unlocked.linkConflicts).toEqual([PHRASE_2.userId]);
    expect(loaded.linkConflicts).toEqual([PHRASE_2.userId]);
  });
});
