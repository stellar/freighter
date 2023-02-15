import { xdr } from "soroban-client";

// To be used for the Identifier type from soroban-auth
export function accountIdentifier(account: Buffer) {
  return xdr.ScVal.scvObject(
    xdr.ScObject.scoVec([
      xdr.ScVal.scvSymbol("Account"),
      xdr.ScVal.scvObject(
        xdr.ScObject.scoAccountId(xdr.PublicKey.publicKeyTypeEd25519(account)),
      ),
    ]),
  );
}

export function decodeAccountIdentifier(scVal: Buffer) {
  const accountId = xdr.ScVal.fromXDR(scVal) as any;
  console.log(accountId._value._value._attributes.lo.low);
  return accountId;
}
