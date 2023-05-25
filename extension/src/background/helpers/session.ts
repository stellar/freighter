import browser from "webextension-polyfill";

// 24 hours
const SESSION_LENGTH = 60 * 24;
export const SESSION_ALARM_NAME = "session-timer";

export class SessionTimer {
  DURATION = 1000 * 60 * SESSION_LENGTH;
  runningTimeout: null | ReturnType<typeof setTimeout> = null;
  constructor(duration?: number) {
    this.DURATION = duration || this.DURATION;
  }

  startSession() {
    browser?.alarms.create(SESSION_ALARM_NAME, {
      delayInMinutes: SESSION_LENGTH,
    });
  }
}
