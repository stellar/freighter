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
import { getSdk } from "@shared/helpers/stellar";
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

  // Check if it's SYMBOL:CONTRACTID format (Soroban token)
  // Split by : and check if the second part is a contract ID
  const parts = tokenId.split(":");
  if (parts.length === 2 && isContractId(parts[1])) {
    // This is a Soroban token in SYMBOL:CONTRACTID format
    return parts[1];
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

  const fnName = invokedContract.functionName.toString();
  const args = invokedContract.args;

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
        function: _inner.functionName.toString(),
        args: _inner.args.map((arg) => scValToNative(arg)),
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

export const scValByType = (scVal: xdr.ScVal) => {
  switch (scVal.type) {
    case "scvAddress": {
      const address = scVal.address;
      if (address.type === "scAddressTypeAccount") {
        return StrKey.encodeEd25519PublicKey(
          address.accountId.ed25519.toBytes(),
        );
      }
      return addressToString(address);
    }

    case "scvBool": {
      return scVal.b;
    }

    case "scvBytes": {
      return xdr.encodeBytes(scVal.bytes.toBytes(), "hex");
    }

    case "scvContractInstance": {
      const executable = scVal.instance.executable;
      return executable.type === "contractExecutableWasm"
        ? xdr.encodeBytes(executable.wasmHash.toBytes(), "hex")
        : undefined;
    }

    case "scvError": {
      return scVal.error.value;
    }

    case "scvExecutableTag": {
      return scVal.executableTag.toString();
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
      // void arm — carries no payload
      return null;
    }

    case "scvVec":
    case "scvMap": {
      return JSON.stringify(
        scValToNative(scVal),
        (_, val) => (typeof val === "bigint" ? val.toString() : val),
        2,
      );
    }

    case "scvString":
    case "scvSymbol": {
      const native = scValToNative(scVal);
      // v17: scValToNative returns Uint8Array (not a lossy string) when the
      // XDR string/symbol payload is not valid UTF-8.
      if (native instanceof Uint8Array) {
        return xdr.encodeBytes(native, "hex");
      }
      return native;
    }

    case "scvVoid": {
      return null;
    }

    default:
      return null;
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
      const fnName = _invocation.functionName.toString();
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
            tag: tag.toString(),
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

export const isSacContract = (
  name: string,
  contractId: string,
  networkPassphrase: string,
) => {
  const Sdk = getSdk(networkPassphrase);
  if (name.includes(":")) {
    try {
      return (
        new Sdk.Asset(...(name.split(":") as [string, string])).contractId(
          networkPassphrase,
        ) === contractId
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
