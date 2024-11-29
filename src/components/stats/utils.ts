import { TranslateMethod } from "../../model/player";
import { Highs } from "./model";

export function findHigh(epoch_day: number, skills: string[], data: Highs[], day_only = false) {
    let ssj = skills.join();
    data.sort((a, b) => b.epoch_day - a.epoch_day);
    return data.find(f => f.epoch_day <= epoch_day && (day_only || f.skills.join() === ssj));
}

export function skillIcon(skill: string) {
    return `${process.env.GATSBY_ASSETS_URL}/atlas/icon_${skill}.png`;
}

export function formatElapsedDays(days: number, t: TranslateMethod): string {

    let fmt = '';
    let val = 0;
    let varname = '';

    if (days <= 14) {
        val = Math.round(days);
        fmt = `duration.n_day${val > 1 ? 's' : ''}`;
        varname = 'days';
    }
    else if (days <= 28) {
        val = Number(Math.round(days / 7).toFixed(1));
        fmt = `duration.n_week${val > 1 ? 's' : ''}`;
        varname = 'weeks';
    }
    else if (days < 365) {
        let d1 = new Date();
        let d2 = new Date();
        d2.setDate(d2.getDate() - days);
        if (d1.getFullYear() === d2.getFullYear()) {
            val = d1.getMonth() - d2.getMonth();
        }
        else {
            val = d1.getMonth() + (12 - d2.getMonth());
        }
        fmt = `duration.n_month${val > 1 ? 's' : ''}`;
        varname = 'months';
    }
    else {
        val = Number((days / 365).toFixed(1));
        fmt = `duration.n_year${val > 1 ? 's' : ''}`;
        varname = 'years';
    }

    return t(fmt, { [varname]: `${val}` });
}