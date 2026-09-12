import {
  Address,
  MuxedAccount,
  StrKey,
  nativeToScVal,
  scValToNative,
  xdr,
} from "stellar-sdk";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  createSoranReader,
  decodeUtf8,
  fields,
  normalizeSoranName,
  variant,
  verifySoranDeployment,
  SORAN_TESTNET_LOOKUP,
} from "./soran";

export type SoranPrimaryResult =
  | { status: "name"; name: string; ledger: number; timestamp: string }
  | { status: "none"; ledger: number; timestamp: string }
  | { status: "failed"; code?: number };

export const encodeSoranIdentity = (address: string): xdr.ScVal => {
  if (StrKey.isValidMed25519PublicKey(address)) {
    const muxed = MuxedAccount.fromAddress(address, "0");
    return nativeToScVal([
      nativeToScVal("Muxed", { type: "symbol" }),
      nativeToScVal(
        {
          account: new Address(muxed.baseAccount().accountId()).toScVal(),
          id: nativeToScVal(BigInt(muxed.id()), { type: "u64" }),
        },
        { type: { account: ["symbol", null], id: ["symbol", null] } },
      ),
    ]);
  }
  if (
    !StrKey.isValidEd25519PublicKey(address) &&
    !StrKey.isValidContract(address)
  ) {
    throw new Error("Invalid Soran identity");
  }
  return nativeToScVal([
    nativeToScVal("Direct", { type: "symbol" }),
    new Address(address).toScVal(),
  ]);
};

export const decodeSoranPrimaryBatch = (
  value: xdr.ScVal,
  count: number,
): SoranPrimaryResult[] => {
  const batch = fields(value, ["ledger", "results", "timestamp"]);
  if (
    batch.ledger.type !== "scvU32" ||
    batch.timestamp.type !== "scvU64" ||
    batch.results.type !== "scvVec" ||
    !batch.results.value ||
    batch.results.value.length !== count
  ) {
    throw new Error("Invalid Soran batch ABI");
  }
  const observation = {
    ledger: Number(scValToNative(batch.ledger)),
    timestamp: String(scValToNative(batch.timestamp)),
  };
  return batch.results.value.map((value) => {
    const [tag, args] = variant(value);
    if (tag === "None" && args.length === 0)
      return { status: "none", ...observation };
    if (
      tag === "Failed" &&
      args.length === 1 &&
      args[0].type === "scvU32" &&
      scValToNative(args[0]) > 0
    ) {
      return { status: "failed", code: Number(scValToNative(args[0])) };
    }
    if (tag === "Name" && args.length === 1 && args[0].type === "scvString") {
      const name = decodeUtf8(args[0].str.bytes);
      if (normalizeSoranName(name) === name)
        return { status: "name", name, ...observation };
    }
    throw new Error("Invalid Soran primary name ABI");
  });
};

export const readSoranPrimaryNames = async (
  addresses: string[],
  network: NetworkDetails,
): Promise<SoranPrimaryResult[]> => {
  if (!addresses.length) return [];
  const view = createSoranReader(network);
  await verifySoranDeployment(view);
  const [version, limitValue, muxedVersion] = await Promise.all([
    view("batch_read_version"),
    view("primary_batch_limit"),
    addresses.some((address) => StrKey.isValidMed25519PublicKey(address))
      ? view("muxed_identity_version")
      : undefined,
  ]);
  const limit = Number(scValToNative(limitValue));
  if (
    version.type !== "scvU32" ||
    scValToNative(version) !== 3 ||
    limitValue.type !== "scvU32" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 16 ||
    (muxedVersion &&
      (muxedVersion.type !== "scvU32" || scValToNative(muxedVersion) !== 1))
  ) {
    throw new Error("Unsupported Soran batch capability");
  }
  const readBatch = async (batch: string[]): Promise<SoranPrimaryResult[]> => {
    try {
      const result = await view("primary_names", [
        nativeToScVal(batch.map(encodeSoranIdentity)),
      ]);
      return decodeSoranPrimaryBatch(result, batch.length);
    } catch (error) {
      // Only a leading host budget error permits subdivision. Contract/item,
      // transport, restoration and decoding errors remain failures.
      if (
        batch.length > 1 &&
        error instanceof Error &&
        /^HostError: Error\(Budget, ExceededLimit\)/.test(error.message)
      ) {
        const midpoint = Math.ceil(batch.length / 2);
        return [
          ...(await readBatch(batch.slice(0, midpoint))),
          ...(await readBatch(batch.slice(midpoint))),
        ];
      }
      return batch.map(() => ({ status: "failed" }));
    }
  };
  const result: SoranPrimaryResult[] = [];
  for (let offset = 0; offset < addresses.length; offset += limit) {
    result.push(...(await readBatch(addresses.slice(offset, offset + limit))));
  }
  return result;
};

// Coalesce rows rendered together, retain full M identities, and bound memory.
// Failed reads have a short retry delay; they are never cached as "no name".
const cache = new Map<
  string,
  { expires: number; value: Promise<SoranPrimaryResult> }
>();
const pending = new Map<
  string,
  {
    network: NetworkDetails;
    rows: Map<string, Array<(result: SoranPrimaryResult) => void>>;
  }
>();
const CACHE_LIMIT = 512;
const CACHE_TTL_MS = 60_000;
const FAILURE_TTL_MS = 5_000;
export const getSoranPrimaryName = (
  address: string,
  network: NetworkDetails,
): Promise<SoranPrimaryResult> => {
  try {
    encodeSoranIdentity(address);
  } catch {
    return Promise.resolve({ status: "failed" });
  }
  const groupKey = JSON.stringify([
    network.networkPassphrase,
    network.sorobanRpcUrl,
    SORAN_TESTNET_LOOKUP,
  ]);
  const key = JSON.stringify([groupKey, address]);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = new Promise<SoranPrimaryResult>((resolve) => {
    let group = pending.get(groupKey);
    if (!group) {
      group = { network, rows: new Map() };
      pending.set(groupKey, group);
      setTimeout(async () => {
        const current = pending.get(groupKey)!;
        pending.delete(groupKey);
        const addresses = [...current.rows.keys()];
        let results: SoranPrimaryResult[];
        try {
          results = await readSoranPrimaryNames(addresses, current.network);
        } catch {
          results = addresses.map(() => ({ status: "failed" }));
        }
        addresses.forEach((identity, index) =>
          current.rows
            .get(identity)!
            .forEach((resolve) => resolve(results[index])),
        );
      }, 20);
    }
    const resolvers = group.rows.get(address) || [];
    resolvers.push(resolve);
    group.rows.set(address, resolvers);
  });
  cache.delete(key);
  cache.set(key, { expires: Infinity, value });
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  void value.then((result) => {
    const entry = cache.get(key);
    if (entry?.value === value)
      entry.expires =
        Date.now() +
        (result.status === "failed" ? FAILURE_TTL_MS : CACHE_TTL_MS);
  });
  return value;
};
