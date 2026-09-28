import BigNumber from "bignumber.js";
import { captureException } from "@sentry/browser";
import {
  Address,
  Asset,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  scValToNative,
  xdr,
  walkInvocationTree,
} from "stellar-sdk";

import { HorizonOperation, SorobanBalance } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  ArgsForTransferInvocation,
  SorobanTokenInterface,
  HostFnInvocationArgs,
  SorobanCollectibleInterface,
} from "@shared/constants/soroban/token";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getAssetFromCanonical, getCanonicalFromAsset } from "helpers/stellar";
import { findAssetBalance, isSorobanBalance } from "./balance";
import { getSdk, splitCanonical } from "@shared/helpers/stellar";
import {
  isNativeAssetId,
  isNativeContract,
} from "@shared/helpers/assetIdentity";
import { AssetType } from "@shared/api/types/account-balance";
import { getNativeContractDetails } from "./searchAsset";
import { getTokenDetails } from "@shared/api/internal";
import { isContractId } from "@shared/api/helpers/soroban";
export { isContractId } from "@shared/api/helpers/soroban";

export const SOROBAN_OPERATION_TYPES = [
  "invoke_host_function",
  "invokeHostFunction",
];

// All assets on the classic side have 7 decimals
// https://developers.stellar.org/docs/fundamentals-and-concepts/stellar-data-structures/assets#amount-precision
export const CLASSIC_ASSET_DECIMALS = 7;

/**
 * Gets the correct decimals for an asset.
 * For Soroban contracts, fetches decimals via RPC.
 * For native XLM and classic assets, returns CLASSIC_ASSET_DECIMALS (7) without throwing.
 *
 * @throws Error if the RPC call succeeds but returns no decimals (only for Soroban contracts)
 * @param params - Parameters object
 * @param params.assetIssuer - The asset issuer (contract ID for Soroban, issuer address for classic, null for native)
 * @param params.publicKey - The public key for the account
 * @param params.networkDetails - Network configuration details
 * @returns The number of decimals for the asset
 */
