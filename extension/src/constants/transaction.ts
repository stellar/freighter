export enum OPERATION_TYPES {
  accountMerge = "Account Merge",
  allowTrust = "Allow Trust",
  beginSponsoringFutureReserves = "Begin Sponsoring Future Reserves",
  bumpSequence = "Bump Sequence",
  changeTrust = "Change Trust",
  createAccount = "Create Account",
  createClaimableBalance = "Create Claimable Balance",
  createPassiveSellOffer = "Create Passive Sell Offer",
  endSponsoringFutureReserves = "End Sponsoring Future Reserves",
  manageBuyOffer = "Manage Buy Offer",
  manageData = "Manage Data",
  manageSellOffer = "Manage Sell Offer",
  pathPaymentStrictReceive = "Path Payment Strict Receive",
  pathPaymentStrictSend = "Path Payment Strict Send",
  payment = "Payment",
  revokeAccountSponsorship = "Revoke Account Sponsorship",
  setOptions = "Set Options",
}

export enum TRANSACTION_WARNING {
  malicious = "malicious",
  unsafe = "unsafe",
  memoRequired = "memo-required",
}

export enum CLAIM_PREDICATES {
  claimPredicateUnconditional = "Unconditional",
  claimPredicateConditional = "Conditional",
  claimPredicateAnd = "And",
  claimPredicateOr = "Or",
  claimPredicateNot = "Not",
  claimPredicateBeforeRelativeTime = "Relative Time Before",
  claimPredicateBeforeAbsoluteTime = "Before Absolute Time",
}
