import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { store } from "background/store";
import {
  publicKeySelector,
  privateKeySelector,
  allAccountsSelector,
} from "background/ducks/session";

console.error = jest.fn((e) => console.log(e));

describe("popupMessageListener", () => {
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
      expect(JSON.parse(localStorage.getItem("keyIdList")).length).toBe(1);
    });
  });

  describe("IMPORT_HARDWARE_WALLET", () => {
    it("works", async () => {
      const r = {};
      r.type = SERVICE_TYPES.IMPORT_HARDWARE_WALLET;
      r.publicKey = "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O";
      r.hardwareWalletType = "ledger";
      await popupMessageListener(r);
      expect(console.error).not.toHaveBeenCalled();

      // check store
      expect(publicKeySelector(store.getState())).toBe(
        "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
      );
      expect(privateKeySelector(store.getState())).toBe("");
      expect(allAccountsSelector(store.getState()).length).toBe(2);
      // check localStorage
      const keyIdStorage = localStorage.getItem("keyId");
      expect(keyIdStorage.indexOf("hw:")).toBe(0);
      expect(keyIdStorage.split(":")[1]).toBe(
        "GBOORGNN6F35F3BFI4SF5ZR4Q7VHALNPGRG3MGA6WMOW4BKFOFMNI45O",
      );
      expect(JSON.parse(localStorage.getItem("keyIdList")).length).toBe(2);
    });
  });

  describe("CONFIRM_PASSWORD", () => {
    it("works", async () => {
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
      expect(JSON.parse(localStorage.getItem("keyIdList")).length).toBe(3);
      expect(localStorage.getItem("keyId").indexOf("hw:")).toBe(-1);
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
      expect(JSON.parse(localStorage.getItem("keyIdList")).length).toBe(4);
      expect(localStorage.getItem("keyId").indexOf("hw:")).toBe(-1);
    });
  });
});
