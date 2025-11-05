import {
  Contract,
  TransactionBuilder,
  Memo,
  rpc as SorobanRpc,
  TimeoutInfinite,
  xdr,
  Networks,
} from "stellar-sdk";
import { buildSorobanServer } from "@shared/helpers/soroban/server";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_URL } from "@shared/constants/mercury";
import { getSdk, isCustomNetwork } from "@shared/helpers/stellar";
import { simulateTx } from "./server";
import { SorobanRpcNotSupportedError } from "../../constants/errors";

export const transfer = (
  contractId: string,
  params: xdr.ScVal[],
  memo: string | undefined,
  builder: TransactionBuilder,
) => {
  const contract = new Contract(contractId);

  const tx = builder
    .addOperation(contract.call("transfer", ...params))
    .setTimeout(TimeoutInfinite);

  if (memo) {
    tx.addMemo(Memo.text(memo));
  }

  return tx.build();
};

export const getBalance = async (
  contractId: string,
  params: xdr.ScVal[],
  server: SorobanRpc.Server,
  builder: TransactionBuilder,
) => {
  const contract = new Contract(contractId);

  const tx = builder
    .addOperation(contract.call("balance", ...params))
    .setTimeout(TimeoutInfinite)
    .build();

  const result = await simulateTx<number>(tx, server);
  return result;
};

export const getDecimals = async (
  contractId: string,
  server: SorobanRpc.Server,
  builder: TransactionBuilder,
) => {
  const contract = new Contract(contractId);

  const tx = builder
    .addOperation(contract.call("decimals"))
    .setTimeout(TimeoutInfinite)
    .build();

  const result = await simulateTx<number>(tx, server);
  return result;
};

export const getName = async (
  contractId: string,
  server: SorobanRpc.Server,
  builder: TransactionBuilder,
) => {
  const contract = new Contract(contractId);

  const tx = builder
    .addOperation(contract.call("name"))
    .setTimeout(TimeoutInfinite)
    .build();

  const result = await simulateTx<string>(tx, server);
  return result;
};

export const getSymbol = async (
  contractId: string,
  server: SorobanRpc.Server,
  builder: TransactionBuilder,
) => {
  const contract = new Contract(contractId);

  const tx = builder
    .addOperation(contract.call("symbol"))
    .setTimeout(TimeoutInfinite)
    .build();

  const result = await simulateTx<string>(tx, server);
  return result;
};

// TODO: move this to TS Wallet SDK Soroban
export const isSacContractExecutable = async (
  contractId: string,
  networkDetails: NetworkDetails,
  signal?: AbortSignal,
) => {
  if (isCustomNetwork(networkDetails)) {
    // verify the contract executable in the instance entry
    // The SAC has a unique contract executable type

    if (!networkDetails.sorobanRpcUrl) {
      throw new SorobanRpcNotSupportedError();
    }

    const server = buildSorobanServer(
      networkDetails.sorobanRpcUrl || "",
      networkDetails.networkPassphrase,
    );

    const instance = new Contract(contractId).getFootprint();
    const ledgerKeyContractCode = instance.toXDR("base64");

    const { entries } = await server.getLedgerEntries(
      xdr.LedgerKey.fromXDR(ledgerKeyContractCode, "base64"),
    );

    if (entries && entries.length) {
      const parsed = entries[0].val;
      const executable = parsed.contractData().val().instance().executable();

      return (
        executable.switch().name ===
        xdr.ContractExecutableType.contractExecutableStellarAsset().name
      );
    }
    throw new Error("Contract not found in the ledger entries");
  }

  try {
    const url = new URL(
      `${INDEXER_URL}/is-sac-contract/${contractId}?network=${networkDetails.network}`,
    );
    const response = await fetch(url.href, { signal });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data);
    }

    return data.isSacContract;
  } catch (e) {
    if (signal?.aborted) {
      return false;
    }
    console.error(e);
    return false;
  }
};

export const isSacContract = (
  name: string,
  contractId: string,
  network: Networks,
) => {
  if (name.includes(":")) {
    try {
      return getAssetSacAddress(name, network) === contractId;
    } catch (error) {
      return false;
    }
  }

  return false;
};

export const getAssetSacAddress = (
  canonicalName: string,
  network: Networks,
) => {
  const Sdk = getSdk(network);
  return new Sdk.Asset(
    ...(canonicalName.split(":") as [string, string]),
  ).contractId(network);
};
