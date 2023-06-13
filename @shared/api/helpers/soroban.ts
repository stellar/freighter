import BigNumber from "bignumber.js";
import * as SorobanClient from "soroban-client";

import { I128 } from "./xdr";

/* eslint-disable */

export const accountIdentifier = (account: string) =>
  new SorobanClient.Address(account).toScVal();

export const valueToI128String = (value: SorobanClient.xdr.ScVal) =>
  new I128([
    BigInt(value.i128().lo().low),
    BigInt(value.i128().lo().high),
    BigInt(value.i128().hi().low),
    BigInt(value.i128().hi().high),
  ]).toString();

// How do we decode these in a more generic way?
export const decodei128 = (xdr: string) => {
  const value = SorobanClient.xdr.ScVal.fromXDR(xdr, "base64");
  try {
    return valueToI128String(value);
  } catch (error) {
    console.log(error);
    return 0;
  }
};

export const decodeBytesN = (xdr: string) => {
  const val = SorobanClient.xdr.ScVal.fromXDR(xdr, "base64");
  return val.bytes().toString();
};

export const decodeScVal = (xdr: string) => {
  const val = SorobanClient.xdr.ScVal.fromXDR(xdr, "base64");
  return val.u32();
};

const bigintToBuf = (bn: bigint): Buffer => {
  let hex = BigInt(bn).toString(16).replace(/^-/, "");
  if (hex.length % 2) {
    hex = `0${hex}`;
  }

  const len = hex.length / 2;
  const u8 = new Uint8Array(len);

  let i = 0;
  let j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  if (bn < BigInt(0)) {
    // Set the top bit
    u8[0] |= 0x80;
  }

  return Buffer.from(u8);
};

const bigNumberFromBytes = (
  signed: boolean,
  ...bytes: (string | number | bigint)[]
): BigNumber => {
  let sign = 1;
  if (signed && bytes[0] === 0x80) {
    // top bit is set, negative number.
    sign = -1;
    bytes[0] &= 0x7f;
  }
  let b = BigInt(0);
  for (let byte of bytes) {
    b <<= BigInt(8);
    b |= BigInt(byte);
  }
  return BigNumber(b.toString()).multipliedBy(sign);
};

export const numberToI128 = (value: number): SorobanClient.xdr.ScVal => {
  const bigValue = BigNumber(value);
  const b: bigint = BigInt(bigValue.toFixed(0));
  const buf = bigintToBuf(b);
  if (buf.length > 16) {
    throw new Error("BigNumber overflows i128");
  }

  if (bigValue.isNegative()) {
    // Clear the top bit
    buf[0] &= 0x7f;
  }

  // left-pad with zeros up to 16 bytes
  const padded = Buffer.alloc(16);
  buf.copy(padded, padded.length - buf.length);
  console.debug({ value: value.toString(), padded });

  if (bigValue.isNegative()) {
    // Set the top bit
    padded[0] |= 0x80;
  }

  const hi = new SorobanClient.xdr.Int64(
    bigNumberFromBytes(false, ...padded.slice(4, 8)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(0, 4)).toNumber(),
  );
  const lo = new SorobanClient.xdr.Uint64(
    bigNumberFromBytes(false, ...padded.slice(12, 16)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(8, 12)).toNumber(),
  );

  return SorobanClient.xdr.ScVal.scvI128(
    new SorobanClient.xdr.Int128Parts({ lo, hi }),
  );
};

/* eslint-enable */
