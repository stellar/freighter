import { requestConnectionStatus } from "@shared/api/external";

export const isConnected = () => requestConnectionStatus();
