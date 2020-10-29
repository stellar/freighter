declare global {
  interface Window {
    freighter: boolean;
  }
}

export const isConnected = () => !!window.freighter;
