import React from "react";

import serviceLayerTest from "@/platform/service";
import Button from "@/components/ui/Button";

export default function RootLayout() {
  React.useEffect(() => {
    console.log("runing effect");
    console.log(serviceLayerTest);
    serviceLayerTest();
    console.log("effect done");
  }, []);

  return <Button />;
}
