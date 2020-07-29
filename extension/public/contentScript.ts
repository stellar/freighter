import { setIsConnected } from "contentScript/helpers/setIsConnected";
import { redirectMessagesToBackground } from "contentScript/helpers/redirectMessagesToBackground";

setIsConnected();
redirectMessagesToBackground();
