jest.mock("helpers/metrics", () => ({
  registerHandler: jest.fn(),
  emitMetric: jest.fn(),
}));
jest.mock("popup/App", () => ({}));
jest.mock("popup/ducks/accountServices", () => {
  const thunk = (name: string) => ({
    fulfilled: { type: `${name}/fulfilled` },
    rejected: { type: `${name}/rejected` },
  });
  return {
    createAccount: thunk("createAccount"),
    confirmPassword: thunk("confirmPassword"),
    confirmMnemonicPhrase: thunk("confirmMnemonicPhrase"),
    recoverAccount: thunk("recoverAccount"),
    recoverAccountFromSecretKey: thunk("recoverAccountFromSecretKey"),
  };
});

import { registerHandler, emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  recoverAccount,
  recoverAccountFromSecretKey,
} from "popup/ducks/accountServices";

import "popup/metrics/authServices";

type Handler = (state: unknown, action: unknown) => void;

const handlerFor = (actionCreator: unknown): Handler => {
  const call = (registerHandler as jest.Mock).mock.calls.find(
    ([creator]) => creator === actionCreator,
  );
  if (!call) {
    throw new Error("no handler registered");
  }
  return call[1] as Handler;
};

describe("account recovery metrics", () => {
  beforeEach(() => {
    (emitMetric as jest.Mock).mockClear();
  });

  it("emits completed with recovery_method secret_key", () => {
    handlerFor(recoverAccountFromSecretKey.fulfilled)({}, {});
    expect(emitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.accountRecoveryCompleted,
      { recovery_method: "secret_key" },
    );
  });

  it("emits failed with recovery_method and reason_code for a secret key", () => {
    handlerFor(recoverAccountFromSecretKey.rejected)(
      {},
      { payload: { errorMessage: "Invalid secret key" } },
    );
    expect(emitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.accountRecoveryFailed,
      {
        recovery_method: "secret_key",
        reason_code: "Invalid secret key",
      },
    );
  });

  it("keeps recovery_phrase on the phrase completed event", () => {
    handlerFor(recoverAccount.fulfilled)({}, {});
    expect(emitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.accountRecoveryCompleted,
      { recovery_method: "recovery_phrase" },
    );
  });

  it("leaves the phrase failed payload as reason_code only", () => {
    handlerFor(recoverAccount.rejected)(
      {},
      { payload: { errorMessage: "The phrase you entered is incorrect" } },
    );
    expect(emitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.accountRecoveryFailed,
      {
        reason_code: "The phrase you entered is incorrect",
      },
    );
  });
});
