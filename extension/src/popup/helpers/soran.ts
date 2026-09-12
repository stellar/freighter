import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  MuxedAccount,
  Networks,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import { FederationMemoType } from "./federationMemo";
import i18n from "./localizationConfig";

// https://docs.soran.domains/api/onchain-resolution
export const SORAN_TESTNET_LOOKUP =
  "CDSORANQAJK35UV2HR63CMB6M5NYISHMUBTB6EQY2CZ3Y7HJDIOHRJWA";
const SORAN_TESTNET_REGISTRY =
  "CCSORANDPQINYOYB5SVO45WJP2LBBYKC72HHUIRVXB4J6RUZKDAUW7G4";
const READ_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const RPC_TIMEOUT_MS = 20_000;
const READ_TIMEOUT_SECONDS = 30;
const DESTINATION_ABI = 2;
const MAX_MEMO_BYTES = 28;
const HASH_BYTES = 32;
const NAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export interface SoranDestination {
  address: string;
  memo: string;
  memoType: FederationMemoType | "";
}

export const normalizeSoranName = (input: string): string | null => {
  const trimmed = input.trim();
  if (/[^\x20-\x7e]/.test(trimmed)) return null;
  const name = trimmed.toLowerCase();
  const labels = name.split(".");
  return labels.length === 2 && labels.every((label) => NAME_LABEL.test(label))
    ? name
    : null;
};

export const isSoranName = (input: string) =>
  normalizeSoranName(input) !== null;

const invalidDestination = () => new Error("Invalid Soran destination ABI");
export const decodeUtf8 = (bytes: Uint8Array) =>
  new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);

const symbol = (value: xdr.ScVal): string => {
  if (value.type !== "scvSymbol") throw invalidDestination();
  return decodeUtf8(value.sym.bytes);
};

export const variant = (value: xdr.ScVal): [string, xdr.ScVal[]] => {
  if (value.type !== "scvVec" || !value.value?.length) {
    throw invalidDestination();
  }
  return [symbol(value.value[0]), value.value.slice(1)];
};

export const fields = (value: xdr.ScVal, expected: string[]) => {
  if (value.type !== "scvMap" || !value.value) throw invalidDestination();
  const entries = value.value;
  if (
    entries.length !== expected.length ||
    entries.some((entry, index) => symbol(entry.key) !== expected[index])
  ) {
    throw invalidDestination();
  }
  return Object.fromEntries(
    entries.map((entry) => [symbol(entry.key), entry.val]),
  );
};

const decodeAddress = (value: xdr.ScVal, classicOnly = false) => {
  if (value.type !== "scvAddress") throw invalidDestination();
  const address = Address.fromScVal(value).toString();
  if (
    !StrKey.isValidEd25519PublicKey(address) &&
    (classicOnly || !StrKey.isValidContract(address))
  ) {
    throw invalidDestination();
  }
  return address;
};

export const decodeSoranDestination = (value: xdr.ScVal): SoranDestination => {
  const [tag, args] = variant(value);
  if (args.length !== 1) throw invalidDestination();
  if (tag === "Muxed") {
    const payment = fields(args[0], ["account", "id"]);
    const account = decodeAddress(payment.account, true);
    if (payment.id.type !== "scvU64") throw invalidDestination();
    return {
      address: new MuxedAccount(
        new Account(account, "0"),
        String(scValToNative(payment.id)),
      ).accountId(),
      memo: "",
      memoType: "",
    };
  }
  if (tag !== "Direct") throw invalidDestination();
  const payment = fields(args[0], ["address", "memo"]);
  const address = decodeAddress(payment.address);
  const [memoTag, memoArgs] = variant(payment.memo);
  if (memoTag === "None" && memoArgs.length === 0) {
    return { address, memo: "", memoType: "" };
  }
  if (!StrKey.isValidEd25519PublicKey(address) || memoArgs.length !== 1) {
    throw invalidDestination();
  }
  const memo = memoArgs[0];
  if (memoTag === "Id" && memo.type === "scvU64") {
    return {
      address,
      memo: String(scValToNative(memo)),
      memoType: FederationMemoType.Id,
    };
  }
  if (memoTag === "Text" && memo.type === "scvString") {
    if (!memo.str.bytes.length || memo.str.bytes.length > MAX_MEMO_BYTES) {
      throw invalidDestination();
    }
    return {
      address,
      memo: decodeUtf8(memo.str.bytes),
      memoType: FederationMemoType.Text,
    };
  }
  if (
    memoTag === "Hash" &&
    memo.type === "scvBytes" &&
    memo.value.value.length === HASH_BYTES
  ) {
    return {
      address,
      memo: Buffer.from(memo.value.value).toString("base64"),
      memoType: FederationMemoType.Hash,
    };
  }
  throw invalidDestination();
};

