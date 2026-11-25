import { StrKey } from "stellar-sdk";

/**
 * Codes Blockaid accepts in a bulk scan: 1-12 code points (Blockaid's unit,
 * not UTF-16 units), each a letter in any script, a combining mark, a decimal
 * digit, a connector such as "_", or a zero-width joiner or non-joiner.
 */
const BLOCKAID_ASSET_CODE =
  /^[\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\p{Join_Control}]{1,12}$/u;

/**
 * True if a `CODE-ISSUER` id can go in a /scan-asset-bulk request.
 *
 * One bad id fails the whole batch: freighter-backend rejects an id whose
 * `split("-")[1]` isn't a G or C key, and Blockaid rejects a code it can't
 * take. A SEP-41 symbol is an unconstrained string, so a held or listed
 * contract token can produce either ("USDC-SEAV", "SC:AM", "USDC.e", or the
 * 56-character contract id standing in for a missing symbol). Leave those
 * out so every other asset in the batch still gets its verdict. Must stay in
 * step with the backend's validator and Blockaid's code check.
 */
export const isBulkScannableAssetId = (assetId: string): boolean => {
  const parts = assetId.split("-");

  return (
    parts.length === 2 &&
    BLOCKAID_ASSET_CODE.test(parts[0]) &&
    (StrKey.isValidEd25519PublicKey(parts[1]) ||
      StrKey.isValidContract(parts[1]))
  );
};
