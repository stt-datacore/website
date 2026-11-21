import { ILocalizedData } from "../../context/localizedcontext";

export function useLocaleDate(config: ILocalizedData) {
    const lang = config.language === 'sp' ? 'es' : config.language;
    const localeDate = (date: Date, format?: string): string => {
        try {
            return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(date))
        }
        catch {
            return "";
        }
    }

    return localeDate;
}