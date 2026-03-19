import React from "react";
import { object as YupObject, string as YupString } from "yup";
import { Federation } from "stellar-sdk";

import {
  isValidStellarAddress,
  isFederationAddress,
  isValidFederatedDomain,
} from "helpers/stellar";

export const FEDERATION_TIMEOUT_MS = 10_000;
export const NAME_MAX_LENGTH = 32;

// Strip bidi control characters and zero-width characters that enable visual
// spoofing — critical in a wallet context where contact names guide sends.
const BIDI_AND_ZW_RE = /[\u200B-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD]/g;

export const sanitizeName = (value: string) =>
  value.replace(BIDI_AND_ZW_RE, "");

/**
 * Resolves a federation address with a hard timeout and AbortController support.
 */
export const resolveFederationAddress = (
  address: string,
  signal?: AbortSignal,
) =>
  Promise.race([
    Federation.Server.resolve(address),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Federation resolution timed out")),
        FEDERATION_TIMEOUT_MS,
      );
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      });
    }),
  ]);

// ---------------------------------------------------------------------------
// Contact form validation schema
// ---------------------------------------------------------------------------

interface ContactsMapEntry {
  name: string;
  resolvedAddress?: string;
}

type ContactsMap = Record<string, ContactsMapEntry>;

/** Mutable refs the schema reads/writes during async federation validation. */
export interface FederationRefs {
  resolvedAddress: React.RefObject<string | undefined>;
  lastResolvedInput: React.RefObject<string | undefined>;
  federationFailed: React.RefObject<boolean>;
  hasAddressBlurred: React.RefObject<boolean>;
  activeField: React.RefObject<string | null>;
  abortController: React.RefObject<AbortController | null>;
  isMounted: React.RefObject<boolean>;
}

export interface ContactFormSchemaConfig {
  t: (key: string) => string;
  existingContacts: ContactsMap;
  refs: FederationRefs;
  setIsFetchingFederationAddress: (fetching: boolean) => void;
}

export const createContactFormSchema = ({
  t,
  existingContacts,
  refs,
  setIsFetchingFederationAddress,
}: ContactFormSchemaConfig) =>
  YupObject().shape({
    address: YupString()
      .required(t("Invalid Stellar address"))
      .trim()
      .test("is-valid-stellar-address", t("Invalid Stellar address"), (val) => {
        if (!val) return false;
        const trimmed = val.trim();
        if (isFederationAddress(trimmed)) {
          return isValidFederatedDomain(trimmed);
        }
        return isValidStellarAddress(trimmed);
      })
      .test(
        "is-not-federation-failure",
        t("Failed to resolve federated address"),
        async (val) => {
          if (!val) return true;
          const trimmed = val.trim();

          if (!isFederationAddress(trimmed)) {
            refs.resolvedAddress.current = undefined;
            refs.lastResolvedInput.current = undefined;
            refs.federationFailed.current = false;
            return true;
          }

          if (
            !refs.hasAddressBlurred.current ||
            refs.activeField.current !== "address"
          )
            return !refs.federationFailed.current;

          if (refs.lastResolvedInput.current === trimmed) {
            return refs.resolvedAddress.current !== undefined;
          }

          refs.abortController.current?.abort();
          const controller = new AbortController();
          refs.abortController.current = controller;

          if (refs.isMounted.current) {
            setIsFetchingFederationAddress(true);
          }

          try {
            const fedResp = await resolveFederationAddress(
              trimmed,
              controller.signal,
            );

            if (controller.signal.aborted) return true;

            refs.resolvedAddress.current = fedResp.account_id;
            refs.lastResolvedInput.current = trimmed;
            refs.federationFailed.current = false;
            return true;
          } catch {
            if (controller.signal.aborted) return true;
            refs.resolvedAddress.current = undefined;
            refs.lastResolvedInput.current = undefined;
            refs.federationFailed.current = true;
            return false;
          } finally {
            if (refs.isMounted.current) {
              setIsFetchingFederationAddress(false);
            }
          }
        },
      )
      .test(
        "is-not-duplicate-address",
        t("This address already exists in your contacts"),
        (val) => {
          if (!val) return true;
          const trimmed = val.trim();

          const rawDuplicate = Object.keys(existingContacts).some(
            (key) => key.toLowerCase() === trimmed.toLowerCase(),
          );
          if (rawDuplicate) return false;

          const resolved = refs.resolvedAddress.current;
          if (resolved && refs.lastResolvedInput.current === trimmed) {
            const resolvedLower = resolved.toLowerCase();
            return !Object.entries(existingContacts).some(
              ([key, contact]) =>
                key.toLowerCase() === resolvedLower ||
                contact.resolvedAddress?.toLowerCase() === resolvedLower,
            );
          }
          return true;
        },
      ),
    name: YupString()
      .required(t("Name cannot be empty"))
      .trim()
      .max(NAME_MAX_LENGTH, t("Name is too long"))
      .test(
        "is-not-duplicate-name",
        t("This name already exists in your contacts"),
        (val) => {
          if (!val) return true;
          const sanitized = sanitizeName(val.trim());
          return !Object.values(existingContacts).some(
            (c) => c.name.toLowerCase() === sanitized.toLowerCase(),
          );
        },
      ),
  });
