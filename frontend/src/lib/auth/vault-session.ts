// Ephemeral in-memory storage for master key during active browser session
let cachedMasterKey: string | null = null;
let keyExpiryTime: number = 0;

export const vaultSession = {
  getKey: (): string | null => {
    if (cachedMasterKey && Date.now() < keyExpiryTime) {
      return cachedMasterKey;
    }
    cachedMasterKey = null;
    return null;
  },
  setKey: (key: string, durationMinutes = 15) => {
    cachedMasterKey = key;
    keyExpiryTime = Date.now() + durationMinutes * 60 * 1000;
  },
  clear: () => {
    cachedMasterKey = null;
    keyExpiryTime = 0;
  },
};
