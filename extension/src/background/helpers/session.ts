import { store } from "background/store";
import {
  grantAccountAccess,
  timeoutAccountAccess,
} from "background/ducks/session";

const SESSION_LENGTH = 5;

export class SessionTimer {
  DURATION = 1000 * 60 * SESSION_LENGTH;
  constructor(duration?: number) {
    this.DURATION = duration || this.DURATION;
  }

  startSession(key: { privateKey: string }) {
    store.dispatch(grantAccountAccess(key));
    setTimeout(() => {
      store.dispatch(timeoutAccountAccess());
    }, this.DURATION);
  }
}
