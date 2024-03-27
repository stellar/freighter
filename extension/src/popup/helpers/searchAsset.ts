import { captureException } from "@sentry/browser";
import { NetworkDetails, NETWORKS } from "@shared/constants/stellar";
import { AssetsLists, AssetsListKey } from "@shared/constants/soroban/token";
import { getApiStellarExpertUrl } from "popup/helpers/account";

export const searchAsset = async ({
  asset,
  networkDetails,
  onError,
}: {
  asset: any;
  networkDetails: NetworkDetails;
  onError: (e: any) => void;
}) => {
  try {
    const res = await fetch(
      `${getApiStellarExpertUrl(networkDetails)}/asset?search=${asset}`,
    );
    return await res.json();
  } catch (e) {
    return onError(e);
  }
};

export const getNativeContractDetails = (networkDetails: NetworkDetails) => {
  const NATIVE_CONTRACT_DEFAULTS = {
    code: "XLM",
    decimals: 7,
    domain: "https://stellar.org",
    icon: "",
    org: "",
  };
  switch (networkDetails.network as keyof typeof NETWORKS) {
    case NETWORKS.PUBLIC:
      return {
        ...NATIVE_CONTRACT_DEFAULTS,
        contract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
        issuer: "GDMTVHLWJTHSUDMZVVMXXH6VJHA2ZV3HNG5LYNAZ6RTWB7GISM6PGTUV",
      };
    case NETWORKS.TESTNET:
      return {
        ...NATIVE_CONTRACT_DEFAULTS,
        contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        issuer: "",
      };
    default:
      return { ...NATIVE_CONTRACT_DEFAULTS, contract: "", issuer: "" };
  }
};

export interface TokenRecord {
  code: string;
  issuer: string;
  contract: string;
  org: string;
  domain: string;
  icon: string;
  decimals: number;
}

export type VerifiedTokenRecord = TokenRecord & { verifiedLists: string[] };

export const getVerifiedTokens = async ({
  networkDetails,
  contractId,
  setIsSearching,
  assetsLists,
}: {
  networkDetails: NetworkDetails;
  contractId: string;
  setIsSearching?: (isSearching: boolean) => void;
  assetsLists: AssetsLists;
}) => {
  const networkLists = assetsLists[networkDetails.network as AssetsListKey];
  const promiseArr = [];

  const nativeContract = getNativeContractDetails(networkDetails);

  if (contractId === nativeContract.contract) {
    return [{ ...nativeContract, verifiedLists: [] }];
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const networkList of networkLists) {
    const { url = "" } = networkList;

    const fetchAndParse = async () => {
      let res;
      try {
        res = await fetch(url);
      } catch (e) {
        captureException(`Failed to load asset list: ${url}`);
      }

      return res?.json();
    };

    promiseArr.push(fetchAndParse());
  }

  const promiseRes = await Promise.allSettled(promiseArr);
  if (setIsSearching) {
    setIsSearching(false);
  }

  const verifiedTokens = [] as VerifiedTokenRecord[];

  let verifiedToken = {} as TokenRecord;
  const verifiedLists: string[] = [];

  promiseRes.forEach((r) => {
    if (r.status === "fulfilled") {
      const list = r.value?.tokens ? r.value?.tokens : r.value?.assets;
      if (list) {
        list.forEach((record: TokenRecord) => {
          const regex = new RegExp(contractId, "i");
          if (record.contract && record.contract.match(regex)) {
            verifiedToken = record;
            verifiedLists.push(r.value.name as string);
          }
        });
      }
    }
  });

  if (Object.keys(verifiedToken).length) {
    verifiedTokens.push({
      ...verifiedToken,
      verifiedLists,
    });
  }

  return verifiedTokens;
};
