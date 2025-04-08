import { useReducer } from "react";
import { Keypair, TransactionBuilder, xdr } from "stellar-sdk";
import { HorizonApi } from "stellar-sdk/lib/horizon";

import { NetworkDetails } from "@shared/constants/stellar";
// eslint-disable-next-line import/no-unresolved
import { initialState, isError, reducer } from "helpers/request";
import { hardwareSign, hardwareSignAuth } from "popup/helpers/hardwareConnect";
import { WalletType } from "@shared/constants/hardwareWallet";
import { useSubmitTx } from "helpers/hooks/useSubmitTx";
import { useSignTx } from "helpers/hooks/useSignTx";
import { handleSignedHwPayload } from "@shared/api/internal";

export type SignTxResponse =
  | HorizonApi.SubmitTransactionResponse
  | Buffer<ArrayBufferLike>
  | undefined;

function useSignAndSubmit(publicKey: string, networkDetails: NetworkDetails) {
  const [state, dispatch] = useReducer(
    reducer<SignTxResponse, unknown>,
    initialState,
  );

  const { submitTx } = useSubmitTx(networkDetails);
  const { signTx } = useSignTx(publicKey, networkDetails);

  const signAndSubmit = async (
    transactionXDR: string,
  ): Promise<SignTxResponse | Error> => {
    dispatch({ type: "FETCH_DATA_START" });
    try {
      const signedTransaction = await signTx(transactionXDR);

      if (isError(signedTransaction)) {
        throw new Error(signedTransaction.message);
      }
      const submitResponse = await submitTx(
        signedTransaction.signedTransaction,
      );

      if (isError(submitResponse)) {
        throw new Error(submitResponse.message);
      }

      const payload = submitResponse;
      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch history", { cause: error });
    }
  };

  const signAndSubmitHardware = async (
    transactionXDR: string,
    walletType: WalletType.LEDGER,
    bipPath: string,
    isHashSigningEnabled: boolean,
    isAuthEntry: boolean,
    shouldSubmit: boolean,
  ) => {
    dispatch({ type: "FETCH_DATA_START" });

    if (isAuthEntry) {
      try {
        const auth = Buffer.from(transactionXDR, "base64");

        const signature = await hardwareSignAuth[walletType]({
          bipPath,
          auth,
          isHashSigningEnabled,
        });

        const payload = signature;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        return payload;
      } catch (error) {
        dispatch({ type: "FETCH_DATA_ERROR", payload: error });
        throw new Error("Failed to fetch history", { cause: error });
      }
    }

    try {
      const tx = TransactionBuilder.fromXDR(
        transactionXDR,
        networkDetails.networkPassphrase,
      );

      const signature = await hardwareSign[walletType]({
        bipPath,
        tx,
        isHashSigningEnabled,
      });

      const keypair = Keypair.fromPublicKey(publicKey);
      const decoratedSignature = new xdr.DecoratedSignature({
        hint: keypair.signatureHint(),
        signature,
      });

      tx.signatures.push(decoratedSignature);
      const signedXdr = tx.toXDR();

      let payload = undefined;
      if (shouldSubmit) {
        const submitResponse = await submitTx(signedXdr);

        if (isError(submitResponse)) {
          throw new Error(submitResponse.message);
        }

        // TODO: addRecentAddress
        payload = submitResponse;
      } else {
        await handleSignedHwPayload({ signedPayload: signedXdr });
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });
      return payload;
    } catch (error) {
      dispatch({ type: "FETCH_DATA_ERROR", payload: error });
      throw new Error("Failed to fetch history", { cause: error });
    }
  };

  return {
    state,
    signAndSubmit,
    signAndSubmitHardware,
  };
}

export { useSignAndSubmit };
