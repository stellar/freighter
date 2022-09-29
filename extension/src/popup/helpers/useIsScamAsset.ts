import { useSelector } from "react-redux";
import { getCanonicalFromAsset } from "helpers/stellar";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

export const useIsScamAsset = (code: string, issuer: string) => {
  const { assetDomains, blockedDomains } = useSelector(
    transactionSubmissionSelector,
  );

  // ALEC TODO - remove
  if (issuer === "GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II") {
    return true;
  }

  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const assetDomain = assetDomains[canonicalAsset];
  return !!blockedDomains.domains[assetDomain];
};