export const getDecimalsForAsset = async ({
  assetIssuer,
  publicKey,
  networkDetails,
}: {
  assetIssuer: string | null;
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<number> => {
  // For Soroban contracts, fetch decimals via RPC
  if (assetIssuer && isContractId(assetIssuer)) {
    const tokenDetails = await getTokenDetails({
      contractId: assetIssuer,
      publicKey,
      networkDetails,
    });

    if (tokenDetails && tokenDetails.decimals !== undefined) {
      return tokenDetails.decimals;
    }

    // If API call succeeded but no decimals returned, throw
    throw new Error(`Unable to fetch decimals for contract ${assetIssuer}`);
  }

  // For native XLM and classic assets, return standard decimals
  return CLASSIC_ASSET_DECIMALS;
};

/**
 * Checks if a transaction is a Soroban transaction.
 * A transaction is considered Soroban if:
 * - The selected balance is a Soroban token (has a contractId), OR
 * - The recipient address is a contract address, OR
 * - The isToken flag is true and contractId exists, OR
 * - The isInvokeHostFn flag is true (for history operations)
 *
 * @param params - Parameters object
 * @param params.selectedBalance - The selected balance (can be undefined)
 * @param params.recipientAddress - The recipient address (can be undefined)
 * @param params.isToken - Flag indicating if this is a token transaction (can be undefined)
 * @param params.contractId - Contract ID for the token (can be undefined)
 * @param params.isInvokeHostFn - Flag indicating if this is an invoke host function operation (can be undefined)
 * @returns True if the transaction is a Soroban transaction, false otherwise
 */
export const isSorobanTransaction = ({
  selectedBalance,
  recipientAddress,
  isToken,
  contractId,
  isInvokeHostFn,
}: {
  selectedBalance?: AssetType;
  recipientAddress?: string;
  isToken?: boolean;
  contractId?: string;
  isInvokeHostFn?: boolean;
}): boolean => {
  // Check if it's an invoke host function operation (for history)
  if (isInvokeHostFn) {
    return true;
  }

  // Check if selected balance is a Soroban balance (has contractId)
  if (selectedBalance && isSorobanBalance(selectedBalance)) {
    return true;
  }

  // Check if recipient address is a contract address
  if (recipientAddress && isContractId(recipientAddress)) {
    return true;
  }

  // Check if isToken flag is true and contractId exists
  if (isToken && contractId) {
    return true;
  }

  return false;
};

/**
 * Extracts the contract ID from transaction data.
 *
 * This function determines which contract ID to use based on the transaction type:
 * - For collectibles: returns the collection address
 * - For tokens: extracts contract ID from the token ID using getContractIdFromTokenId
 * - For other types: returns undefined
 *
 * @param params - Parameters object
 * @param params.isCollectible - Whether this transaction involves a collectible (NFT)
 * @param params.collectionAddress - The contract address of the collectible collection
 * @param params.isToken - Whether this transaction involves a Soroban token
 * @param params.asset - The asset identifier (token ID or symbol:contractId format)
 * @param params.networkDetails - Network configuration details for resolving contract IDs
 * @returns The contract ID if available, undefined otherwise
 *
 * @example
 * // For a collectible transaction
 * getContractIdFromTransactionData({
 *   isCollectible: true,
 *   collectionAddress: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
 *   isToken: false,
 *   asset: "",
 *   networkDetails: testnetDetails
 * })
 * // Returns: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
 *
 * @example
 * // For a token transaction
 * getContractIdFromTransactionData({
 *   isCollectible: false,
 *   collectionAddress: "",
 *   isToken: true,
 *   asset: "USDC:CAQEEHVUG3D5YACMWVYGG7XQNQB3O6T6PK6TPZSDP75H3PVY7KDUMQQ",
 *   networkDetails: testnetDetails
 * })
 * // Returns: "CAQEEHVUG3D5YACMWVYGG7XQNQB3O6T6PK6TPZSDP75H3PVY7KDUMQQ"
 *
 * @example
 * // For a non-token, non-collectible transaction
 * getContractIdFromTransactionData({
 *   isCollectible: false,
 *   collectionAddress: "",
 *   isToken: false,
 *   asset: "native",
 *   networkDetails: testnetDetails
 * })
 * // Returns: undefined
 */
export const getContractIdFromTransactionData = ({
  isCollectible,
  collectionAddress,
  isToken,
  asset,
  networkDetails,
}: {
  isCollectible: boolean;
  collectionAddress: string;
  isToken: boolean;
  asset: string;
  networkDetails: NetworkDetails;
}) => {
  if (isCollectible && collectionAddress) {
    return collectionAddress;
  }

  if (!isToken || !asset) {
    return undefined;
  }
  return getContractIdFromTokenId(asset, networkDetails);
};

/**
 * Extracts contract ID from a token ID string.
 * Token ID format:
 * - "native" for XLM
 * - "CODE:ISSUER" for classic tokens
 * - Contract address for Soroban tokens
 * - "SYMBOL:CONTRACTID" for Soroban tokens with symbol
 *
 * @param tokenId - The token identifier string
 * @returns Contract ID if the token is a Soroban token, undefined otherwise
 */
export const getContractIdFromTokenId = (
  tokenId: string,
  networkDetails: NetworkDetails,
): string | undefined => {
  if (isNativeAssetId(tokenId)) {
    return getNativeContractDetails(networkDetails).contract;
  }

  // Check if tokenId itself is a contract ID
  if (isContractId(tokenId)) {
    return tokenId;
  }

  // SYMBOL:CONTRACTID format (Soroban token). The symbol may itself contain
  // a colon, so read the issuer half from the last separator.
  const { issuer } = splitCanonical(tokenId);
  if (isContractId(issuer)) {
    return issuer;
  }

  // Classic token format: CODE:ISSUER (no contract ID)
  return undefined;
};

export const getAssetDecimals = (
  asset: string,
  balances: AccountBalances,
  isToken: boolean,
) => {
  if (isToken) {
    const _balances = balances.balances;
    const canonical = getAssetFromCanonical(asset);
    const balance = findAssetBalance(_balances, canonical);

    if (balance && "decimals" in balance) {
      return Number(balance.decimals);
    }
  }

  return CLASSIC_ASSET_DECIMALS;
};

export const getTokenBalance = (tokenBalance: SorobanBalance) =>
  formatTokenAmount(
    new BigNumber(tokenBalance.total),
    Number(tokenBalance.decimals),
  );

export const getAvailableBalance = ({
  assetCanonical,
  balances,
  recommendedFee,
}: {
  assetCanonical: string;
  balances: AssetType[];
  recommendedFee: string;
}) => {
  const selectedCanonical = getAssetFromCanonical(assetCanonical);
  const selectedBalance = findAssetBalance(balances, selectedCanonical);
  if (selectedBalance) {
    if (isSorobanBalance(selectedBalance)) {
      return getTokenBalance(selectedBalance);
    }

    const balance = selectedBalance.total;
    if ("minimumBalance" in selectedBalance && selectedBalance.minimumBalance) {
      // take base reserve into account for XLM payments
      const minBalance = selectedBalance.minimumBalance;
      const currentBal = new BigNumber(balance.toFixed());
      const available = currentBal
        .minus(minBalance)
        .minus(new BigNumber(Number(recommendedFee)));

      // Ensure we don't go below zero
      return BigNumber.max(available, new BigNumber(0)).toFixed().toString();
    } else {
      return new BigNumber(balance).toFixed().toString();
    }
  }
  return "0";
};

// Adopted from https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/fixednumber.ts#L27
export const formatTokenAmount = (amount: BigNumber, decimals: number) => {
  let formatted = amount.toString();

  if (decimals > 0) {
    formatted = amount.shiftedBy(-decimals).toFixed(decimals).toString();

    // Trim trailing zeros
    while (formatted[formatted.length - 1] === "0") {
      formatted = formatted.substring(0, formatted.length - 1);
    }

    if (formatted.endsWith(".")) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
  }

  return formatted;
};

export const parseTokenAmount = (value: string, decimals: number) => {
  const comps = value.split(".");

  let whole = comps[0];
  let fraction = comps[1];
  if (!whole) {
    whole = "0";
  }
  if (!fraction) {
    fraction = "0";
  }

  // Trim trailing zeros
  while (fraction[fraction.length - 1] === "0") {
    fraction = fraction.substring(0, fraction.length - 1);
  }

  // If decimals is 0, we have an empty string for fraction
  if (fraction === "") {
    fraction = "0";
  }

  // Fully pad the string with zeros to get to value
  while (fraction.length < decimals) {
    fraction += "0";
  }

  const wholeValue = new BigNumber(whole);
  const fractionValue = new BigNumber(fraction);

  return wholeValue.shiftedBy(decimals).plus(fractionValue);
};

/**
 * Narrows an ScVal to its SCV_ADDRESS arm.
 *
 * Pre-v17 the generated arm accessor (`scVal.address()`) threw when the union
 * carried a different arm; `expectUnionVariant` preserves that contract now
 * that arms are plain properties on variant classes.
 *
 * @throws TypeError if the value is not an SCV_ADDRESS
 */
export const scValToAddress = (scVal: xdr.ScVal): xdr.ScAddress =>
  xdr.expectUnionVariant(scVal, "scvAddress").address;

export const addressToString = (address: xdr.ScAddress) => {
  if (address.type === "scAddressTypeAccount") {
    return StrKey.encodeEd25519PublicKey(address.accountId.ed25519.toBytes());
  }

  return Address.fromScAddress(address).toString();
};

export const getArgsForTokenInvocation = (
  fnName: string,
  args: xdr.ScVal[],
): ArgsForTransferInvocation => {
  let tokenId: number | undefined;
  let amount: bigint | number | undefined;
  let from = "";
  let to = "";
  const thirdArgType = args[2].type;

  switch (fnName) {
    case SorobanTokenInterface.transfer:
    case SorobanCollectibleInterface.transfer:
      // both SEP-41 & SEP-50 tokens use the transfer method
      // with different signatures. Without parsing the token spec,
      // we can guess that the contract is either a token or a collectible
      // by the type of the 3rd argument.
      // Token transfer - (from: Address, to: Address, amount: i128)
      // Collectible transfer - (from: Address, to: Address, tokenId: u32)
      if (thirdArgType === "scvI128") {
        amount = scValToNative(args[2]);
      }
      if (thirdArgType === "scvU32") {
        tokenId = scValToNative(args[2]);
      }
      from = addressToString(scValToAddress(args[0]));
      to = addressToString(scValToAddress(args[1]));
      break;
    case SorobanTokenInterface.mint:
      to = addressToString(scValToAddress(args[0]));
      amount = scValToNative(args[1]);
      break;
    default:
      amount = BigInt(0);
  }

  return { from, to, amount, tokenId };
};

const isSorobanOp = (operation: HorizonOperation) =>
  SOROBAN_OPERATION_TYPES.includes(operation.type);

export const getInvocationArgsFromInvokeHostFn = (
  hostFn: Operation.InvokeHostFunction,
): HostFnInvocationArgs | null => {
  const func = hostFn?.func;
  if (!func || func.type !== "hostFunctionTypeInvokeContract") {
    return null;
  }

  const invokedContract: xdr.InvokeContractArgs = func.invokeContract;

  const contractId = addressToString(invokedContract.contractAddress);

  // A function name is a byte string, not guaranteed text. Decode it strictly
  // rather than leniently: a binary name can never be one of the token
  // interfaces, so treat it as "not a token invocation" instead of matching on
  // a lossily decoded string.
  const fnName = invokedContract.functionName.asStringOrBytes();
  const args = invokedContract.args;

  if (typeof fnName !== "string") {
    return null;
  }

  if (
    fnName !== SorobanTokenInterface.transfer &&
    fnName !== SorobanTokenInterface.mint &&
    fnName !== SorobanCollectibleInterface.transfer
  ) {
    return null;
  }

  let opArgs;

  try {
    opArgs = getArgsForTokenInvocation(fnName, args);
  } catch (e) {
    return null;
  }

  return {
    fnName,
    contractId,
    ...opArgs,
  };
};

export const getAttrsFromSorobanHorizonOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  if (!isSorobanOp(operation)) {
    return null;
  }

  const txEnvelope = TransactionBuilder.fromXdr(
    operation.transaction_attr.envelope_xdr as string,
    networkDetails.networkPassphrase,
  ) as Transaction;

  // only one op per tx in Soroban right now; isSorobanOp above guarantees it
  // is an invokeHostFunction operation
  const invokeHostFn = txEnvelope.operations[0] as Operation.InvokeHostFunction;

  return getInvocationArgsFromInvokeHostFn(invokeHostFn);
};

export interface InvocationTree {
  type: string;
  args: any;
  invocations: InvocationTree[];
}

export function buildInvocationTree(root: xdr.SorobanAuthorizedInvocation) {
  const fn = root.function;
  const output = {} as InvocationTree;
  const inner = fn.value;

  switch (fn.type) {
    case "sorobanAuthorizedFunctionTypeContractFn": {
      const _inner = fn.contractFn;
      output.type = "execute";
      output.args = {
        source: Address.fromScAddress(_inner.contractAddress).toString(),
        function: xdrStringToDisplay(_inner.functionName),
        // The escaped display form is not a name. Carry the raw one alongside
        // it, undefined when the bytes are not text, so the contract-spec
        // lookup keys off what was signed rather than off what is drawn.
        functionRaw: xdrStringToRaw(_inner.functionName),
        // Carry the signed `ScVal`s through untouched. Decoding to natives
        // here forced the render layer to re-encode with `nativeToScVal`, a
        // round trip that silently re-types map keys.
        args: _inner.args,
      };
      break;
    }

    case "sorobanAuthorizedFunctionTypeCreateContractHostFn":
    case "sorobanAuthorizedFunctionTypeCreateContractV2HostFn": {
      const isCreateV2 =
        fn.type === "sorobanAuthorizedFunctionTypeCreateContractV2HostFn";
      const _inner: xdr.CreateContractArgs | xdr.CreateContractArgsV2 =
        fn.type === "sorobanAuthorizedFunctionTypeCreateContractV2HostFn"
          ? fn.createContractV2HostFn
          : fn.createContractHostFn;
      output.type = "create";
      output.args = {} as {
        type: string;
        wasm: any;
      };

      const exec = _inner.executable;
      const preimage = _inner.contractIdPreimage;

      switch (exec.type) {
        case "contractExecutableWasm": {
          // A WASM executable must be paired with an address preimage.
          if (preimage.type !== "contractIdPreimageFromAddress") {
            throw new Error(
              `creation function appears invalid: ${JSON.stringify(
                inner,
              )} (should be wasm+address or token+asset)`,
            );
          }
          const details = preimage.fromAddress;

          output.args.type = "wasm";
          output.args.wasm = {
            salt: xdr.encodeBytes(details.salt.toBytes(), "hex"),
            hash: xdr.encodeBytes(exec.wasmHash.toBytes(), "hex"),
            address: Address.fromScAddress(details.address).toString(),
          };
          if (isCreateV2) {
            const v2Args = _inner as xdr.CreateContractArgsV2;
            output.args.constructorArgs = v2Args.constructorArgs;
          }
          break;
        }

        case "contractExecutableStellarAsset": {
          // A SAC executable must be paired with an asset preimage.
          if (preimage.type !== "contractIdPreimageFromAsset") {
            throw new Error(
              `creation function appears invalid: ${JSON.stringify(
                inner,
              )} (should be wasm+address or token+asset)`,
            );
          }
          output.args.type = "sac";
          output.args.asset = Asset.fromOperation(
            preimage.fromAsset,
          ).toString();
          if (isCreateV2) {
            const v2Args = _inner as xdr.CreateContractArgsV2;
            output.args.constructorArgs = v2Args.constructorArgs;
          }
          break;
        }

        case "contractExecutableExternalRef": {
          const { executableOwner, tag } = exec.externalRef;

          output.args.type = "externalRef";
          output.args.externalRef = {
            owner: Address.fromScAddress(executableOwner).toString(),
            tag: tag.toJson(),
          };
          // External references derive the contract ID from address + salt.
          if (preimage.type !== "contractIdPreimageFromAddress") {
            throw new Error(
              `creation function appears invalid: an external-ref executable is paired with ${preimage.type} (should be external-ref+address)`,
            );
          }
          const details = preimage.fromAddress;
          output.args.externalRef.address = Address.fromScAddress(
            details.address,
          ).toString();
          output.args.externalRef.salt = xdr.encodeBytes(
            details.salt.toBytes(),
            "hex",
          );
          if (isCreateV2) {
            const v2Args = _inner as xdr.CreateContractArgsV2;
            output.args.constructorArgs = v2Args.constructorArgs;
          }
          break;
        }

        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }

      break;
    }

    default:
      throw new Error(
        `unknown invocation type (${(fn as xdr.SorobanAuthorizedFunction).type}): ${JSON.stringify(fn)}`,
      );
  }

  output.invocations = root.subInvocations.map((i) => buildInvocationTree(i));
  return output;
}

const DISPLAY_INDENT = "  ";

/** Soroban symbols are `[a-zA-Z0-9_]`, so anything else has to be quoted. */
const isBareSymbol = (value: string) => /^[a-zA-Z0-9_]+$/.test(value);

/** An `XdrString`-backed field, reached through its canonical wire bytes. */
type XdrStringLike = { bytes: Uint8Array };

/** What an `XdrString`-backed field is, where that decides its quoting. */
type XdrStringKind = "string" | "symbol";

const HEX_DIGITS = "0123456789abcdef";

/** The escapes SEP-0051 gives a name to, so the common ones stay readable. */
const NAMED_ESCAPES = new Map([
  [0x00, "\\0"],
  [0x09, "\\t"],
  [0x0a, "\\n"],
  [0x0d, "\\r"],
  [0x5c, "\\\\"],
]);

const hexEscape = (byte: number) =>
  `\\x${HEX_DIGITS[(byte >> 4) & 0xf]}${HEX_DIGITS[byte & 0xf]}`;

/** How many bytes the UTF-8 sequence opened by this byte should span. */
const utf8SequenceWidth = (byte: number) => {
  if (byte >= 0xc2 && byte <= 0xdf) {
    return 2;
  }
  if (byte >= 0xe0 && byte <= 0xef) {
    return 3;
  }
  if (byte >= 0xf0 && byte <= 0xf4) {
    return 4;
  }
  return 0;
};

/**
 * Codepoints that decode cleanly but cannot be seen: C1 controls, bidi
 * overrides and zero-width marks. Left as-is they let one signed string
 * impersonate another on the approval screen — the same defect as a lenient
 * byte decode, just spelled in valid UTF-8.
 */
const isInvisible = (code: number) =>
  (code >= 0x7f && code <= 0x9f) ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x202a && code <= 0x202e) ||
  (code >= 0x2066 && code <= 0x2069) ||
  code === 0xfeff;

