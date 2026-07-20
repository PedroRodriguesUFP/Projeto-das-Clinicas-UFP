import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import common from "./locales/common.json";

const savedLanguage = localStorage.getItem("language") || "pt";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: {
        translation: {
          ...common,
          ...pt,
        },
      },
      en: {
        translation: {
          ...common,
          ...en,
        },
      },
      fr: {
        translation: {
          ...common,
          ...fr,
        },
      },
    },
    lng: savedLanguage,
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;