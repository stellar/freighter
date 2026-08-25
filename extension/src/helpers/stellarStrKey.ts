/**
 * Re-export of the shared StrKey scrubber. The implementation lives in
 * `@shared/helpers/stellarStrKey` so `@shared` code (which never imports from
 * `extension/src`) can redact StrKeys too — see `@shared/api/helpers/
 * redactErrorBody.ts`. Kept here so existing `helpers/stellarStrKey` imports
 * stay valid.
 */
export { scrubStrKeys } from "@shared/helpers/stellarStrKey";
