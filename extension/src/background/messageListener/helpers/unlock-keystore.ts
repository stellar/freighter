import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

export const unlockKeystore = ({
  password,
  keyID,
  keyManager,
}: {
  password: string;
  keyID: string;
  keyManager: KeyManager;
}) => keyManager.loadKey(keyID, password);
