export enum OPERATION_TYPES {
  accountMerge = "Account Merge",
  allowTrust = "Allow Trust",
  beginSponsoringFutureReserves = "Begin Sponsoring Future Reserves",
  bumpSequence = "Bump Sequence",
  changeTrust = "Change Trust",
  claimClaimableBalance = "Claim Claimable Balance",
  clawback = "Clawback",
  clawbackClaimableBalance = "Clawback Claimable Balance",
  createAccount = "Create Account",
  createClaimableBalance = "Create Claimable Balance",
  createPassiveSellOffer = "Create Passive Sell Offer",
  endSponsoringFutureReserves = "End Sponsoring Future Reserves",
  extendFootprintTtl = "Extend Footprint TTL",
  inflation = "Inflation",
  invokeHostFunction = "Invoke Host Function",
  liquidityPoolDeposit = "Liquidity Pool Deposit",
  liquidityPoolWithdraw = "Liquidity Pool Withdraw",
  manageBuyOffer = "Manage Buy Offer",
  manageData = "Manage Data",
  manageSellOffer = "Manage Sell Offer",
  pathPaymentStrictReceive = "Path Payment Strict Receive",
  pathPaymentStrictSend = "Path Payment Strict Send",
  payment = "Payment",
  revokeAccountSponsorship = "Revoke Account Sponsorship",
  revokeClaimableBalanceSponsorship = "Revoke Claimable Balance Sponsorship",
  revokeDataSponsorship = "Revoke Data Sponsorship",
  revokeOfferSponsorship = "Revoke Offer Sponsorship",
  revokeSignerSponsorship = "Revoke Signer Sponsorship",
  revokeSponsorship = "Revoke Sponsorship",
  revokeTrustlineSponsorship = "Revoke Trustline Sponsorship",
  setOptions = "Set Options",
  setTrustLineFlags = "Set Trustline Flags",
  bumpFootprintExpiration = "Bump Footprint Expiration",
  restoreFootprint = "Restore Footprint",
}

export enum TRANSACTION_WARNING {
  memoRequired = "memo-required",
}

export enum CLAIM_PREDICATES {
  claimPredicateUnconditional = "Unconditional",
  claimPredicateConditional = "Conditional",
  claimPredicateAnd = "And",
  claimPredicateOr = "Or",
  claimPredicateNot = "Not",
  claimPredicateBeforeRelativeTime = "Before Relative Time",
  claimPredicateBeforeAbsoluteTime = "Before Absolute Time",
}

export enum FLAG_TYPES {
  authorized = "Authorized",
  authorizedToMaintainLiabilities = "Authorized To Maintain Liabilities",
  clawbackEnabled = "Clawback Enabled",
}
