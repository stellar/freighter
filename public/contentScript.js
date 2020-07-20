import { embedLyraApi } from "contentScript/helpers/embedLyraApi";
import { redirectMessagesToBackground } from "contentScript/helpers/redirectMessagesToBackground";

embedLyraApi();

redirectMessagesToBackground();
