import { xdr, Address, ScInt, scValToBigInt } from "soroban-client";

/* eslint-disable */

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

export const decodeScVal = (b64: string) =>
  xdr.ScVal.fromXDR(b64, "base64").u32();

export const numberToI128 = (value: number): xdr.ScVal =>
  new ScInt(value).toI128();

/* eslint-enable */
