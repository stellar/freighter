declare global {
  interface Window {
    lyra: boolean;
  }
}

export const isConnected = () => window.lyra;
