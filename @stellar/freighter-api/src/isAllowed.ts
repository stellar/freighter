import { requestAllowedStatus } from "@shared/api/external";

export const isAllowed = () => requestAllowedStatus();
