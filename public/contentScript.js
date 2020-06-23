import {
  embedLyraApi,
  redirectMessagesToBackground,
} from "contentScript/helpers";

embedLyraApi();

redirectMessagesToBackground();