const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

/**
 * Renders the wire bytes of an `XdrString` as display text that stands for
 * exactly one byte string.
 *
 * These fields are byte strings, not guaranteed text, and every lossy reading
 * of them collapses distinct signed payloads onto one screen string: the
 * lenient `toString()` turns every invalid byte into U+FFFD, so `"transfer" +
 * 0xFF` and `"transfer" + 0xFE` look the same; a bare hex fallback can be
 * spelled out by valid text that happens to read `string(0x...)`; and an
 * unescaped bidi override can reorder what is drawn without changing what is
 * signed.
 *
 * So: escape rather than substitute. Backslash, the C0/C1 controls and the
 * invisible codepoints become escapes, invalid bytes become `\xNN`, and
 * everything else — including ordinary non-ASCII text — is passed through
 * untouched. Because the backslash is itself escaped, the escapes are
 * prefix-free and no two byte strings can produce the same output.
 *
 * This is the SDK's SEP-0051 `toJson()` alphabet, widened to leave legible
 * text legible: `toJson()` hex-escapes every byte above ASCII, which would
 * render `café` as `caf\xc3\xa9` on every signing screen.
 */
export const escapeXdrString = (bytes: Uint8Array) => {
  let out = "";
  let index = 0;

  while (index < bytes.length) {
    const byte = bytes[index];
    const named = NAMED_ESCAPES.get(byte);

    if (named) {
      out += named;
      index += 1;
    } else if (byte < 0x20) {
      out += hexEscape(byte);
      index += 1;
    } else if (byte < 0x7f) {
      out += String.fromCharCode(byte);
      index += 1;
    } else {
      // Above ASCII: decode the one sequence starting here, strictly, so a
      // byte that cannot be part of valid text is escaped on its own rather
      // than swallowing the bytes that follow it.
      const width = utf8SequenceWidth(byte);
      let decoded = "";

      if (width && index + width <= bytes.length) {
        try {
          decoded = strictUtf8.decode(bytes.subarray(index, index + width));
        } catch {
          decoded = "";
        }
      }

      if (!decoded) {
        out += hexEscape(byte);
        index += 1;
      } else {
        const code = decoded.codePointAt(0) as number;
        out += isInvisible(code) ? `\\u{${code.toString(16)}}` : decoded;
        index += width;
      }
    }
  }

  return out;
};

