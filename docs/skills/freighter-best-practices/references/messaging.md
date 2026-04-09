# Messaging -- Freighter Extension

## Message Flow Architecture

```
dApp (web page)
  |
  | window.postMessage (EXTERNAL_MSG_REQUEST)
  v
@stellar/freighter-api (injected SDK)
  |
  | window.postMessage
  v
Content Script (extension/src/contentScript/)
  |
  | chrome.runtime.sendMessage (EXTERNAL_SERVICE_TYPES)
  v
Background Service Worker (extension/src/background/)
  ^                    |
  |                    | Opens approval window (if needed)
  |                    v
  |                 Approval Popup
  |                    |
  | chrome.runtime.sendMessage (response)
  |
  v
Popup (extension/src/popup/)
  |
  | sendMessageToBackground() --> chrome.runtime.sendMessage (SERVICE_TYPES)
  v
Background Service Worker
```

## Two Message Type Enums

- **`SERVICE_TYPES`** -- messages from the popup to the background (internal
  extension communication)
- **`EXTERNAL_SERVICE_TYPES`** -- messages from dApps to the background via the
  content script (external communication)

Both enums are defined in `@shared/constants/` and must be used as the single
source of truth for message types.

## Adding a New Message Type

### Step 1: Add to the Enum

Add the new type to `SERVICE_TYPES` (for popup-to-background) or
`EXTERNAL_SERVICE_TYPES` (for dApp-to-background):

```typescript
// @shared/constants/services.ts
export enum SERVICE_TYPES {
  // ... existing types
  GET_NEW_DATA = "GET_NEW_DATA",
}
```

### Step 2: Create a Handler

Create a handler function in
`extension/src/background/messageListener/handlers/`:

```typescript
// extension/src/background/messageListener/handlers/getNewData.ts
export const handleGetNewData = async (request: MessageRequest) => {
  try {
    const data = await fetchNewData(request.params);
    return { result: data };
  } catch (error) {
    captureException(error);
    return { error: "Failed to fetch data" };
  }
};
```

### Step 3: Register in the Listener

Register the handler in the background message listener:

```typescript
case SERVICE_TYPES.GET_NEW_DATA:
  return handleGetNewData(request);
```

### Step 4: Send from the Popup

Use `sendMessageToBackground()` from `@shared/api/internal`:

```typescript
import { sendMessageToBackground } from "@shared/api/internal";
import { SERVICE_TYPES } from "@shared/constants/services";

const response = await sendMessageToBackground({
  type: SERVICE_TYPES.GET_NEW_DATA,
  params: {
    /* ... */
  },
});
```

## Response Queue Pattern

For operations requiring user approval (signing, connecting):

1. Background generates a unique ID via `crypto.randomUUID()`
2. A promise resolver is stored in a response queue array, keyed by the UUID
3. Background opens the approval window with the UUID as a URL parameter
4. When the user responds, the approval window sends the result back
5. The matching resolver is found by UUID, called with the result, and spliced
   from the array
6. Timeout cleanup removes stale entries if the user closes the window without
   responding

## Response Structure (CRITICAL)

Handlers MUST return structured objects rather than throwing. Follow this exact
pattern:

### Success Response

Return domain-specific fields WITHOUT an `error` field:

```typescript
// CORRECT success responses
return { signedTransaction: "XDR..." };
return { publicKey: "G...", allAccounts: [...] };
return { preparedTransaction: xdr, simulationResponse };
```

### Error Response

Return ONLY `{ error: string }` — no domain-specific fields mixed in:

```typescript
// CORRECT error response
return { error: "Soroban simulation failed" };

// WRONG — mixing error with domain fields
return { error: "Soroban simulation failed", simulationResponse }; // DON'T DO THIS
```

### Why This Matters

The SDK and popup code check for the presence of `error` to determine
success/failure. Mixing error with data fields creates ambiguous responses.

### Exception: apiError for SDK consumers

When the caller is `@stellar/freighter-api`, include `apiError` alongside
`error` for detailed diagnostics:

```typescript
return {
  error: "User declined",
  apiError: "User rejected the transaction request",
};
```

## Shared API Layer

The `sendMessageToBackground()` function is the only approved way to send
messages from the popup to the background. It is defined in
`@shared/api/helpers/extensionMessaging.ts` and re-exported from
`@shared/api/internal.ts`:

- Wraps `browser.runtime.sendMessage` with proper typing
- Handles response parsing and error extraction
- Never call `browser.runtime.sendMessage` directly from popup code
