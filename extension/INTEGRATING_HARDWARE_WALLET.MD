# How to integrate a new hardware wallet

This doc will outline how you can add a hardware wallet to the Freighter
codebase. Doing so should be as simple as adding a few configurations to the
code so users can see the hardware list listed in the app and then connect to
the hardware wallet using its preferred API. As a general rule of thumb, follow
the example set by Ledger in each one of the files we'll cover next:

1. Add a variable name for the hardware wallet in the list of hardware wallet
   types:
   [@shared/constants/hardwareWallet.ts](@shared/constants/hardwareWallet.ts).
   In this file, add the chosen variable name as a key to the enum `WalletType`.
   The value of this enum key will tell Freighter how to show your wallet's name
   in the Freighter UI.

   This will tell Freighter to look for configurations for this new WalletType.
   Because of that, you will notice right away that adding this to the enum
   causes Typescript errors across the app. We'll use these errors to identify
   all the places we're required to add a configuration for the new wallet. Code
   example:

   ```
   export enum WalletType {
   LEDGER = "Ledger",
   YOUR_WALLET = "Your Wallet",
   NONE = "",
   }
   ```

2. Navigate to
   [src/popup/helpers/hardwareConnect.ts](src/popup/helpers/hardwareConnect.ts).
   Here we'll add configurations for the new wallet.

3. First we'll add helper methods so Freighter knows how to interact with the
   hardware wallet's API. Start by adding a method for `createWalletConnection`.
   You'll add a key to this object using the enum value you set above. The value
   for this key will be an async function that runs any code needed to connect
   Freighter to your wallet and then return a public key. This will be run
   whenever a user adds your hardware wallet to Freighter for the first time.
   Code example:

```
export const createWalletConnection: CreateWalletConnection = {
  [WalletType.LEDGER]: async (bipPath = "") => {
    const transport = await TransportWebHID.request();
    const ledgerApi = new LedgerApi(transport);
    const response = await ledgerApi.getPublicKey(bipPath);

    return response.publicKey;
  },
  [WalletType.YOUR_WALLET] async (bipPath = "") => {
    // your code goes here
    return "Gxxxxxxx";
  }
};
```

4. Similary, next we'll add a method to `getWalletPublicKey`. This will run any
   time Freighter needs to retrieve a public key from a hardware wallet that has
   already been connected (for example, signing a transaction).

5. Next, we'll add a method to `hardwareSign`. This will be the code that runs
   whenever Freighter tries to sign a transaction using your hardware wallet as
   a signer. This code will likely make an API call that allows a user to sign
   the transaction using prompts on their hardware wallet. Once complete, this
   method will return the signature from the hardware wallet. Freighter will
   then add that signature to the transaction.

6. With those methods set, Freighter now knows how to interact with the hardware
   wallet. Next, we'll tell Freighter how to show information about your wallet.
   Scroll down to `walletAssets`. Here we'll set the key `logo` with your
   hardware wallet's logo. This will appear in a button when Freighter lists all
   possible hardware wallets to connect with. Drop your assets into the
   [src/popup/assets/](src/popup/assets/) folder. You can use almost any image
   type, though SVG's are recommended. You can import image paths at the top of
   file like you would any other TS file. Image dimensions are listed in the
   `WalletAssets` type.

7. Next we'll set a method on `pluginWalletInfo`. This will be general
   information that users will see when they choose to connect to your hardware
   wallet. Set `instruction` with some text that explains how a user should
   connect their device to their computer and enable it. We'll use `link.href`
   and `link.text` to set a URL a user can visit for extra help and the text for
   that link, respectively.

8. Finally, we'll parse errors that your hardware wallet's API might return.
   Since these are often not the most human readable error messages, you can add
   a method to handle erorrs specific to your API. This takes in the error
   thrown by the API and should then return a string that interperets what the
   error means. This error string will be shown in the UI if the API has an
   issue connecting to the wallet.
