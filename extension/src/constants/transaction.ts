export enum OPERATION_TYPES {
  accountMerge = "Account Merge",
  allowTrust = "Allow Trust",
  bumpSequence = "Bump Sequence",
  changeTrust = "Change Trust",
  createAccount = "Create Account",
  createPassiveSellOffer = "Create Passive Sell Offer",
  manageBuyOffer = "Manage Buy Offer",
  manageData = "Manage Data",
  manageSellOffer = "Manage Sell Offer",
  pathPaymentStrictReceive = "Path Payment Strict Receive",
  pathPaymentStrictSend = "Path Payment Strict Send",
  payment = "Payment",
  setOptions = "Set Options",
}

export enum TRANSACTION_WARNING {
  malicious = "malicious",
  unsafe = "unsafe",
  memoRequired = "memo-required",
}
