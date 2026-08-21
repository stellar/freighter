# e2e tests — agent guidance

(Read via the `CLAUDE.md` symlink in this directory too, so `/code-review`
surfaces it for changes here.)

## backend-v2 calls run in the background service worker

Calls to freighter-backend-v2 go through the background chokepoint
(`FETCH_BACKEND_V2` → `callBackendV2`), so the actual HTTP request is made by the
MV3 **service worker**, not the popup page.

- Intercept/observe these with `context.route` / `context.on("request")`, **NOT**
  `page.route` / `page.on` — page-scoped interception silently misses the service
  worker's request (the mock never fires; the test hangs or sees no data). This
  applies to `/protocols`, `/collectibles`, `/token-prices`,
  `/ledger-key/accounts`, `/rpc-health`, and any new v2 endpoint. From a stub
  helper that only receives `page`, use `page.context().route(...)`.
- Genuinely popup-side fetches (e.g. NFT metadata fetched from a token URI) are
  made by the page and stay on `page.route`.