/**
 * Decodes an `XdrString`-backed field (an SCString, an SCSymbol, a function
 * name, a CAP-85 executable tag) for display. See {@link escapeXdrString} for
 * why the bytes are escaped rather than decoded leniently.
 */
export const xdrStringToDisplay = (value: XdrStringLike) =>
  escapeXdrString(value.bytes);

/**
 * The raw text of an `XdrString`-backed field, for the few places that need a
 * lookup key rather than something to show — the contract-spec lookup, most
 * obviously. `undefined` when the bytes are not text, because there is then no
 * name to look up and the escaped display form is not one.
 */
export const xdrStringToRaw = (value: XdrStringLike) => {
  try {
    return strictUtf8.decode(value.bytes);
  } catch {
    return undefined;
  }
};

/** As {@link xdrStringToDisplay}, but quoted for use inside a value literal. */
const xdrStringToLiteral = (value: XdrStringLike, kind: XdrStringKind) => {
  const escaped = escapeXdrString(value.bytes);
  // Layer 1 has already escaped every backslash, so an escaped quote here can
  // only have come from a quote in the signed bytes.
  const quoted = `"${escaped.replace(/"/g, '\\"')}"`;

  if (kind === "symbol") {
    return isBareSymbol(escaped) ? escaped : `symbol(${quoted})`;
  }
  return quoted;
};

