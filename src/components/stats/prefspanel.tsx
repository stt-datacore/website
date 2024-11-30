import React from "react";
import { StatsContext } from "./dataprovider";
import { Dropdown, DropdownItemProps } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { prettyObtained } from "../../utils/crewutils";
import { PlayerCrew } from "../../model/player";
import CONFIG from "../CONFIG";
import { filterBuckets } from "./utils";

export const StatsPrefsPanel = () => {
    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt } = globalContext.localized;
    const statsContext = React.useContext(StatsContext);
    const { filterConfig, setFilterConfig, obtainedFilter, setObtainedFilter, skoBuckets, uniqueObtained } = statsContext;

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        let sp = key.split(",").map(k => CONFIG.SKILLS[k]);
        //while (sp.length < 3) sp.push('*')
        skillOpts.push({
            key: key,
            value: key,
            text: sp.join(" / "),
            content: <div>
                <div>{sp.join(" / ")}</div>
                <div className='ui segment' style={{backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>
                    {skoBuckets[key].length}  {t('base.crewmen')}
                </div>
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

    const buckets = filterBuckets(filterConfig, skoBuckets);

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

        {['primary', 'secondary', 'tertiary'].map((pos, pos_idx) => {
            const available = filterConfig[`available_${pos}`] as string[];
            const availopts = [] as DropdownItemProps[];

            available.forEach((key) => {
                let total = filterConfig[`${pos}_totals`][key] ?? 0;
                let textparts = CONFIG.SKILLS[key];
                //while (sp.length < 3) sp.push('*')
                availopts.push({
                    key: key,
                    value: key,
                    text: textparts,
                    total,
                    content: <div>
                        <div>{textparts}</div>
                        <div className='ui segment' style={{backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>
                            {total}  {t('base.crewmen')}
                        </div>
                    </div>
                });
            });

            //availopts.sort((a, b) => b.total - a.total);
            availopts.sort((a, b) => (a.text as string).localeCompare(b.text as string));
            const curropts = filterConfig[pos]?.length ? filterConfig[pos] : undefined;

            return (<div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
                <span>{t(`quipment_ranks.${pos}`)}</span>
                <Dropdown
                    placeholder={t(`quipment_ranks.${pos}`)}
                    selection
                    clearable
                    search
                    multiple
                    value={curropts}
                    options={availopts}
                    onChange={(e, { value }) => {
                        if (value === undefined) {
                            setFilterConfig({...filterConfig, [pos]: [] })
                        }
                        else {
                            setFilterConfig({...filterConfig, [pos]: value })
                        }
                    }}
                    />
            </div>)

        })}
        {/* <div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
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
        </div> */}
    </div>)

}