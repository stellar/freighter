import {
  mockKeyManager,
  mockStorageApi,
} from "background/messageListener/helpers/test-helpers";

/**
 * A keystore entry written by @stellar/typescript-wallet-sdk-km 3.0.1, the
 * version Freighter shipped before moving to v5. Installs that were onboarded
 * on an older release still hold blobs in exactly this shape, so the bundled
 * key manager has to keep decrypting them — an envelope change in the
 * encrypter would lock those users out of their accounts.
 */
const LEGACY_KEY_ID = "legacy-km-3-key";
const LEGACY_PASSWORD = "hunter2 hunter2";
const LEGACY_PUBLIC_KEY =
  "GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB";
const LEGACY_PRIVATE_KEY =
  "SDHOAMBNLGCE2MV5ZKIVZAQD3VCLGP53P3OBSBI6UN5L5XZI5TKHFQL4";
const LEGACY_STORAGE_ENTRY = {
  [`stellarkeys:${LEGACY_KEY_ID}`]: {
    id: LEGACY_KEY_ID,
    encryptedBlob:
      "AR3jKdzfb8CeNWLMk45l9wT+nsobv95JAdQ9kx17cIK8CWFak+zxvO6xUZs2eJvzy9fZPIF57r/WhURib8bG2PA36MH8m9t9HDZ/XmiiL4ZDwJwTM9xb/Q2LveFtEowryvg6pI6G1vbw1upmRzpoDbvmfVloql9Qs2K6lchWNquAyqVjBkZo9WSyIK5KIpYNv1VpHZ13UCn4beU4Kxplzf/e+Z5h07JE22u1sOvf8gUfMJw9L+tZ8S77DxSdoxLYMlIlXdG7AMM4QmiasW67jmLLO7H0vUPgOwyyWYZQfwLxl/W0T5XZSuwGwuo08paYhcBXjjyvFIMSRBUf+NgtHUgbO6VLWl+Dd5JS9g==",
    encrypterName: "ScryptEncrypter",
    salt: "1jZ1b15qAKrGmYuDCIo2qUYTOtq33gytws/TEbKlCVE=",
  },
};

describe("keystores written by an earlier key manager", () => {
  beforeEach(async () => {
    await mockStorageApi.clear();
    await mockStorageApi.set(LEGACY_STORAGE_ENTRY);
  });

  it("unlocks a key encrypted by wallet-sdk-km 3.0.1", async () => {
    const key = await mockKeyManager.loadKey(LEGACY_KEY_ID, LEGACY_PASSWORD);

    expect(key.publicKey).toBe(LEGACY_PUBLIC_KEY);
    expect(key.privateKey).toBe(LEGACY_PRIVATE_KEY);
    expect(key.type).toBe("plaintextKey");
    expect(key.extra).toEqual({
      imported: false,
      mnemonicPhrase: "test test test",
    });
  });

  it("still rejects the wrong password", async () => {
    await expect(
      mockKeyManager.loadKey(LEGACY_KEY_ID, "not the password"),
    ).rejects.toThrow();
  });
});
