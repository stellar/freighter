import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import * as StellarSDK from "stellar-sdk";
import {
  connectToLedgerTransport,
  createWalletConnection,
  getWalletPublicKey,
  hardwareSign,
  hardwareSignAuth,
} from "popup/helpers/hardwareConnect";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

jest.mock("@ledgerhq/hw-transport-webhid", () => {
  return {
    list: jest.fn().mockResolvedValue([
      {
        close: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    ]),
    create: jest.fn().mockResolvedValue({
      close: jest.fn(),
    }),
    request: jest.fn().mockResolvedValue({
      close: jest.fn(),
    }),
  };
});

jest.mock("@ledgerhq/hw-app-str", () => {
  return jest.fn().mockImplementation(() => {
    return {
      getPublicKey: (param: string) =>
        Promise.resolve({
          rawPublicKey: Buffer.from(param),
        }),
      signTransaction: () => Promise.resolve({ signature: "signTransaction" }),
      signHash: () => Promise.resolve({ signature: "signHash" }),
      signSorobanAuthorization: () =>
        Promise.resolve({ signature: "signSorobanAuthorization" }),
    };
  });
});

describe("connectToLedgerTransport", () => {
  it("should connect to the ledger transport", async () => {
    const transport = await connectToLedgerTransport();
    expect(transport).toBeDefined();
    expect(TransportWebHID.list).toHaveBeenCalled();
    expect(TransportWebHID.create).toHaveBeenCalled();
  });
});

describe("createWalletConnection", () => {
  const strKey = StellarSDK.StrKey;
  it("should create a wallet connection", async () => {
    const StrKeySpy = jest.spyOn(strKey, "encodeEd25519PublicKey" as any);
    const walletConnection =
      await createWalletConnection[WalletType.LEDGER]("test");

    expect(walletConnection).toBeDefined();
    expect(StrKeySpy).toHaveBeenCalledWith(Buffer.from("test"));
  });
});

describe("getWalletPublicKey", () => {
  const strKey = StellarSDK.StrKey;
  it("should get a wallet public key", async () => {
    const StrKeySpy = jest.spyOn(strKey, "encodeEd25519PublicKey" as any);
    const publicKey = await getWalletPublicKey[WalletType.LEDGER]("test");
    expect(publicKey).toBeDefined();
    expect(StrKeySpy).toHaveBeenCalledWith(Buffer.from("test"));
  });
});

describe("hardwareSign", () => {
  it("should sign a transaction", async () => {
    const signature = await hardwareSign[WalletType.LEDGER]({
      bipPath: "bip",
      tx: StellarSDK.TransactionBuilder.fromXDR(
        "AAAAAgAAAACdtkcf/ACLqOtoQjsJLphTtyieRSEnb9pnqaf7WLws3QAAAGQDAtjKAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFf/////////8AAAAAAAAAAA==",
        TESTNET_NETWORK_DETAILS.networkPassphrase,
      ),
      isHashSigningEnabled: false,
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signTransaction");
  });
  it("should sign a hash", async () => {
    const signature = await hardwareSign[WalletType.LEDGER]({
      bipPath: "bip",
      tx: StellarSDK.TransactionBuilder.fromXDR(
        "AAAAAgAAAACdtkcf/ACLqOtoQjsJLphTtyieRSEnb9pnqaf7WLws3QAAAGQDAtjKAAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFf/////////8AAAAAAAAAAA==",
        TESTNET_NETWORK_DETAILS.networkPassphrase,
      ),
      isHashSigningEnabled: true,
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signHash");
  });
});

describe("hardwareSignAuth", () => {
  it("should sign a Soroban authorization", async () => {
    const signature = await hardwareSignAuth[WalletType.LEDGER]({
      bipPath: "bip",
      auth: Buffer.from("auth"),
    });
    expect(signature).toBeDefined();
    expect(signature).toBe("signSorobanAuthorization");
  });
});
