import {
  SERVICE_TYPES,
  EXTERNAL_SERVICE_TYPES,
} from "@lyra/constants/services";
import { APPLICATION_STATE } from "@lyra/constants/applicationState";

export interface Response {
  error: string;
  applicationState: APPLICATION_STATE;
  publicKey: string;
  hasPrivateKey: boolean;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
  confirmedPassword: boolean;
  password: string;
  mnemonicPhraseToConfirm: string;
  recoverMnemonic: string;
  transaction: {
    sign: (sourceKeys: {}) => void;
  };
  transactionStatus: string;
  source: string;
  type: SERVICE_TYPES;
  url: string;
}

export interface ExternalRequest {
  transactionXdr: string;
  type: EXTERNAL_SERVICE_TYPES;
}
