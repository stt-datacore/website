import { ICoreData } from "../../context/coremodel";
import { TranslateMethod } from "../../model/player";
import { getIconPath } from "../../utils/assets";
import { GameEpoch } from "./utils";

export function calcReleaseVague(min: number, max: number) {
    let d = new Date(GameEpoch);
    let dn = ((max - min) / 4) + 91;
    d.setDate(d.getDate() + dn);
    return d;
}

export function calcRelease(number: number, items: { id: number, date: Date }[]) {
    let n = -1;
    let nidx = -1;
    let i = 0;
    for (let item of items) {
        if (item.id > number) break;
        let z = number - item.id;
        if (z >= 0 && (n === -1 || z < n)) {
            n = z;
            nidx = i;
        }
        i++;
    }
    if (n < 0 || nidx < 0) return new Date(GameEpoch);
    let d = new Date(items[nidx].date);
    d.setHours(d.getHours() - ((number - n) / 40));
    return d;
}

export function colSpecialDate(c: string) {
    let reg = /^([a-z]+)(\d+)$/;
    if (reg.test(c)) {
        let res = reg.exec(c);
        if (res && res[2].length === 4) {
            return new Date(`${res[1]} ${res[2]}`);
        }
    }
    return null;
}

export function getItemDateEstimates(core: ICoreData, t: TranslateMethod) {
    const { crew, items, keystones } = core;
    let work = [...crew];
    work.sort((a, b) => a.date_added.getTime() - b.date_added.getTime() || a.archetype_id - b.archetype_id || (a.name_english || a.name).localeCompare(b.name_english ?? b.name));
    let crewitems = crew.map(c => {
        let symbol = c.equipment_slots.findLast(f => f.level >= 99)?.symbol ?? '';
        let item = core.items.find(f => f.symbol === symbol);
        if (item) {
            return {
                id: Number(item.id),
                date: c.date_added
            }
        }
        else return {
            id: 0,
            date: new Date()
        }
    }).filter(f => f.id).sort((a, b) => a.id - b.id);
    const quipment = items.filter(item => item.type === 14);
    let workstones = [...keystones];
    let workquip = [...quipment];
    workstones.sort((a, b) => a.id - b.id);
    workquip.sort((a, b) => Number(a.id || a.archetype_id) - Number(b.id || b.archetype_id));

    const quips = {} as { [key: string]: Date }
    const stones = {} as { [key: string]: Date }
    const stoneicons = {} as { [key: string]: string }
    const min = workstones[0].id;
    workstones.forEach((ks) => {
        if (ks.symbol.endsWith("_crate")) return;
        let key = ks.symbol.replace("_keystone", "");
        let d = calcReleaseVague(min, Number(ks.id));
        if (d.getUTCFullYear() >= 2022) d = calcRelease(Number(ks.id), crewitems);
        if (d.getUTCFullYear() === 2016) d = new Date(GameEpoch);
        stones[key] = d;
        stoneicons[key] = getIconPath(ks.icon);
    });
    workquip.forEach((qp) => {
        let d = calcReleaseVague(min, Number(qp.id || qp.archetype_id));
        let key = qp.symbol;
        if (d.getUTCFullYear() >= 2022) d = calcRelease(Number(qp.id || qp.archetype_id), crewitems);
        if (d.getUTCFullYear() === 2016) d = new Date(GameEpoch);
        quips[key] = d;
    });
    // console.log("Quipment Dates --------------------------------------------------------------------------");
    // let qo = Object.entries(quips).map(([symbol, date]) => ({ symbol, date }));
    // qo.sort((a, b) => a.date.getTime() - b.date.getTime());
    // let strs = [] as string[];
    // qo.forEach((quip) => {
    //     let qp = quipment.find(f => f.symbol === quip.symbol)!;
    //     strs.push(`${qp.name.padEnd(50, " ")}: ${approxDate(quip.date, t)}  (Est: ${quip.date.toLocaleDateString()})`);
    // });
    // console.log(strs.join("\n"))
    return { work, stones, quips, stoneicons };
}

export function approxDate(d: Date, t: TranslateMethod) {
    if (d.getTime() === GameEpoch.getTime()) return t('global.initial_launch');
    let m = (d.getUTCMonth() + 1);
    if (m <= 3) return `${t('global.approx')} ${t('global.quarter_short')}1 ${d.getUTCFullYear()}`;
    if (m <= 6) return `${t('global.approx')} ${t('global.quarter_short')}2 ${d.getUTCFullYear()}`;
    if (m <= 9) return `${t('global.approx')} ${t('global.quarter_short')}3 ${d.getUTCFullYear()}`;
    return `${t('global.approx')} ${t('global.quarter_short')}4 ${d.getUTCFullYear()}`;
}

