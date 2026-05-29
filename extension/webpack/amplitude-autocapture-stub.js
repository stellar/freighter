/**
 * Build-time stub for `@amplitude/plugin-autocapture-browser`.
 *
 * `@amplitude/analytics-browser` statically imports this plugin, which in turn
 * pulls in Amplitude's "visual tagging" and "background capture" features.
 * Those features call `loadScriptOnce(...)` to fetch remotely-hosted scripts
 * from `cdn.amplitude.com` at runtime:
 *
 *   - https://cdn.amplitude.com/libs/visual-tagging-selector-1.0.0-alpha.js.gz
 *   - https://cdn.amplitude.com/libs/background-capture-1.0.0-alpha.2.js.gz
 *
 * We initialize Amplitude with `autocapture: false` (see helpers/metrics.ts), so
 * none of this code ever executes. But `autocapture: false` is only a runtime
 * flag — the remote-script URLs still survive into the production bundle as
 * dead code, and the Chrome Web Store / Firefox AMO reviewers scan the static
 * bundle and reject the build for "remotely hosted code".
 *
 * Since we never use autocapture, we alias the package to these no-ops via
 * webpack `resolve.alias` (see webpack.common.js). This strips both
 * cdn.amplitude.com references from the bundle. Because nothing else imports
 * `getOrCreateWindowMessenger` / `enableBackgroundCapture` from
 * `@amplitude/analytics-core`, tree-shaking also drops the core messenger code
 * that holds the background-capture URL.
 *
 * If autocapture is ever genuinely needed, remove the alias rather than
 * re-enabling the runtime flag — and confirm the store policy implications of
 * shipping remotely-hosted code first.
 *
 * This file is plain ESM with no loader transform; keep it loader-agnostic.
 */

// A benign, never-invoked enrichment plugin matching the shape `client.add()`
// expects, in case the stubbed factory is ever called despite autocapture:false.
const noopPlugin = (name) => () => ({
  name,
  type: "enrichment",
  setup: () => Promise.resolve(undefined),
  execute: (event) => Promise.resolve(event),
});

export const autocapturePlugin = noopPlugin(
  "@amplitude/plugin-autocapture-browser",
);
export const frustrationPlugin = noopPlugin(
  "@amplitude/plugin-frustration-browser",
);

// Mirror the real package's named exports so any importer resolves cleanly.
export const plugin = autocapturePlugin;
export const enableVisualTagging = () => undefined;
export class DataExtractor {}

export default autocapturePlugin;
