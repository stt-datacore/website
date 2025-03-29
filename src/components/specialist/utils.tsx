import React from "react";
import { TranslateMethod } from "../../model/player";
import { OptionsPanelFlexRow } from "../stats/utils";
import CONFIG from "../CONFIG";
import { TraitNames } from "../../model/traits";


export function drawTraits(traits: string[], TRAIT_NAMES: TraitNames, style?: React.CSSProperties, iconSize = 24) {
    const flexRow = OptionsPanelFlexRow;

    const traitimg = traits.map((trait) => {
        let trait_icon = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
        return <div style={{...flexRow, alignItems: 'center', justifyContent: 'flex-start'}}>
            <img src={trait_icon} style={{height: `${iconSize}px`}} />
            {TRAIT_NAMES[trait]}
        </div>
    });

    const traitcontent = [] as JSX.Element[];

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

    const skillcontent = [] as JSX.Element[];

    for (let img of skillimg) {
        if (skillcontent.length) skillcontent.push(<div style={{width: `${iconSize}px`}}>{combo_txt}</div>);
        skillcontent.push(img);
    }
    if (style) {
        return <div style={style}>{skillcontent}</div>
    }
    return skillcontent

}