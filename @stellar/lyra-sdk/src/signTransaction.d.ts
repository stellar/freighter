import { ExternalRequest } from "@lyra/api/types";
export declare const signTransaction: (params: ExternalRequest) => Promise<{
    transactionStatus: string;
    error: string;
}>;
