# How to integrate with Soroswap

Integrating with [Soroswap](https://app.soroswap.finance/) allows wallets to
swap between Soroban tokens using a smart contract.

In this repo, you will find all of our logic for constructing a swap between
Soroban tokens at the path: /`src/popup/helpers/sorobanSwap.ts`.

In this file, you will find 3 key methods that utilize `soroswap-router-sdk` and
`stellar-sdk`. Please see this file for a detailed breakdown of how each of the
below functions works.

1. `getSoroswapTokens()`: This will retrieve the tokens that Soroswap supports
   on each network.

2. `soroswapGetBestPath()`: This function builds the path between your starting
   asset and your destination asset. This will also tell you the conversion rate
   between the 2 assets. This function will be used in the 2nd function below.

3. `buildAndSimulateSoroswapTx()`: Once we have the path, we can construct a
   Stellar transaction to send your starting asset and receive your destination
   asset.
