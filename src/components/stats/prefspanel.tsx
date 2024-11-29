import React from "react";
import { StatsContext } from "./statsmain";
import { Dropdown, DropdownItemProps } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { prettyObtained } from "../../utils/crewutils";
import { PlayerCrew } from "../../model/player";
import CONFIG from "../CONFIG";

export const StatsPrefsPanel = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const statsContext = React.useContext(StatsContext);
    const { skillKey, setSkillKey, obtainedFilter, setObtainedFilter, skoBuckets, uniqueObtained } = statsContext;

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        let sp = key.split(",").map(k => CONFIG.SKILLS[k]);
        while (sp.length < 3) sp.push('*')
        skillOpts.push({
            key: key,
            value: key,
            text: sp.join(" / "),
            content: <div>
                <div>{sp.join(" / ")}</div>
                <div className='ui segment' style={{backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>{skoBuckets[key].length}  {t('base.crewmen')}</div>
            </div>
        });
    });

    skillOpts.sort((a, b) => {
        let r = 0;
        if (!r) r = skoBuckets[b.key].length - skoBuckets[a.key].length;
        if (!r) r = (a.text! as string).localeCompare(b.text! as string);
        return r;
    })

    const obtainedOpts = [] as DropdownItemProps[];

    for (let obtained of uniqueObtained) {
        obtainedOpts.push({
            key: obtained,
            value: obtained,
            text: prettyObtained({ obtained } as PlayerCrew, t) || obtained
        })
    }

    return (<div style={{...flexRow, margin: '1em 0'}}>
        <div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
            <span>{t('global.obtained')}</span>
            <Dropdown
                placeholder={t('global.obtained')}
                selection
                clearable
                multiple
                value={obtainedFilter}
                options={obtainedOpts}
                onChange={(e, { value }) => setObtainedFilter(value as string[])}
                />
        </div>
        <div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
            <span>{t('quipment_dropdowns.mode.skill_order')}</span>
            <Dropdown
                placeholder={t('quipment_dropdowns.mode.skill_order')}
                selection
                clearable
                search
                value={skillKey}
                options={skillOpts}
                onChange={(e, { value }) => setSkillKey(value as string)}
                />
        </div>
    </div>)

}