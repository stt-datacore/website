import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from './en/translation.json';
import french from './fr/translation.json';
import german from './de/translation.json';
import spanish from './es/translation.json';

i18next.use(initReactI18next).init({  
  debug: true,
  fallbackLng: 'en',
  resources: {
    en: {
      translation: english,
    },
    de: {
      translation: german,
    },
    fr: {
      translation: french,
    },
    es: {
      translation: spanish,
    }
  },
  react: {
    useSuspense: false
  }
  // if you see an error like: "Argument of type 'DefaultTFuncReturn' is not assignable to parameter of type xyz"
  // set returnNull to false (and also in the i18next.d.ts options)
  // returnNull: false,
});