const scvAddressToString = (address: xdr.ScAddress) => {
  if (address.type === "scAddressTypeAccount") {
    return StrKey.encodeEd25519PublicKey(address.accountId.ed25519.toBytes());
  }
  return addressToString(address);
};

/**
 * One piece of a rendered `SCVal`. A `value` token is a single scalar and
 * carries the arm it came from, so the signing screen can offer its type
 * without spelling that type out inline; `punct` is the structure around it.
 *
 * Both the string form and the React form are built from this one stream, so
 * what is copied and what is shown cannot drift apart.
 */
export type DisplayToken =
  | { kind: "value"; text: string; scValType: string }
  | { kind: "punct"; text: string };

const punct = (text: string): DisplayToken => ({ kind: "punct", text });

const value = (text: string, scValType: string): DisplayToken => ({
  kind: "value",
  text,
  scValType,
});

type DisplayOpts = { depth?: number; compact?: boolean };

/**
 * Wraps already-rendered lines in `{ }` or `[ ]`, one signed entry per line
 * unless `compact`.
 */
const joinLines = (
  lines: DisplayToken[][],
  open: string,
  close: string,
  {
    depth,
    compact,
    compactPad,
  }: {
    depth: number;
    compact: boolean;
    compactPad: string;
  },
): DisplayToken[] => {
  const pad = DISPLAY_INDENT.repeat(depth);
  const innerPad = DISPLAY_INDENT.repeat(depth + 1);
  const opened = compact
    ? punct(`${open}${compactPad}`)
    : punct(`${open}\n${innerPad}`);
  const separator = compact ? punct(", ") : punct(`,\n${innerPad}`);
  const closed = compact
    ? punct(`${compactPad}${close}`)
    : punct(`\n${pad}${close}`);

  const tokens: DisplayToken[] = [opened];
  lines.forEach((line, index) => {
    if (index) {
      tokens.push(separator);
    }
    tokens.push(...line);
  });
  tokens.push(closed);
  return tokens;
};

/** Renders the `SCMap` entry list shared by `SCV_MAP` and instance storage. */
const mapEntriesToTokens = (
  entries: xdr.ScMapEntry[] | null,
  { depth = 0, compact = false }: DisplayOpts,
): DisplayToken[] => {
  if (!entries || !entries.length) {
    return [punct("{}")];
  }
  const lines = entries.map((entry) => [
    // Keys render compact so that one signed entry is always exactly one line.
    ...scValToDisplayTokens(entry.key, { compact: true }),
    punct(": "),
    ...scValToDisplayTokens(entry.val, { depth: depth + 1, compact }),
  ]);
  return joinLines(lines, "{", "}", { depth, compact, compactPad: " " });
};

/**
 * Renders a `ContractExecutable`, arms with a payload included.
 *
 * Naming the arm alone drops the CAP-85 external reference's owner and tag —
 * the two fields that say whose code is about to run — which is exactly what
 * the signer is being asked to approve.
 */
const executableToTokens = (
  executable: xdr.ContractExecutable,
  { depth = 0, compact = false }: DisplayOpts,
): DisplayToken[] => {
  switch (executable.type) {
    case "contractExecutableWasm": {
      const wasmHash = xdr.encodeBytes(executable.wasmHash.toBytes(), "hex");
      return [
        punct("wasm("),
        value(`0x${wasmHash}`, executable.type),
        punct(")"),
      ];
    }

    case "contractExecutableExternalRef": {
      const ref = executable.externalRef;
      const lines = [
        [
          punct("owner: "),
          value(scvAddressToString(ref.executableOwner), executable.type),
        ],
        [punct("tag: "), value(xdrStringToDisplay(ref.tag), executable.type)],
      ];
      return [
        punct("externalRef "),
        ...joinLines(lines, "{", "}", { depth, compact, compactPad: " " }),
      ];
    }

    default: {
      return [value(executable.type, executable.type)];
    }
  }
};

/**
 * Renders an `SCVal` as a stream of display tokens.
 *
 * Deliberately does *not* route containers through `scValToNative()`. That
 * decoder builds maps with `Object.fromEntries`, which coerces every key
 * through `ToPropertyKey` and lets a later entry overwrite an earlier one, so
 * an SCMap with N signed entries can render as one — silently, with no glyph
 * and no warning, on the screen the user approves from. Here the map arm walks
 * the signed entry list directly, so every signed entry reaches the screen.
 *
 * Quoting carries some of the type: strings are quoted where symbols and
 * numbers are bare. The rest of it rides on each `value` token's `scValType`
 * rather than being spelled out inline, which keeps the common case — a
 * symbol-keyed struct — readable.
 */
