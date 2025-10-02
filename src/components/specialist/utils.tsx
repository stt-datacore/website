import React from "react";
import { GalaxyCrewCooldown, SpecialistMission, TranslateMethod } from "../../model/player";
import { OptionsPanelFlexRow } from "../stats/utils";
import CONFIG from "../CONFIG";
import { TraitNames } from "../../model/traits";
import { ISpecialistCrewConfig } from "./crewmodal";
import { Icon } from "semantic-ui-react";
import { IEventData, IRosterCrew } from "../eventplanner/model";
import { crewSpecialistBonus, calculateSpecialistTime } from "../../utils/events";

export function drawTraits(traits: string[], TRAIT_NAMES: TraitNames, style?: React.CSSProperties, iconSize = 24) {
    const flexRow = OptionsPanelFlexRow;

    const traitimg = traits.map((trait) => {
        let trait_icon = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
        return <div style={{...flexRow, alignItems: 'center', justifyContent: 'flex-start'}}>
            <img src={trait_icon} style={{height: `${iconSize}px`}} />
            {TRAIT_NAMES[trait]}
        </div>
    });

    const traitcontent = [] as React.JSX.Element[];

    for (let img of traitimg) {
        traitcontent.push(img);
    }

    if (style) {
        return <div style={style}>{traitcontent}</div>
    }
    return traitcontent
}

export function drawSkills(skills: string[], t: TranslateMethod, combo?: 'and' | 'or', names?: boolean, style?: React.CSSProperties, iconSize = 24) {

    const flexRow = OptionsPanelFlexRow;

    const combo_txt = (() => {
        let txt = '';
        if (combo === 'and') {
            txt = t('global.and');
        }
        else if (combo === 'or') {
            txt = t('global.or');
        }
        txt = txt.toLocaleUpperCase();
        return txt;
    })();

    const skillimg = skills.map((skill) => {
        let skill_icon = `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`;
        return <div title={CONFIG.SKILLS[skill]} style={{...flexRow, alignItems: 'center', justifyContent: 'center'}}>
            <img src={skill_icon} style={{width: `${iconSize}px`}} />
            {!!names && <span>{CONFIG.SKILLS[skill]}</span>}
        </div>
    });

    const skillcontent = [] as React.JSX.Element[];

    for (let img of skillimg) {
        if (skillcontent.length) skillcontent.push(<div style={{width: `${iconSize}px`}}>{combo_txt}</div>);
        skillcontent.push(img);
    }
    if (style) {
        return <div style={style}>{skillcontent}</div>
    }
    return skillcontent

}

export function printOnShuttle(t: TranslateMethod, colon = false) {
    return <React.Fragment>
        <Icon name='space shuttle' />
        {t('base.on_shuttle')}{!!colon && t('global.colon')}
    </React.Fragment>
}

export function printOnVoyage(t: TranslateMethod, colon = false) {
    return <React.Fragment>
        <Icon name='rocket' />
        {t('base.on_voyage')}{!!colon && t('global.colon')}
    </React.Fragment>
}

export function printOnCooldown(t: TranslateMethod, cooldown: GalaxyCrewCooldown, colon = false) {

    const seconds = (cooldown.disabled_until.getTime() - Date.now()) / 1000;
    if (seconds < 0) return <></>;
    let minutes = Math.round(seconds / 60);
	let hours = Math.floor(minutes / 60);

	minutes = Math.ceil(minutes - (hours * 60));

    return <React.Fragment>
        <Icon name='time' />
        {t('ship.cooldown')}{!!colon && t('global.colon')}
        <div style={{margin: '0.5em 0'}}>
            {t('duration.n_h', { hours })}
            {' '}
            {t('duration.n_m', { minutes })}
        </div>
    </React.Fragment>
}


export function defaultSpecialistSort(crew: ISpecialistCrewConfig[]) {
    return crew.sort((a, b) => {
        return -1 * defaultSpecialistCompare(a, b);
    });
}

export function defaultSpecialistCompare(a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) {
    let r = a.duration.total_minutes - b.duration.total_minutes;
    if (!r) r = b.bonus - a.bonus;
    if (!r) r = b.matched_skills.map(ms => b.crew[ms].core).reduce((p, n) => p > n ? p : n, 0) -
        a.matched_skills.map(ms => a.crew[ms].core).reduce((p, n) => p > n ? p : n, 0)
    if (!r) r = b.matched_traits.length - a.matched_traits.length;
    return r;
}

export function specialistRosterAutoSort(crew: IRosterCrew[], eventData: IEventData, mission: SpecialistMission, preferBonus: boolean) {
    return crew.sort((a, b) => {
        let r = 0;
        let dur = 0;
        let bonus = crewSpecialistBonus(b, eventData) - crewSpecialistBonus(a, eventData);

        const dura = calculateSpecialistTime(a, eventData, mission);
        const durb = calculateSpecialistTime(b, eventData, mission);

        if (!dura && !durb) dur = 0;
        else if (!dura && !!durb) dur = -1;
        else if (!!dura && !durb) dur = 1;

        if (dur) return dur;
        if (dura && durb) dur = dura.total_minutes - durb.total_minutes;

        if (preferBonus) {
            r = bonus ? bonus : dur;
        }
        else {
            r = dur ? dur : bonus;
        }
        if (!r) r = mission.requirements.map(ms => b[ms].core).reduce((p, n) => p > n ? p : n, 0) -
            mission.requirements.map(ms => a[ms].core).reduce((p, n) => p > n ? p : n, 0)
        if (!r) {
            let at = a.traits.filter(trait => mission.bonus_traits.includes(trait)).length;
            let bt = b.traits.filter(trait => mission.bonus_traits.includes(trait)).length;
            r = bt - at;
        }
        return r;
    });
}