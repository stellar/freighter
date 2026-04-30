# Security -- Freighter Extension

## Key Storage Architecture

Freighter is a non-custodial wallet. Private keys never leave the device.

- **Encrypted vault:** stored in `chrome.storage.local`, encrypted with the
  user's password
- **Encrypted temporary key material:** stored in `browser.storage.local` under
  `TEMPORARY_STORE_ID` via `storeEncryptedTemporaryData`
- **Derived hash key:** held in Redux session state, persisted to
  `browser.storage.session` when the session store is enabled
- **Decrypted private keys:** produced on demand during signing and never
  written to any storage layer
- **Keys exist only in the background context** -- the popup and content scripts
  never have access to raw key material

## Popup Never Sees Raw Keys

The popup sends unsigned XDR to the background and receives signed XDR back. The
signing flow:

1. Popup builds an unsigned transaction (XDR)
2. Popup sends XDR to background via `sendMessageToBackground()`
3. Background derives the private key on demand (using the hash key from session
   state), signs the XDR
4. Background returns the signed XDR to the popup
5. Popup submits the signed transaction to the network

## Hardware Wallet Path

Hardware wallets (Ledger) use the same interface as software signing. The
background detects the key type and routes to the appropriate signing backend
(local key vs. hardware device). The popup code is identical for both paths.

## Message Validation

Every message received by the background must pass validation. The required
checks depend on data sensitivity:

1. **Valid message type** -- the message type must be a member of the
   `SERVICE_TYPES` or `EXTERNAL_SERVICE_TYPES` enum (all messages)
2. **Sender origin check** -- verify the message comes from a trusted source
   (sensitive endpoints only)
3. **Allow list check** -- the dApp's origin must be in the user's approved
   list, or trigger an approval prompt (sensitive endpoints only)
4. **Public key existence** -- the requested account must exist in the wallet
   (user-specific endpoints only)

### Allowlist Rules by Endpoint Type

| Endpoint Type                                 | Allowlist Check | Examples                                                             |
| --------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| Read-only non-sensitive (network info)        | NOT required    | `requestNetwork`, `requestNetworkDetails`, `requestConnectionStatus` |
| User-specific sensitive (public key, signing) | Required        | `requestPublicKey`, `requestAccess`, `signTransaction`               |
| State-modifying                               | Required        | `setAllowedStatus`                                                   |

## Window-Based Approval Flow

When a dApp requests a sensitive operation (signing, account access):

1. Background generates a unique request ID via `crypto.randomUUID()`
2. Background opens a new browser window with the approval UI, passing params
   via URL encoding
3. A promise resolver is stored in a response queue, keyed by the request ID
4. When the user approves or rejects, the approval window sends the response
   back
5. The promise resolves with the result, and the entry is spliced from the
   response queue

## Content Script Filtering

The content script acts as a gatekeeper between the page and the extension:

- Listens for `window.postMessage` events from the page
- Filters by source: only messages with `EXTERNAL_MSG_REQUEST` source are
  processed
- Validates the message type against `EXTERNAL_SERVICE_TYPES` enum
- Only valid messages are forwarded to the background via
  `browser.runtime.sendMessage`
- All other messages are silently dropped

## Content Security Policy

Manifest V3 enforces strict CSP by default:

- No inline scripts (`script-src 'self'`)
- No `eval()` or dynamic code generation
- Minimal permissions: the manifest currently declares `storage`, `alarms`, and
  `sidePanel`

## Blockaid Integration

- Every dApp transaction is scanned by Blockaid before signing
- Blockaid provides risk assessment (malicious, benign, unknown)
- Debug panel available at the `/debug` route in the extension popup during
  development (requires dev mode)
- Scan results are displayed to the user in the approval UI

## Production Guardrails

- Production builds block connections to the dev server
- Additional security checks are enabled in production mode
- Source maps are not shipped in production builds

## Common Security Mistakes to Avoid

- **Logging keys:** never log private keys, mnemonics, or decrypted key material
  to the console
- **Weakening CSP:** never add `unsafe-inline` or `unsafe-eval` to the manifest
  CSP
- **Trusting page content:** never use data from `window.postMessage` without
  validation against the enum
- **Non-null assertions on key material:** `privateKey!` can mask missing keys
  -- always handle the undefined case explicitly
- **Storing decrypted key material:** never write decrypted private keys or
  mnemonics to any storage. Produce decrypted key material on demand and keep it
  only in memory during the signing operation