// Unsigned simulations only. Never submit or restore state from a display lookup.
export const createSoranReader = (networkDetails: NetworkDetails) => {
  if (
    networkDetails.networkPassphrase !== Networks.TESTNET ||
    !networkDetails.sorobanRpcUrl
  ) {
    throw new Error("Unsupported Soran network");
  }
  const server = new rpc.Server(networkDetails.sorobanRpcUrl);
  // SDK v17 reads transport timeouts from the HTTP client, in milliseconds.
  server.httpClient.defaults.timeout = RPC_TIMEOUT_MS;
  return async (method: string, args: xdr.ScVal[] = []) => {
    const tx = new TransactionBuilder(new Account(READ_SOURCE, "0"), {
      fee: BASE_FEE,
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(new Contract(SORAN_TESTNET_LOOKUP).call(method, ...args))
      .setTimeout(READ_TIMEOUT_SECONDS)
      .build();
    const result = await server.simulateTransaction(
      tx,
      undefined,
      undefined,
      false,
    );
    if (
      rpc.Api.isSimulationRestore(result) ||
      !rpc.Api.isSimulationSuccess(result) ||
      !result.result
    ) {
      throw new Error(
        rpc.Api.isSimulationError(result)
          ? result.error
          : "Soran contract read unavailable",
      );
    }
    return result.result.retval;
  };
};

export const verifySoranDeployment = async (
  view: ReturnType<typeof createSoranReader>,
) => {
  const [registry, version] = await Promise.all([
    view("registry"),
    view("version"),
  ]);
  if (
    decodeAddress(registry) !== SORAN_TESTNET_REGISTRY ||
    version.type !== "scvU32" ||
    scValToNative(version) !== 2
  ) {
    throw new Error("Unsupported Soran deployment");
  }
};

export const resolveSoranName = async (
  input: string,
  networkDetails: NetworkDetails,
): Promise<SoranDestination & { name: string }> => {
  const name = normalizeSoranName(input);
  if (!name) throw new Error(i18n.t("Invalid Soran name"));
  if (networkDetails.networkPassphrase !== Networks.TESTNET) {
    throw new Error(i18n.t("Soran names are only available on Testnet"));
  }
  if (!networkDetails.sorobanRpcUrl) {
    throw new Error(i18n.t("Soran lookup requires a Soroban RPC URL"));
  }
  try {
    const view = createSoranReader(networkDetails);
    const [registry, version, destinationVersion] = await Promise.all([
      view("registry"),
      view("version"),
      view("destination_version"),
    ]);
    if (
      decodeAddress(registry) !== SORAN_TESTNET_REGISTRY ||
      version.type !== "scvU32" ||
      scValToNative(version) !== DESTINATION_ABI ||
      destinationVersion.type !== "scvU32" ||
      scValToNative(destinationVersion) !== DESTINATION_ABI
    ) {
      throw new Error("Unsupported Soran deployment");
    }
    const result = await view("resolve_destination", [
      nativeToScVal(name, { type: "string" }),
    ]);
    return { name, ...decodeSoranDestination(result) };
  } catch {
    throw new Error(
      i18n.t("Unable to resolve Soran name. Check the name and try again."),
    );
  }
};

export const verifySoranDestination = async (
  name: string,
  expected: Omit<SoranDestination, "memoType"> & { memoType: string },
  networkDetails: NetworkDetails,
) => {
  const current = await resolveSoranName(name, networkDetails);
  if (
    current.address !== expected.address ||
    current.memo !== expected.memo ||
    current.memoType !== expected.memoType
  ) {
    throw new Error(
      i18n.t("Soran payment details changed. Select the recipient again."),
    );
  }
};
