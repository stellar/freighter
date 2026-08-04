import { StrKey } from "stellar-sdk";
import {
  SorobanDomainsSDK,
  Domain as SorobanDomainRecord,
} from "@creit-tech/sorobandomains-sdk";
import { captureException } from "@sentry/browser";
import i18n from "popup/helpers/localizationConfig";
import { isContractId } from "@shared/api/helpers/soroban";
import { NetworkDetails } from "@shared/constants/stellar";
import { SOROBAN_DOMAINS_REGISTRY_CONTRACT_ID } from "popup/constants/sorobanDomains";

/**
 * Resolves a Soroban Domain (e.g. "jhon.xlm") to the address it points to.
 * Always uses Freighter's own configured Soroban RPC - never falls back to
 * the SDK's default third-party RPC (rpc.lightsail.network).
 */
export const resolveSorobanDomain = async (
  domain: string,
  networkDetails: NetworkDetails,
): Promise<{ address: string; domain: string }> => {
  const normalizedDomain = domain.toLowerCase();

  try {
    if (!networkDetails.sorobanRpcUrl) {
      throw new Error("No Soroban RPC configured for this network");
    }

    const sdk = new SorobanDomainsSDK({
      rpcUrl: networkDetails.sorobanRpcUrl,
      // Bridges Freighter's own stellar-sdk Networks enum value to the SDK's
      // independently-bundled copy of the same enum - the underlying value is
      // the same network passphrase string in both.
      network: networkDetails.networkPassphrase as any,
      registryContractId: SOROBAN_DOMAINS_REGISTRY_CONTRACT_ID,
    });

    const record = await sdk.searchDomain<SorobanDomainRecord>(
      normalizedDomain,
    );

    if (
      !StrKey.isValidEd25519PublicKey(record.address) &&
      !isContractId(record.address)
    ) {
      throw new Error("Soroban Domains registry returned an invalid address");
    }

    return { address: record.address, domain: normalizedDomain };
  } catch (err) {
    // Capture the real cause for Sentry, but never surface contract/simulation
    // error details to the user - same convention as federationMemo.ts.
    captureException(err);
    throw new Error(i18n.t("Failed to resolve Soroban Domain"));
  }
};
