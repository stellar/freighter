import {
  Address,
  scValToBigInt,
  xdr,
  ScInt,
  SorobanRpc,
  contract,
} from "stellar-sdk";
import { XdrReader } from "@stellar/js-xdr";

export const accountIdentifier = (account: string) =>
  new Address(account).toScVal();

export const valueToI128String = (value: xdr.ScVal) =>
  scValToBigInt(value).toString();

// How do we decode these in a more generic way?
export const decodei128 = (b64: string) => {
  const value = xdr.ScVal.fromXDR(b64, "base64");
  try {
    return valueToI128String(value);
  } catch (error) {
    console.error(error);
    return 0;
  }
};

export const decodeStr = (b64: string) =>
  xdr.ScVal.fromXDR(b64, "base64").str().toString();

export const decodeU32 = (b64: string) =>
  xdr.ScVal.fromXDR(b64, "base64").u32();

export const numberToI128 = (value: number): xdr.ScVal =>
  new ScInt(value).toI128();

export const getLedgerKeyContractCode = (contractId: string) => {
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
  return ledgerKey.toXDR("base64");
};

export const getLedgerEntries = async (
  entryKey: string,
  rpcUrl: string,
  id: number = new Date().getDate(),
): Promise<{
  error: Error;
  result: SorobanRpc.Api.RawGetLedgerEntriesResponse;
}> => {
  let requestBody = {
    jsonrpc: "2.0",
    id: id,
    method: "getLedgerEntries",
    params: {
      keys: [entryKey],
    },
  };

  let res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  let json = await res.json();
  if (!res.ok) {
    throw new Error(json);
  }
  return json;
};

export const getLedgerKeyWasmId = (contractLedgerEntryData: string) => {
  const contractCodeWasmHash = xdr.LedgerEntryData.fromXDR(
    contractLedgerEntryData,
    "base64",
  )
    .contractData()
    .val()
    .instance()
    .executable()
    .wasmHash();
  const ledgerKey = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: contractCodeWasmHash,
    }),
  );
  return ledgerKey.toXDR("base64");
};

export const parseWasmXdr = async (xdrContents: string) => {
  const wasmBuffer = xdr.LedgerEntryData.fromXDR(xdrContents, "base64")
    .contractCode()
    .code();
  const wasmModule = await WebAssembly.compile(wasmBuffer);
  const reader = new XdrReader(
    Buffer.from(
      WebAssembly.Module.customSections(wasmModule, "contractspecv0")[0],
    ),
  );

  const specs = [];
  do {
    specs.push(xdr.ScSpecEntry.read(reader));
  } while (!reader.eof);
  const contractSpec = new contract.Spec(specs);
  return contractSpec.jsonSchema();
};

export const getContractSpec = async (
  contractId: string,
  serverUrl: string,
) => {
  const contractDataKey = getLedgerKeyContractCode(contractId);
  const { error, result } = await getLedgerEntries(contractDataKey, serverUrl);
  const entries = result.entries || [];
  if (error || !entries.length) {
    throw new Error("Unable to fetch contract spec");
  }

  const contractCodeLedgerEntryData = entries[0].xdr;
  const wasmId = getLedgerKeyWasmId(contractCodeLedgerEntryData);
  const { error: wasmError, result: wasmResult } = await getLedgerEntries(
    wasmId,
    serverUrl,
  );
  const wasmEntries = wasmResult.entries || [];
  if (wasmError || !wasmEntries.length) {
    throw new Error("Unable to fetch contract spec");
  }

  const spec = await parseWasmXdr(wasmEntries[0].xdr);
  return spec;
};
