import { Networks, StrKey } from "stellar-sdk";
import {
  GetSoranPaymentNameMessage,
  SaveSoranPaymentNameMessage,
} from "@shared/api/types/message-request";
import {
  soranPaymentKey,
  SoranPaymentReference,
} from "@shared/api/types/soran";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SORAN_PAYMENT_NAMES } from "constants/localStorageTypes";

const MAX_RECORDS = 1000;
const canonicalName =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const validReference = (publicKey: unknown, payment: SoranPaymentReference) =>
  typeof publicKey === "string" &&
  StrKey.isValidEd25519PublicKey(publicKey) &&
  payment &&
  payment.networkPassphrase === Networks.TESTNET &&
  typeof payment.transactionHash === "string" &&
  /^[a-f0-9]{64}$/.test(payment.transactionHash) &&
  typeof payment.destination === "string" &&
  (StrKey.isValidEd25519PublicKey(payment.destination) ||
    StrKey.isValidContract(payment.destination) ||
    StrKey.isValidMed25519PublicKey(payment.destination)) &&
  typeof payment.memo === "string" &&
  payment.memo.length <= 128 &&
  ["", "none", "text", "id", "hash", "return"].includes(payment.memoType);

type StoredName = { key: string; name: string };
// Serialize writes so concurrent confirmations cannot overwrite each other.
let writes: Promise<unknown> = Promise.resolve();
export const saveSoranPaymentName = ({
  request,
  localStore,
}: {
  request: SaveSoranPaymentNameMessage;
  localStore: DataStorageAccess;
}): Promise<{ saved: boolean }> => {
  const result = writes.then(async () => {
    try {
      const { payment, activePublicKey } = request;
      if (
        !validReference(activePublicKey, payment) ||
        typeof payment.name !== "string" ||
        !canonicalName.test(payment.name)
      )
        return { saved: false };
      const key = soranPaymentKey(activePublicKey!, payment);
      const stored: StoredName[] =
        (await localStore.getItem(SORAN_PAYMENT_NAMES)) || [];
      // A historical annotation is immutable once saved.
      if (!stored.some((item) => item.key === key)) {
        await localStore.setItem(
          SORAN_PAYMENT_NAMES,
          [...stored, { key, name: payment.name }].slice(-MAX_RECORDS),
        );
      }
      return { saved: true };
    } catch {
      return { saved: false };
    }
  });
  writes = result;
  return result;
};

export const getSoranPaymentName = async ({
  request,
  localStore,
}: {
  request: GetSoranPaymentNameMessage;
  localStore: DataStorageAccess;
}): Promise<{ name: string | null }> => {
  try {
    if (!validReference(request.activePublicKey, request.payment))
      return { name: null };
    const key = soranPaymentKey(request.activePublicKey!, request.payment);
    const stored: StoredName[] =
      (await localStore.getItem(SORAN_PAYMENT_NAMES)) || [];
    const name = stored.find((item) => item.key === key)?.name;
    return {
      name: typeof name === "string" && canonicalName.test(name) ? name : null,
    };
  } catch {
    return { name: null };
  }
};
