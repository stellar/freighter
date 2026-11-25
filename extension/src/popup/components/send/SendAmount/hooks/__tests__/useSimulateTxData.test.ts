import {
  Account,
  Asset,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { getExpectedToFailReason, getOperation } from "../useSimulateTxData";

const G_DEST = "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV";
const t = (key: string) => key;

describe("getExpectedToFailReason", () => {
  describe("destination is already funded", () => {
    it("returns null for any asset when destination is funded", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: true,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });

    it("returns null when destination funded status is unknown", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: undefined,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });
  });

  describe("destination is unfunded, classic assets", () => {
    it("returns the unfunded warning for a credit_alphanum4 asset (G-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });

    it("returns the unfunded warning for a credit_alphanum12 asset (G-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "LONGCODE12:GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });
  });

  describe("destination is unfunded, pure Soroban custom tokens", () => {
    // Pure Soroban tokens carry a C-issuer in their canonical form. Their
    // `transfer` is a contract invocation — the destination doesn't need
    // to be a funded classic account — so no warning should fire.
    it("returns null for a pure Soroban custom token (C-issuer)", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "PBT:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });

    it("returns null regardless of amount for a pure Soroban custom token", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "PBT:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
          amount: "0",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });

    it("does NOT skip the warning for non-C issuers that aren't classic G-addresses (e.g. liquidity pool share canonicals)", () => {
      // Guards against the skip widening beyond contract-id issuers. A
      // looser check like `!issuer.startsWith("G")` would incorrectly
      // swallow the warning for "<poolId>:lp" and anything else non-G.
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef:lp",
          amount: "10",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBe("Blockaid unfunded destination");
    });
  });

  describe("destination is unfunded, native XLM", () => {
    it("returns the native unfunded warning when amount is below the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "0.5",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBe("Blockaid unfunded destination native");
    });

    it("returns null when XLM amount is at the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "1",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });

    it("returns null when XLM amount is above the create-account minimum", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "5",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBeNull();
    });

    it("returns the native unfunded warning when amount is empty", () => {
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          amount: "",
          destination: G_DEST,
          isCollectible: false,
          t,
        }),
      ).toBe("Blockaid unfunded destination native");
    });
  });

  describe("destination is unfunded, collectibles", () => {
    it("returns null when isCollectible is true regardless of asset", () => {
      // Collectibles transfer via contract invocation; the destination
      // never needs to be a funded classic account.
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical: "native",
          destination: G_DEST,
          isCollectible: true,
          amount: "10",
          t,
        }),
      ).toBeNull();
    });
  });

  describe("destination is unfunded, contract destination", () => {
    it("returns null when destination is a contract address", () => {
      // Contract destinations have no classic account; the warning rule
      // does not apply regardless of the asset being sent.
      expect(
        getExpectedToFailReason({
          isDestinationFunded: false,
          assetCanonical:
            "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          destination:
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
          isCollectible: false,
          amount: "10",
          t,
        }),
      ).toBeNull();
    });
  });
});

const SOURCE_ACCOUNT =
  "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

// Round-trips the built operation through a transaction so the assertions read
// it the way it appears in the envelope that would actually be signed.
const parseOperation = (operation: ReturnType<typeof getOperation>) =>
  new TransactionBuilder(new Account(SOURCE_ACCOUNT, "0"), {
    fee: BASE_FEE,
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build().operations[0];

const buildSendOperation = ({
  sourceAsset,
  isFunded,
}: {
  sourceAsset: Asset | { code: string; issuer: string };
  isFunded: boolean;
}) =>
  getOperation(
    sourceAsset,
    Asset.native(),
    "500",
    "0",
    G_DEST,
    "1",
    [],
    false,
    false,
    isFunded,
    SOURCE_ACCOUNT,
  );

describe("getOperation", () => {
  // A classic asset that uses the native asset's display code but carries its
  // own issuer. Every fixture below pairs it with a genuine native control, so
  // the two cases cannot pass for the same reason.
  const xlmCodedClassicAsset = new Asset("XLM", XLM_CODED_ISSUER);

  it("builds a payment carrying the classic asset when it is sent to an unfunded destination", () => {
    const operation = parseOperation(
      buildSendOperation({
        sourceAsset: xlmCodedClassicAsset,
        isFunded: false,
      }),
    );

    expect(operation.type).toBe("payment");
    const payment = operation as Operation.Payment;
    expect(payment.asset.isNative()).toBe(false);
    expect(payment.asset.getCode()).toBe("XLM");
    expect(payment.asset.getIssuer()).toBe(XLM_CODED_ISSUER);
  });

  it("still builds a create-account for the native asset to an unfunded destination", () => {
    const operation = parseOperation(
      buildSendOperation({ sourceAsset: Asset.native(), isFunded: false }),
    );

    expect(operation.type).toBe("createAccount");
  });

  it("builds a payment carrying the classic asset when the destination is funded", () => {
    const operation = parseOperation(
      buildSendOperation({ sourceAsset: xlmCodedClassicAsset, isFunded: true }),
    );

    expect(operation.type).toBe("payment");
    expect((operation as Operation.Payment).asset.getIssuer()).toBe(
      XLM_CODED_ISSUER,
    );
  });

  it("builds different operations for the native asset and a classic asset sharing its code", () => {
    const fromClassic = buildSendOperation({
      sourceAsset: xlmCodedClassicAsset,
      isFunded: false,
    });
    const fromNative = buildSendOperation({
      sourceAsset: Asset.native(),
      isFunded: false,
    });

    expect(parseOperation(fromClassic)).not.toEqual(parseOperation(fromNative));
  });
});
