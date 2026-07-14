/**
 * Dev-only stub for `webextension-polyfill`, swapped in by webpack.dev.js
 * (NormalModuleReplacementPlugin). The popup served at localhost:9000 runs as a
 * plain web page with no extension runtime, so `browser.*` APIs the UI touches
 * at mount must resolve to no-ops — otherwise listeners registered in effects
 * (e.g. SessionLockListener's `runtime.onMessage`, SidebarSigningListener's
 * `runtime.connect`) throw and the error boundary takes down the whole app.
 *
 * This only makes the UI render for fast iteration — real messaging requires
 * loading the unpacked extension.
 */

const noopEvent = {
  addListener: () => undefined,
  removeListener: () => undefined,
  hasListener: () => false,
};

const makePort = (name = "") => ({
  name,
  onMessage: noopEvent,
  onDisconnect: noopEvent,
  postMessage: () => undefined,
  disconnect: () => undefined,
});

export default {
  tabs: {
    create: ({ url }: { url: string }) => window.open(url),
  },
  runtime: {
    onMessage: noopEvent,
    onMessageExternal: noopEvent,
    connect: ({ name }: { name?: string } = {}) => makePort(name),
    sendMessage: () =>
      Promise.reject(
        new Error(
          "webextension-polyfill dev shim: runtime messaging is unavailable at localhost:9000 — load the unpacked extension for full functionality",
        ),
      ),
  },
};
