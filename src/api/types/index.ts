import {
  SERVICE_TYPES,
  EXTERNAL_SERVICE_TYPES,
  APPLICATION_STATE,
} from "statics";

export interface Response {
  applicationState: APPLICATION_STATE;
  publicKey: string;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
  confirmedPassword: boolean;
  password: string;
  mnemonicPhraseToConfirm: string;
  recoverMnemonic: string;
  transaction: {
    sign: (sourceKeys: {}) => void;
  };
  type: SERVICE_TYPES;
  url: string;
}

export interface ExternalRequest {
  transactionXdr: string;
  type: EXTERNAL_SERVICE_TYPES;
}
