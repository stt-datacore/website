import React from "react";
import { useStateWithStorage } from "../utils/storage";

interface TranslationProviderProps {
    children?: JSX.Element;
}

export type SupportedLanguage = 'en' | 'sp' | 'de' | 'fr';

export interface TranslationData {
    preferredLanguage: SupportedLanguage;
    setPreferredLanguage: (value: SupportedLanguage) => void;
}

const DefaultTranslationData: TranslationData = {
    preferredLanguage: 'en',
    setPreferredLanguage: () => false
}

export const TranslationContext = React.createContext(DefaultTranslationData);

function getBrowserLanguage(): SupportedLanguage {
    if (typeof window === 'undefined') return 'en';
    let lang = navigator.language.slice(0, 2).toLowerCase();
    switch (lang) {
        case 'en':
        case 'fr':
        case 'de':
            return lang;
        case 'es':
            return 'sp';
        default:
            return 'en';
    }
}

export const TranslationProvider = (props: TranslationProviderProps) => {
    const [preferredLanguage, setPreferredLanguage] = useStateWithStorage('language', getBrowserLanguage(), { rememberForever: true });
    const { children } = props;

    const translationData: TranslationData = {
        ... DefaultTranslationData,
        preferredLanguage,
        setPreferredLanguage
    }

    return <TranslationContext.Provider value={translationData}>
        {children}
    </TranslationContext.Provider>
}