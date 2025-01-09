import * as SecureStore from "expo-secure-store";

const serviceLayerTest = async () => {
  const response = await SecureStore.getItemAsync("TEST_KEY");
  console.log(response);
};

export default serviceLayerTest;
