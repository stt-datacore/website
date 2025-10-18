import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';
import { ILocalizedData } from "../../context/localizedcontext";

export function useLocaleDate(config: ILocalizedData) {
    const lang = config.language === 'sp' ? 'es' : config.language;
    const localeDate = (date: Date, format?: string): string =>
        moment(date).locale(lang).format(format);

    return localeDate;
}