import {
  deriveKeyFromString,
  encryptHashString,
  decryptHashString,
} from "../session";

describe("session", () => {
  it("should be able to encrypt and decrypt a string", async () => {
    const password = "password";
    const privateKey = "privateKey";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt a very long string with different characters", async () => {
    const password =
      "passwordpasswordpasswordpasswordpasswordpassworw21w1w1@@@@dpasswordpasswordpasswordpcxassad@@@@asswordpasswordpasswordpasswordpassword";
    const privateKey = "privateKeyprivateKeyprivateKeyprivateKey";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt an empty string", async () => {
    const password = "";
    const privateKey = "";

    const { key } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should produce different ciphertexts for the same plaintext", async () => {
    const password = "password";
    const privateKey = "privateKey";

    const { key } = await deriveKeyFromString(password);

    const encrypted1 = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const encrypted2 = await encryptHashString({
      str: privateKey,
      keyObject: { key },
    });

    const bytes1 = new Uint8Array(encrypted1);
    const bytes2 = new Uint8Array(encrypted2);
    const areEqual =
      bytes1.length === bytes2.length &&
      bytes1.every((val, i) => val === bytes2[i]);

    expect(areEqual).toBe(false);
  });
});
