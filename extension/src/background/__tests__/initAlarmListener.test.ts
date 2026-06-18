import browser from "webextension-polyfill";

import { SERVICE_TYPES } from "@shared/constants/services";

let alarmHandler:
  | ((alarm: { name: string }) => void | Promise<void>)
  | undefined;

const mockSendMessage = jest.fn().mockResolvedValue(undefined);

jest.mock("webextension-polyfill", () => ({
  alarms: {
    onAlarm: {
      addListener: jest.fn((handler) => {
        alarmHandler = handler;
      }),
    },
  },
  runtime: {
    sendMessage: (...args: any[]) => mockSendMessage(...args),
  },
}));

const mockClearSession = jest.fn().mockResolvedValue(undefined);
jest.mock("background/helpers/session", () => {
  const actual = jest.requireActual("background/helpers/session");
  return {
    ...actual,
    clearSession: (...args: any[]) => mockClearSession(...args),
  };
});

jest.mock("background/store", () => ({
  buildStore: jest.fn().mockResolvedValue({}),
}));

jest.mock("background/helpers/dataStorageAccess", () => ({
  dataStorageAccess: jest.fn().mockReturnValue({}),
  browserLocalStorage: {},
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initAlarmListener } = require("background/index");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SESSION_ALARM_NAME } = require("background/helpers/session");

describe("initAlarmListener", () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockClearSession.mockClear();
    alarmHandler = undefined;
    initAlarmListener();
  });

  it("clears the session and broadcasts SESSION_LOCKED when the auto-lock alarm fires", async () => {
    expect(browser.alarms.onAlarm.addListener).toHaveBeenCalled();
    expect(alarmHandler).toBeDefined();

    await alarmHandler!({ name: SESSION_ALARM_NAME });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: SERVICE_TYPES.SESSION_LOCKED,
    });
  });

  it("swallows sendMessage errors when no UI is open to receive the broadcast", async () => {
    mockSendMessage.mockRejectedValueOnce(
      new Error("Could not establish connection. Receiving end does not exist."),
    );

    await expect(
      alarmHandler!({ name: SESSION_ALARM_NAME }),
    ).resolves.toBeUndefined();

    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated alarms", async () => {
    await alarmHandler!({ name: "some-other-alarm" });

    expect(mockClearSession).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
