import React from "react";
import { TranslateMethod } from "../../model/player";
import { OptionsPanelFlexRow } from "../stats/utils";
import CONFIG from "../CONFIG";




export function drawSkills(skills: string[], t: TranslateMethod, combo?: 'and' | 'or') {

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
            <img src={skill_icon} style={{width: '24px'}} />
        </div>
    });

    const skillcontent = [] as JSX.Element[];

    for (let img of skillimg) {
        if (skillcontent.length) skillcontent.push(<div style={{width: '24px'}}>{combo_txt}</div>);
        skillcontent.push(img);
    }

    return <>{skillcontent}</>

}