import {
  Contract,
  TransactionBuilder,
  Memo,
  Server,
  TimeoutInfinite,
  xdr,
} from "soroban-client";
import { simulateTx } from "./server";

export const transfer = async (
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
  server: Server,
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
  server: Server,
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
  server: Server,
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
  server: Server,
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