export const scValToDisplayTokens = (
  scVal: xdr.ScVal,
  { depth = 0, compact = false }: DisplayOpts = {},
): DisplayToken[] => {
  switch (scVal.type) {
    case "scvMap": {
      return mapEntriesToTokens(scVal.map, { depth, compact });
    }

    case "scvVec": {
      const values = scVal.vec || [];
      if (!values.length) {
        return [punct("[]")];
      }
      const lines = values.map((entry) =>
        scValToDisplayTokens(entry, { depth: depth + 1, compact }),
      );
      return joinLines(lines, "[", "]", { depth, compact, compactPad: "" });
    }

    case "scvString": {
      return [value(xdrStringToLiteral(scVal.str, "string"), scVal.type)];
    }

    case "scvSymbol": {
      return [value(xdrStringToLiteral(scVal.sym, "symbol"), scVal.type)];
    }

    case "scvExecutableTag": {
      return [value(xdrStringToDisplay(scVal.executableTag), scVal.type)];
    }

    case "scvBytes": {
      const bytes = xdr.encodeBytes(scVal.bytes.toBytes(), "hex");
      return [value(`0x${bytes}`, scVal.type)];
    }

    case "scvAddress": {
      return [value(scvAddressToString(scVal.address), scVal.type)];
    }

    case "scvBool": {
      return [value(`${scVal.b}`, scVal.type)];
    }

    case "scvLedgerKeyNonce": {
      return [value(scVal.nonceKey.nonce.toString(), scVal.type)];
    }

    case "scvContractInstance": {
      const { executable, storage } = scVal.instance;
      const lines = [
        [
          punct("executable: "),
          ...executableToTokens(executable, { depth: depth + 1, compact }),
        ],
      ];

      // `storage` is an optional pointer, so no storage and empty storage are
      // two different signed values. Two instances sharing an executable are
      // told apart by this map alone, so it has to reach the screen.
      if (storage) {
        lines.push([
          punct("storage: "),
          ...mapEntriesToTokens(storage, { depth: depth + 1, compact }),
        ]);
      }

      return [
        punct("contractInstance "),
        ...joinLines(lines, "{", "}", { depth, compact, compactPad: " " }),
      ];
    }

    case "scvError": {
      const error = scValToNative(scVal) as {
        type: string;
        code: number;
        value?: string;
      };
      return [
        value(`error(${error.type}:${error.value ?? error.code})`, scVal.type),
      ];
    }

    case "scvTimepoint":
    case "scvDuration":
    case "scvI128":
    case "scvI256":
    case "scvI32":
    case "scvI64":
    case "scvU128":
    case "scvU256":
    case "scvU32":
    case "scvU64": {
      return [value(scValToNative(scVal).toString(), scVal.type)];
    }

    case "scvVoid": {
      return [value("void", scVal.type)];
    }

    case "scvLedgerKeyContractInstance": {
      return [value("ledgerKeyContractInstance", scVal.type)];
    }

    default: {
      return [value("null", (scVal as xdr.ScVal).type)];
    }
  }
};

/**
 * The string form of {@link scValToDisplayTokens}, used wherever the value has
 * to be plain text — the clipboard, most obviously.
 */
export const scValToDisplayValue = (
  scVal: xdr.ScVal,
  opts: DisplayOpts = {},
): string =>
  scValToDisplayTokens(scVal, opts)
    .map((token) => token.text)
    .join("");

export const scValByType = (scVal: xdr.ScVal): string => {
  switch (scVal.type) {
    case "scvAddress": {
      return scvAddressToString(scVal.address);
    }

    case "scvBool": {
      return `${scVal.b}`;
    }

    case "scvBytes": {
      return xdr.encodeBytes(scVal.bytes.toBytes(), "hex");
    }

    case "scvContractInstance": {
      // A non-wasm arm used to return `undefined`, i.e. an empty row; naming
      // the arm alone still dropped the storage map and the external
      // reference's owner and tag.
      return scValToDisplayValue(scVal);
    }

    case "scvError": {
      return `${scVal.error.value}`;
    }

    case "scvExecutableTag": {
      return xdrStringToDisplay(scVal.executableTag);
    }

    case "scvTimepoint":
    case "scvDuration":
    case "scvI128":
    case "scvI256":
    case "scvI32":
    case "scvI64":
    case "scvU128":
    case "scvU256":
    case "scvU32":
    case "scvU64": {
      return scValToNative(scVal).toString();
    }

    case "scvLedgerKeyNonce": {
      return scVal.nonceKey.nonce.toString();
    }

    case "scvLedgerKeyContractInstance": {
      return "ledgerKeyContractInstance";
    }

    case "scvVec":
    case "scvMap": {
      return scValToDisplayValue(scVal);
    }

    case "scvString": {
      return xdrStringToDisplay(scVal.str);
    }

    case "scvSymbol": {
      return xdrStringToDisplay(scVal.sym);
    }

    case "scvVoid": {
      return "void";
    }

    // Exhaustive today; a future arm should still name itself rather than
    // reach the signing screen as an empty row.
    default:
      return (scVal as xdr.ScVal).type;
  }
};

/**
 * Extracts the Soroban authorization payload struct from a HashIdPreimage a
 * dApp has asked us to sign. Both arms expose `networkId()` and
 * `invocation()`; the CAP-71 (protocol 27) address-bound arm
 * (ENVELOPE_TYPE_SOROBAN_AUTHORIZATION_WITH_ADDRESS) additionally exposes
 * `address()` — narrow with
 * `instanceof xdr.HashIdPreimageSorobanAuthorizationWithAddress`.
 *
 * @throws if the preimage is not a Soroban authorization envelope
 */
export function parseAuthEntryPreimage(
  preimage: xdr.HashIdPreimage,
):
  | xdr.HashIdPreimageSorobanAuthorization
  | xdr.HashIdPreimageSorobanAuthorizationWithAddress {
  switch (preimage.type) {
    case "envelopeTypeSorobanAuthorization":
      return preimage.sorobanAuthorization;

    // CAP-71 (protocol 27): same payload plus the SCAddress the signature
    // is bound to
    case "envelopeTypeSorobanAuthorizationWithAddress":
      return preimage.sorobanAuthorizationWithAddress;

    default:
      throw new Error(
        `unsupported authorization envelope type: ${preimage.type}`,
      );
  }
}

