import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { store } from "background/store";
import {
  publicKeySelector,
  privateKeySelector,
  allAccountsSelector,
  sessionSlice,
} from "background/ducks/session";
import { decodeString } from "helpers/urls";

const PUB_KEY = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";
const PRIV_KEY = "SAUIIOB4EB6MZ25RKTKQ6DBXBDKKFQVMPLS2Q5LDH4GAMT7SAQPQMNCB";

console.error = jest.fn((e) => console.log(e));

async function getKeyId(pubKey, privKey) {
  const str = pubKey + privKey;
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

describe.skip("regular account flow", () => {
  beforeAll(async () => {
    // const keyId = await getKeyId(PUB_KEY, PRIV_KEY)
    await browser.storage.local.clear();
    store.dispatch(sessionSlice.actions.reset());
  });
  describe("CREATE_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CREATE_ACCOUNT;
      r.password = "test";
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(publicKeySelector(store.getState())).toBeTruthy();
      expect(privateKeySelector(store.getState())).toBe("");
      expect(allAccountsSelector(store.getState()).length).toBe(1);
      // check localStorage
      const keyIdList = await browser.storage.local.get("keyIdList");
      expect(keyIdList.length).toBe(1);
    });
  });
  describe.skip("CONFIRM_PASSWORD", () => {
    it("works after importing hardware wallet", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
      r.password = "test";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe.skip("LOAD_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.LOAD_ACCOUNT;

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe.skip("SIGN_OUT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.SIGN_OUT;
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe.skip("CONFIRM_PASSWORD", () => {
    it("works after signing out", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
      r.password = "test";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe.skip("ADD_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.ADD_ACCOUNT;
      r.password = "test";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      expect(allAccountsSelector(store.getState()).length).toBe(2);
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(2);
    });
  });
  describe.skip("MAKE_ACCOUNT_ACTIVE", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE;
      r.publicKey = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});

describe.skip("adding hardware wallets", () => {
  beforeAll(() => {
    localStorage.clear();
    store.dispatch(sessionSlice.actions.reset());
  });
  describe("CREATE_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CREATE_ACCOUNT;
      r.password = "test";
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(publicKeySelector(store.getState())).toBeTruthy();
      expect(privateKeySelector(store.getState())).toBe("");
      expect(allAccountsSelector(store.getState()).length).toBe(1);
      // check localStorage
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(1);
    });
  });
  describe("IMPORT_HARDWARE_WALLET", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.IMPORT_HARDWARE_WALLET;
      r.publicKey = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";
      r.hardwareWalletType = "Ledger";
      r.bipPath = "44'/148'/1'";
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(publicKeySelector(store.getState())).toBe(
        "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
      );
      expect(privateKeySelector(store.getState())).toBe("");
      expect(allAccountsSelector(store.getState()).length).toBe(2);
      // check localStorage
      const keyIdStorage = browser.storage.local.get("keyId");
      expect(keyIdStorage.indexOf("hw:")).toBe(0);
      expect(keyIdStorage.split(":")[1]).toBe(
        "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
      );
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(2);
      expect(
        browser.storage.local.get(
          "hw:GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
        ),
      ).toBe(
        JSON.stringify({
          bipPath: "44'/148'/1'",
          publicKey: "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
        }),
      );
    });
  });
  describe("SIGN_OUT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.SIGN_OUT;
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe("CONFIRM_PASSWORD", () => {
    it("works after signing out", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
      r.password = "test";

      const resp = await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      expect(resp.bipPath).toBe("44'/148'/1'");
    });
  });
  describe("LOAD_ACCOUNT", () => {
    it("loads bip path correctly", async () => {
      const r = {};
      r.type = SERVICE_TYPES.LOAD_ACCOUNT;

      const resp = await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      expect(resp.bipPath).toBe("44'/148'/1'");
    });
  });
  describe("IMPORT_HARDWARE_WALLET", () => {
    it("doesn't load the same account twice", async () => {
      const r = {};
      r.type = SERVICE_TYPES.IMPORT_HARDWARE_WALLET;
      r.publicKey = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";
      r.hardwareWalletType = "Ledger";
      r.bipPath = "44'/148'/1'";
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(allAccountsSelector(store.getState()).length).toBe(2);
      // check localStorage
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(2);
      expect(
        Object.keys(
          JSON.parse(
            decodeString(browser.storage.local.get("accountNameList")),
          ),
        ).length,
      ).toBe(2);
    });
  });
  describe("CONFIRM_PASSWORD", () => {
    it("works after importing hardware wallet", async () => {
      const r = {};
      r.type = SERVICE_TYPES.CONFIRM_PASSWORD;
      r.password = "test";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
    });
  });
  describe("IMPORT_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.IMPORT_ACCOUNT;
      r.password = "test";
      r.privateKey = "SAUIIOB4EB6MZ25RKTKQ6DBXBDKKFQVMPLS2Q5LDH4GAMT7SAQPQMNCB";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(publicKeySelector(store.getState())).toBe(
        "GCYHTBIQHNHKJYG3WJQZ5HS2CDD7MDFOTAT5IGTK7IZXV3SHVQB3VLGV",
      );
      expect(privateKeySelector(store.getState())).toBe(
        "SAUIIOB4EB6MZ25RKTKQ6DBXBDKKFQVMPLS2Q5LDH4GAMT7SAQPQMNCB",
      );
      expect(allAccountsSelector(store.getState()).length).toBe(3);
      // check localStorage
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(3);
      expect(browser.storage.local.get("keyId").indexOf("hw:")).toBe(-1);
    });
  });
  describe("LOAD_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.LOAD_ACCOUNT;

      const resp = await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      expect(resp.bipPath).toBe("");
    });
  });
  describe("MAKE_ACCOUNT_ACTIVE", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE;
      r.publicKey = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();
      expect(browser.storage.local.get("keyId").indexOf("hw:")).toBe(0);
    });
  });
  describe("ADD_ACCOUNT", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.ADD_ACCOUNT;
      r.password = "test";

      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(allAccountsSelector(store.getState()).length).toBe(4);
      // check localStorage
      expect(JSON.parse(browser.storage.local.get("keyIdList")).length).toBe(4);
      expect(browser.storage.local.get("keyId").indexOf("hw:")).toBe(-1);
    });
  });
});
