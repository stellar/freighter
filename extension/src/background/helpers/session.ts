import { store } from "background/store";
import {
  grantAccountAccess,
  timeoutAccountAccess,
} from "background/ducks/session";

const SESSION_LENGTH = 5;

export class SessionTimer {
  DURATION = 1000 * 60 * SESSION_LENGTH;
  runningTimeout: null | ReturnType<typeof setTimeout> = null;
  constructor(duration?: number) {
    this.DURATION = duration || this.DURATION;
  }

  startSession(key: { privateKey: string }) {
    if (this.runningTimeout) {
      clearTimeout(this.runningTimeout);
    }
    store.dispatch(grantAccountAccess(key));
    this.runningTimeout = setTimeout(() => {
      store.dispatch(timeoutAccountAccess());
    }, this.DURATION);
  }
}