/**
 * Extracts the address credentials carried by any address-based Soroban
 * credential, regardless of which credential type variant is used.
 *
 * This unifies access across SOROBAN_CREDENTIALS_ADDRESS,
 * SOROBAN_CREDENTIALS_ADDRESS_V2 and
 * SOROBAN_CREDENTIALS_ADDRESS_WITH_DELEGATES (CAP-71 / protocol 27).
 *
 * Mirror of the SDK-internal helper of the same name (js-stellar-sdk
 * src/base/auth.ts) — delete this in favor of the upstream export if it is
 * ever made public.
 *
 * @returns the inner address credentials, or null for source-account
 *    credentials (which carry no address payload)
 */
export function getAddressCredentials(
  credentials: xdr.SorobanCredentials,
): xdr.SorobanAddressCredentials | null {
  switch (credentials.type) {
    case "sorobanCredentialsAddress":
      return credentials.address;
    case "sorobanCredentialsAddressV2":
      return credentials.addressV2;
    case "sorobanCredentialsAddressWithDelegates":
      return credentials.addressWithDelegates.addressCredentials;
    default:
      return null;
  }
}

/**
 * Returns the address whose authorization a SorobanAuthorizationEntry's
 * credentials represent (as a display string), or undefined for
 * source-account credentials.
 */
export function getAuthEntryBoundAddress(
  entry: xdr.SorobanAuthorizationEntry,
): string | undefined {
  const addressCredentials = getAddressCredentials(entry.credentials);
  return addressCredentials
    ? Address.fromScAddress(addressCredentials.address).toString()
    : undefined;
}

export function getInvocationDetails(
  invocation: xdr.SorobanAuthorizedInvocation,
) {
  const invocations = [] as InvocationArgs[];

  walkInvocationTree(invocation, (inv) => {
    try {
      const args = getInvocationArgs(inv);
      if (args) {
        invocations.push(args);
      }
    } catch (error) {
      // An invocation we cannot decode must not take down the whole signing
      // view -- surface it so the user sees that something was unreadable.
      captureException(error);
      invocations.push({ type: "unrecognized" });
    }

    return null;
  });

  return invocations.filter(isInvocationArg);
}

export interface FnArgsInvoke {
  type: "invoke";
  fnName: string;
  contractId: string;
  args: xdr.ScVal[];
}

export interface FnArgsCreateWasm {
  type: "wasm";
  salt: string;
  hash: string;
  address: string;
  args?: xdr.ScVal[];
}

export interface FnArgsCreateSac {
  type: "sac";
  asset: string;
  args?: xdr.ScVal[];
}

/**
 * A CAP-85 (protocol 28) contract creation whose executable is a reference
 * into another contract's storage rather than a wasm hash. `owner` and `tag`
 * identify the reference; the code behind it is chosen by the owner at
 * invocation time and can change after this entry is signed, so there is
 * deliberately no wasm hash here.
 */
export interface FnArgsCreateExternalRef {
  type: "externalRef";
  owner: string;
  tag: string;
  address?: string;
  salt?: string;
  args?: xdr.ScVal[];
}

/** An invocation whose contents we could not decode. */
export interface FnArgsUnrecognized {
  type: "unrecognized";
}

export type InvocationArgs =
  | FnArgsInvoke
  | FnArgsCreateWasm
  | FnArgsCreateSac
  | FnArgsCreateExternalRef
  | FnArgsUnrecognized;

const isInvocationArg = (
  invocation: InvocationArgs | undefined,
): invocation is InvocationArgs => !!invocation;

export function getInvocationArgs(
  invocation: xdr.SorobanAuthorizedInvocation,
): InvocationArgs | undefined {
  const fn = invocation.function;

  switch (fn.type) {
    case "sorobanAuthorizedFunctionTypeContractFn": {
      const _invocation = fn.contractFn;
      const contractId = addressToString(_invocation.contractAddress);
      const fnName = xdrStringToDisplay(_invocation.functionName);
      const args = _invocation.args;
      return { fnName, contractId, args, type: "invoke" };
    }

    case "sorobanAuthorizedFunctionTypeCreateContractHostFn":
    case "sorobanAuthorizedFunctionTypeCreateContractV2HostFn": {
      const isCreateV2 =
        fn.type === "sorobanAuthorizedFunctionTypeCreateContractV2HostFn";
      const _invocation: xdr.CreateContractArgs | xdr.CreateContractArgsV2 =
        fn.type === "sorobanAuthorizedFunctionTypeCreateContractV2HostFn"
          ? fn.createContractV2HostFn
          : fn.createContractHostFn;
      const exec = _invocation.executable;
      const preimage = _invocation.contractIdPreimage;

      switch (exec.type) {
        case "contractExecutableWasm": {
          // A wasm executable must be paired with an address preimage: the
          // contract id is derived from deployer + salt. The two arms are
          // independent in XDR, so the invalid pairings are representable.
          if (preimage.type !== "contractIdPreimageFromAddress") {
            throw new Error(
              `creation function appears invalid: a wasm executable is paired with ${preimage.type} (should be wasm+address or token+asset)`,
            );
          }
          const details = preimage.fromAddress;

          const contractDetails = {
            type: "wasm",
            salt: xdr.encodeBytes(details.salt.toBytes(), "hex"),
            hash: xdr.encodeBytes(exec.wasmHash.toBytes(), "hex"),
            address: Address.fromScAddress(details.address).toString(),
          } as FnArgsCreateWasm;

          if (isCreateV2) {
            contractDetails.args = (
              _invocation as xdr.CreateContractArgsV2
            ).constructorArgs;
          }

          return contractDetails;
        }

        case "contractExecutableStellarAsset": {
          // A SAC is only ever derived from the asset it wraps.
          if (preimage.type !== "contractIdPreimageFromAsset") {
            throw new Error(
              `creation function appears invalid: a Stellar asset executable is paired with ${preimage.type} (should be wasm+address or token+asset)`,
            );
          }
          const sacDetails = {
            type: "sac",
            asset: Asset.fromOperation(preimage.fromAsset).toString(),
          } as FnArgsCreateSac;

          if (isCreateV2) {
            sacDetails.args = (
              _invocation as xdr.CreateContractArgsV2
            ).constructorArgs;
          }

          return sacDetails;
        }

        case "contractExecutableExternalRef": {
          const { executableOwner, tag } = exec.externalRef;
          const refDetails = {
            type: "externalRef",
            owner: Address.fromScAddress(executableOwner).toString(),
            tag: xdrStringToDisplay(tag),
          } as FnArgsCreateExternalRef;

          // An external-ref executable derives its contract ID from a deployer
          // address and salt, so an asset preimage is invalid.
          if (preimage.type !== "contractIdPreimageFromAddress") {
            throw new Error(
              `creation function appears invalid: an external-ref executable is paired with ${preimage.type} (should be external-ref+address)`,
            );
          }
          const details = preimage.fromAddress;
          refDetails.address = Address.fromScAddress(
            details.address,
          ).toString();
          refDetails.salt = xdr.encodeBytes(details.salt.toBytes(), "hex");

          if (isCreateV2) {
            refDetails.args = (
              _invocation as xdr.CreateContractArgsV2
            ).constructorArgs;
          }

          return refDetails;
        }

        default:
          throw new Error(`unknown creation type: ${JSON.stringify(exec)}`);
      }
    }

    default: {
      return undefined;
    }
  }
}

