export default class SessionTimer {
  DURATION = 5000;
  constructor(duration: number) {
    this.DURATION = duration;
  }

  startTimer(terminateSession: () => void) {
    setTimeout(terminateSession, this.DURATION);
  }
}
