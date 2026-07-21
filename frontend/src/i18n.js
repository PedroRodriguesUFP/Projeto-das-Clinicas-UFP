import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import commonPt from "./locales/common.json";

const common = {
  pt: commonPt,
  en: {
    confirm: 'Confirm', cancel: 'Cancel', loading: 'Loading...', email: 'Email',
    phone: 'Phone', address: 'Address', search: 'Search', yes: 'Yes', no: 'No',
    ok: 'OK', never: 'Never',
  },
  fr: {
    confirm: 'Confirmer', cancel: 'Annuler', loading: 'Chargement...', email: 'E-mail',
    phone: 'Téléphone', address: 'Adresse', search: 'Rechercher', yes: 'Oui', no: 'Non',
    ok: 'OK', never: 'Jamais',
  },
};

const supportedLanguages = ['pt', 'en', 'fr'];
const savedLanguage = typeof window === 'undefined' ? null : localStorage.getItem('language');
const browserLanguage = typeof navigator === 'undefined' ? 'pt' : navigator.language.split('-')[0];
const language = supportedLanguages.includes(savedLanguage)
  ? savedLanguage
  : supportedLanguages.includes(browserLanguage) ? browserLanguage : 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: {
        translation: {
          ...common.pt,
          ...pt,
        },
      },
      en: {
        translation: {
          ...common.en,
          ...en,
        },
      },
      fr: {
        translation: {
          ...common.fr,
          ...fr,
        },
      },
    },
    lng: language,
    fallbackLng: "pt",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (nextLanguage) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', nextLanguage);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = nextLanguage;
  }
});

export default i18n;