export const getCreateContractArgs = (hostFn: xdr.HostFunction) => {
  if (hostFn.type !== "hostFunctionTypeCreateContractV2") {
    // Pre-v17 the generated `createContract()` arm accessor threw for any
    // other host function type; keep that contract.
    const args = xdr.expectUnionVariant(
      hostFn,
      "hostFunctionTypeCreateContract",
    ).createContract;
    return {
      contractIdPreimage: args.contractIdPreimage,
      executable: args.executable,
    };
  }
  const argsV2 = hostFn.createContractV2;
  return {
    contractIdPreimage: argsV2.contractIdPreimage,
    executable: argsV2.executable,
    constructorArgs: argsV2.constructorArgs,
  };
};

/**
 * The slice of a `Spec.jsonSchema()` payload the wallet actually reads. These
 * describe the `/contract-spec` response rather than validate it: the payload
 * is author-controlled JSON, so every field is optional and the runtime guards
 * below stay responsible for rejecting a shape that only looks right.
 */
export interface ContractFnArgsSchema {
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface ContractFnDefinition {
  properties?: { args?: ContractFnArgsSchema };
}

export interface ContractSpecSchema {
  definitions?: Record<string, ContractFnDefinition | undefined>;
}

// V8 hoists integer-like keys to the front of `Object.keys` and sorts them
// numerically, so their presence alone means the key order is not insertion
// order. No Rust identifier looks like this, but the spec section is
// author-controlled metadata and can hold any string.
const INTEGER_LIKE_KEY = /^(0|[1-9]\d*)$/;

/**
 * Argument names for a contract function, in declaration order, or `null` when
 * the spec does not describe the invocation we were handed.
 *
 * The ordered parameter list is `properties.args.properties`, never `required`:
 * `Spec.jsonSchema()` follows JSON Schema semantics, so an `Option<T>`
 * parameter is left out of `required` and every name after it would attach to
 * the wrong value.
 *
 * Reading the parameter list off object keys is sound here because nothing in
 * the path reorders them: `Spec.jsonSchema()` fills `properties` from a single
 * pass over the function's inputs, and `JSON.stringify` and `JSON.parse` both
 * preserve insertion order for keys that are not integer-like. The two guards
 * below cover the cases where that breaks down — an arity mismatch, and keys
 * `Object.keys` would reorder. A re-serializer that sorted the keys is not
 * detectable from this payload; the followup is for `/contract-spec` to return
 * an explicit ordered array derived from `inputs()`, so order is carried rather
 * than inferred.
 *
 * These names come from author-controlled wasm metadata, so they are advisory
 * either way — the signing view says as much beside them.
 */
export const getContractFnArgNames = (
  spec: ContractSpecSchema | undefined,
  fnName: string,
  argCount: number,
): string[] | null => {
  const names = Object.keys(
    spec?.definitions?.[fnName]?.properties?.args?.properties || {},
  );

  if (names.length !== argCount) {
    return null;
  }

  if (names.some((name) => INTEGER_LIKE_KEY.test(name))) {
    return null;
  }

  return names;
};

export const isSacContract = (
  name: string,
  contractId: string,
  networkPassphrase: string,
) => {
  const Sdk = getSdk(networkPassphrase);
  if (name.includes(":")) {
    try {
      return (
        new Sdk.Asset(
          splitCanonical(name).code,
          splitCanonical(name).issuer,
        ).contractId(networkPassphrase) === contractId
      );
    } catch (error) {
      return false;
    }
  }

  return false;
};

/**
 * Determines if an asset is a Stellar Asset Contract (SAC).
 * SAC assets include:
 * 1. The native XLM contract
 * 2. Classic Stellar assets that have been wrapped as Soroban contracts
 *
 * @param asset - Asset details
 * @param networkDetails - Network configuration details
 * @returns true if the asset is a SAC, false otherwise
 */
export const isAssetSac = ({
  asset,
  networkDetails,
}: {
  asset: {
    code: string;
    issuer: string | undefined;
    contract: string | undefined;
  };
  networkDetails: NetworkDetails;
}): boolean => {
  if (!asset.contract) {
    return false;
  }

  // Check if it's the native contract
  if (isNativeContract(asset.contract, networkDetails.networkPassphrase)) {
    return true;
  }

  // Check if it's a classic asset wrapper (SAC)
  const canonicalName = getCanonicalFromAsset(asset.code, asset.issuer);
  return isSacContract(
    canonicalName,
    asset.contract,
    networkDetails.networkPassphrase,
  );
};
