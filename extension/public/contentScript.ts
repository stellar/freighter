import { redirectMessagesToBackground } from "contentScript/helpers/redirectMessagesToBackground";
import { setIsConnected } from "contentScript/helpers/setIsConnected";

redirectMessagesToBackground();
setIsConnected();
