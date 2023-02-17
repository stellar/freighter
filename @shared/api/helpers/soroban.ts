import { xdr, StrKey } from "soroban-client";

// To be used for the Address type from soroban-sdk
export function accountIdentifier(account: string) {
  const buf = StrKey.decodeEd25519PublicKey(account);
  return xdr.ScVal.scvObject(
    xdr.ScObject.scoAddress(
      xdr.ScAddress.scAddressTypeAccount(
        xdr.PublicKey.publicKeyTypeEd25519(buf),
      ),
    ),
  );
}

// How do we decode these in a more generic way?
export function decodeAccountIdentifier(scVal: Buffer) {
  const accountId = xdr.ScVal.fromXDR(scVal);
  const val = accountId.value() as xdr.ScObject;
  const hyper = val.value() as xdr.Int128Parts;
  return hyper.lo().low;
}

export function decodeBytesN(scVal: Buffer) {
  const val = xdr.ScVal.fromXDR(scVal);
  const scObj = val.value() as xdr.ScObject;
  const valBuffer = scObj.value();
  return valBuffer.toString();
}

export function decodeScVal(scVal: Buffer) {
  const val = xdr.ScVal.fromXDR(scVal);
  return val.value()?.toString() || "";
}
