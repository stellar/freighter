import {
  Address,
  Asset,
  Memo,
  StrKey,
  Transaction,
  TransactionBuilder,
  scValToNative,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import { buildMemoFromFederation } from "./federationMemo";
import { SoranDestination } from "./soran";
import i18n from "./localizationConfig";

export interface SoranTransactionContext {
  publicKey: string;
  asset: string;
  isCollectible?: boolean;
  collectionAddress?: string;
  tokenId?: number | null;
}

const mismatch = () =>
  new Error(
    i18n.t(
      "Transaction does not match the Soran payment details. Select the recipient again.",
    ),
  );
export const unsupportedSoranMuxed = () =>
  new Error(
    i18n.t(
      "This transfer cannot preserve the Soran muxed address. Choose another recipient.",
    ),
  );

const expectedContract = (
  context: SoranTransactionContext,
  passphrase: string,
) => {
  if (context.isCollectible) return context.collectionAddress;
  if (isNativeAssetId(context.asset))
    return Asset.native().contractId(passphrase);
  const [code, issuer] = context.asset.split(":");
  return StrKey.isValidContract(issuer || "")
    ? issuer
    : new Asset(code, issuer).contractId(passphrase);
};

/** Bind the actual envelope to a verified route, not just to the UI's label.
 * Only Freighter's single-operation payment/transfer shapes are accepted.
 * Return the hash and route of the validated envelope for local history.
 */
export const assertSoranTransactionRoute = (
  transactionXdr: string,
  expected: Omit<SoranDestination, "memoType"> & { memoType: string },
  network: NetworkDetails,
  context: SoranTransactionContext,
) => {
  try {
    const tx = TransactionBuilder.fromXDR(
      transactionXdr,
      network.networkPassphrase,
    );
    // Internal sends do not use fee-bump wrappers or multiple operations.
    if (
      !(tx instanceof Transaction) ||
      tx.operations.length !== 1 ||
      tx.source !== context.publicKey
    )
      throw mismatch();
    if (!["", "text", "id", "hash"].includes(expected.memoType))
      throw mismatch();
    const memo = expected.memoType
      ? buildMemoFromFederation(expected.memo, expected.memoType)
      : Memo.none();
    if (
      (!expected.memoType && expected.memo) ||
      tx.memo.toXDRObject().toXDR("base64") !==
        memo.toXDRObject().toXDR("base64")
    )
      throw mismatch();
    const op = tx.operations[0];
    if (op.source && op.source !== context.publicKey) throw mismatch();
    let destination: string;
    if (op.type === "invokeHostFunction") {
      if (
        expected.memo ||
        expected.memoType ||
        op.func.type !== "hostFunctionTypeInvokeContract"
      )
        throw mismatch();
      const invocation = op.func.invokeContract;
      if (
        Address.fromScAddress(invocation.contractAddress).toString() !==
          expectedContract(context, network.networkPassphrase) ||
        invocation.functionName.toString() !== "transfer" ||
        invocation.args.length !== 3
      )
        throw mismatch();
      const [from, to, value] = invocation.args;
      if (Address.fromScVal(from).toString() !== context.publicKey)
        throw mismatch();
      destination = Address.fromScVal(to).toString();
      if (context.isCollectible) {
        if (
          StrKey.isValidMed25519PublicKey(expected.address) ||
          value.type !== "scvU32" ||
          scValToNative(value) !== context.tokenId
        )
          throw mismatch();
      } else if (value.type !== "scvI128" || scValToNative(value) <= BigInt(0))
        throw mismatch();
    } else {
      // Contract assets and collectibles must never be replaced with a classic payment.
      if (
        context.isCollectible ||
        StrKey.isValidContract(context.asset.split(":")[1] || "")
      )
        throw mismatch();
      switch (op.type) {
        case "payment":
        case "pathPaymentStrictSend":
        case "pathPaymentStrictReceive":
          destination = op.destination;
          break;
        case "createAccount":
          if (StrKey.isValidMed25519PublicKey(expected.address))
            throw mismatch();
          destination = op.destination;
          break;
        default:
          throw mismatch();
      }
    }
    if (destination !== expected.address) throw mismatch();
    return {
      transactionHash: Buffer.from(tx.hash()).toString("hex"),
      destination,
      memo: expected.memo,
      memoType: expected.memoType || "none",
      networkPassphrase: network.networkPassphrase,
    };
  } catch {
    // Do not surface untrusted XDR, addresses or decoder exceptions in errors.
    throw mismatch();
  }
};
