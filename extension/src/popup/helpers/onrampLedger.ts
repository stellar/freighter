import { Buffer } from "buffer";

import { WalletType } from "@shared/constants/hardwareWallet";
import { store } from "popup/App";
import { bipPathSelector } from "popup/ducks/accountServices";
import {
  buildOnrampClaims,
  canonicalizeJson,
  assembleProofToken,
  ADDRESS_PROOF_DOMAIN,
} from "helpers/onrampProof";
import { hardwareSignMessage } from "popup/helpers/hardwareConnect";

export class LedgerOnrampUnsupportedError extends Error {}

/*
 * Produces the `address_proof` body-field value by signing the SEP-53 framed
 * claims on a hardware wallet. The signed bytes are
 * encodeSep53Message(ADDRESS_PROOF_DOMAIN + canonical), matching the software-key
 * path and the backend verifier. The token carries only the canonical payload
 * plus the signature (via assembleProofToken).
 */
export const signOnrampProofWithLedger = async ({
  publicKey,
  body,
  hardwareWalletType,
}: {
  publicKey: string;
  body: unknown;
  hardwareWalletType: WalletType;
}): Promise<string> => {
  if (hardwareWalletType !== WalletType.LEDGER) {
    throw new LedgerOnrampUnsupportedError(
      "Buying with Coinbase is not supported for this wallet type",
    );
  }

  const bipPath = bipPathSelector(store.getState());

  const claims = buildOnrampClaims({
    publicKey,
    body,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  const canonical = canonicalizeJson(claims);

  try {
    const { signature } = await hardwareSignMessage[WalletType.LEDGER]({
      bipPath,
      message: Buffer.from(ADDRESS_PROOF_DOMAIN + canonical, "utf8"),
    });
    return assembleProofToken(canonical, signature);
  } catch (e) {
    // Older Ledger Stellar app rejects the SIGN_MESSAGE (0x0c) APDU.
    throw new LedgerOnrampUnsupportedError(
      "Update your Ledger Stellar app to buy with Coinbase",
    );
  }
};
