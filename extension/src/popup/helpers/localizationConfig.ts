import i18n, { CallbackError, ResourceKey } from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

i18n
  .use(
    resourcesToBackend((language, namespace, callback) => {
      import(`../locales/${language}/${namespace}.json`)
        .then((resources) => {
          callback(
            null as CallbackError,
            resources as boolean | ResourceKey | null | undefined,
          );
        })
        .catch((error) => {
          callback(
            error as CallbackError,
            null as boolean | ResourceKey | null | undefined,
          );
        });
    }),
  )
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
  });

export default i18n;
