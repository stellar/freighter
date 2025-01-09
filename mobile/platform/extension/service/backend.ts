const serviceLayerTest = async () => {
  console.log("backend start");
  const response = await chrome.runtime.sendMessage("TEST_MESSAGE");
  console.log("backend end");
  console.log(response);
};

export default serviceLayerTest;
