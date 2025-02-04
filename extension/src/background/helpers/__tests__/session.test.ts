import {
  deriveKeyFromString,
  encryptHashString,
  decryptHashString,
} from "../session";

describe("session", () => {
  it("should be able to encrypt and decrypt a string", async () => {
    const password = "password";
    const privateKey = "privateKey";

    const { key, iv } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key, iv },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key, iv },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt a very long string with different characters", async () => {
    const password =
      "passwordpasswordpasswordpasswordpasswordpassworw21w1w1@@@@dpasswordpasswordpasswordpcxassad@@@@asswordpasswordpasswordpasswordpassword";
    const privateKey = "privateKeyprivateKeyprivateKeyprivateKey";

    const { key, iv } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key, iv },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key, iv },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
  it("should be able to encrypt and decrypt an empty string", async () => {
    // this is an edge case and should never happen, but want to make sure this does not throw an error
    const password = "";
    const privateKey = "";

    const { key, iv } = await deriveKeyFromString(password);

    const encryptedPrivateKey = await encryptHashString({
      str: privateKey,
      keyObject: { key, iv },
    });

    const decryptedPrivateKey = await decryptHashString({
      hash: encryptedPrivateKey,
      keyObject: { key, iv },
    });

    expect(decryptedPrivateKey).toEqual(privateKey);
  });
});
