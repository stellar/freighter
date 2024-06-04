import * as Keychain from 'react-native-keychain';

export const KeyChain = {
  saveKey: async (publicKey: string, privateKey: string) => {
    try {
      await Keychain.setGenericPassword(publicKey, privateKey);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
  getKey: async () => {
    try {
      const credentials = await Keychain.getGenericPassword();
      return credentials;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
};
