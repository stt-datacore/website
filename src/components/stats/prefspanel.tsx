import React from "react";
import { StatsContext } from "./dataprovider";
import { Dropdown, DropdownItemProps, Form } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { prettyObtained } from "../../utils/crewutils";
import { PlayerCrew } from "../../model/player";
import CONFIG from "../CONFIG";
import { GameEpoch, OptionsPanelFlexColumn, OptionsPanelFlexRow } from "./utils";
import { RarityFilter } from "../crewtables/commonoptions";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

export const StatsPrefsPanel = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const statsContext = React.useContext(StatsContext);
    const { filterConfig, setFilterConfig, skoBuckets, uniqueObtained } = statsContext;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        let sp = key.split(",").map(k => CONFIG.SKILLS[k]);
        skillOpts.push({
            key: key,
            value: key,
            text: sp.join(" / "),
            content: <div>
                <div>{sp.join(" / ")}</div>
                <div className='ui segment' style={{ backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>
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

    const skillPos = ['primary', 'secondary', 'tertiary'];

    const startYear = GameEpoch.getUTCFullYear();
    const endYear = (new Date()).getUTCFullYear();
    const yearOpts = [] as DropdownItemProps[];
    for (let y = startYear; y <= endYear; y++) {
        yearOpts.push({
            key: `year_${y}`,
            value: y,
            text: y.toString()
        });
    }

    return (
        <div>
            <div style={{ ...flexRow, margin: '1em 0', flexWrap: 'wrap' }}>
                <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>{t('global.obtained')}</span>
                    <Dropdown
                        placeholder={t('global.obtained')}
                        selection
                        clearable
                        multiple
                        value={filterConfig.obtainedFilter || []}
                        options={obtainedOpts}
                        onChange={(e, { value }) => setFilterConfig({ ...filterConfig, obtainedFilter: (value || []) as string[] })}
                    />
                </div>
                <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>{t('base.rarity')}</span>
                    <RarityFilter multiple rarityFilter={filterConfig.rarity} setRarityFilter={(r) => setFilterConfig({ ...filterConfig, rarity: r ?? [] })} />
                </div>

                {skillPos.map((pos, pos_idx) => {
                    const available = filterConfig[`avail_${pos}`] as string[];
                    const availopts = [] as DropdownItemProps[];
                    if (pos_idx && filterConfig[skillPos[pos_idx - 1]].length) {
                        availopts.push({
                            key: 'none',
                            value: '',
                            text: t('global.none')
                        })
                    }
                    available?.forEach((key) => {
                        let total = filterConfig[`${pos}_totals`][key] ?? 0;
                        let textparts = CONFIG.SKILLS[key];

                        availopts.push({
                            key: key,
                            value: key,
                            text: textparts,
                            total,
                            content: <div>
                                <div>{textparts}</div>
                                <div className='ui segment' style={{ backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>
                                    {total}  {t('base.crewmen')}
                                </div>
                            </div>
                        });
                    });

                    availopts?.sort((a, b) => a.key === 'none' ? -1 : b.key === 'none' ? 1 : (a.text as string).localeCompare(b.text as string));
                    const curropts = filterConfig[pos]?.length ? filterConfig[pos] : undefined;

                    return (<div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
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
                                    setFilterConfig({ ...filterConfig, [pos]: [] })
                                }
                                else {
                                    setFilterConfig({ ...filterConfig, [pos]: value })
                                }
                            }}
                        />
                    </div>)

                })}
            </div>
            <div style={{...flexRow, flexWrap: 'wrap'}}>
                <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>{t('global.date_start')}</span>
                    <Form.Input
                        style={{minWidth: !isMobile ? '14.25em' : undefined}}
                        type='date'
                        value={filterConfig.start_date}
                        onChange={(e, { value }) => setFilterConfig({ ...filterConfig, start_date: value })}
                    />
                </div>
                <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>{t('global.date_end')}</span>
                    <Form.Input
                        style={{minWidth: !isMobile ? '14.25em' : undefined}}
                        clearable
                        type='date'
                        value={filterConfig.end_date}
                        onChange={(e, { value }) => setFilterConfig({ ...filterConfig, end_date: value })}
                    />
                </div>
                <div style={{ ...flexCol, alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>{t('cite_opt.btp.settings_picker.button_text')}</span>
                    <Dropdown
                            placeholder={t(`cite_opt.btp.settings_picker.button_text`)}
                            selection
                            clearable
                            value={getSelYear()}
                            options={yearOpts}
                            onChange={(e, { value }) => {
                                setSelYear(value as number)
                            }}
                        />
                </div>
            </div>
        </div>)

        function getSelYear() {
            if (filterConfig.start_date && filterConfig.end_date) {
                let d1 = new Date(filterConfig.start_date + "T00:00:00Z");
                let d2 = new Date(filterConfig.end_date + "T00:00:00Z");
                if (d1.getUTCFullYear() === d2.getUTCFullYear()
                    && d1.getUTCMonth() === 0 && d2.getUTCMonth() === 11
                    && d1.getUTCDate() === 1 && d2.getUTCDate() === 31
                ) {
                    return d1.getUTCFullYear();
                }
            }
            return undefined
        }

        function setSelYear(year?: number) {
            if (!year) {
                if (filterConfig.end_date || filterConfig.start_date) {
                    setFilterConfig({
                        ...filterConfig,
                        start_date: '',
                        end_date: ''
                    });
                }
            }
            else {
                setFilterConfig({
                    ...filterConfig,
                    start_date: `${year}-01-01`,
                    end_date: `${year}-12-31`
                });
            }
        }

}