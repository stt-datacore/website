import React from "react";
import { OwnedStatus } from "../../model/gauntlets"
import { GauntletContext } from "./dataprovider";
import { Dropdown, Checkbox, DropdownItemProps } from "semantic-ui-react";
import { PlayerBuffMode } from "../../model/player";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GlobalContext } from "../../context/globalcontext";
import CONFIG from "../CONFIG";
import { BuffNames } from "../item_presenters/crew_preparer";

export const GauntletPrefsPanel = () => {
    const globalContext = React.useContext(GlobalContext);
    const gauntletContext = React.useContext(GauntletContext);
    const { config, setConfig, viewMode, pane, tops, setTops } = gauntletContext;

    const { playerData, buffConfig } = globalContext.player;
    const hasPlayer = !!playerData;
    const dbid = hasPlayer ? `${playerData.player.dbid}/` : '';
    const { t, tfmt } = globalContext.localized;

    const maxBuffs = globalContext.maxBuffs;

    const availBuffs = [] as { key: string | number, value: string | number, text: string, content?: JSX.Element }[];
    const filterOptions = hasPlayer ? [
        { key: 'any', value: 'any', text: t('gauntlet.owned_status.any') },
        { key: 'maxall', value: 'maxall', text: t('gauntlet.owned_status.maxall') },
        { key: 'owned', value: 'owned', text: t('gauntlet.owned_status.owned') },
        { key: 'ownedmax', value: 'ownedmax', text: t('gauntlet.owned_status.ownedmax') },
        { key: 'fe', value: 'fe', text: t('gauntlet.owned_status.fe') },
        { key: 'nofe', value: 'nofe', text: t('gauntlet.owned_status.nofe') },
        { key: 'nofemax', value: 'nofemax', text: t('gauntlet.owned_status.nofemax') },
        { key: 'unfrozen', value: 'unfrozen', text: t('gauntlet.owned_status.unfrozen') },
        { key: 'unowned', value: 'unowned', text: t('gauntlet.owned_status.unowned') },
        { key: 'portal', value: 'portal', text: t('gauntlet.owned_status.portal') },
        { key: 'gauntlet', value: 'gauntlet', text: t('gauntlet.owned_status.gauntlet') },
        { key: 'nonportal', value: 'nonportal', text: t('gauntlet.owned_status.nonportal') }
    ] :
        [
            { key: 'any', value: 'any', text: t('gauntlet.unowned_status.any') },
            { key: 'portal', value: 'portal', text: t('gauntlet.unowned_status.portal') },
            { key: 'gauntlet', value: 'gauntlet', text: t('gauntlet.unowned_status.gauntlet') },
            { key: 'nonportal', value: 'nonportal', text: t('gauntlet.unowned_status.nonportal') }
        ];

    const skills = CONFIG.SKILLS_SHORT.map(s => s.short).sort();
    const skillFilters = [] as DropdownItemProps[];

    for (let skill1 of skills) {
        skillFilters.push({
            key: skill1,
            value: skill1,
            text: skill1
        });
        for (let skill2 of skills) {
            if (skill1 === skill2) continue;
            let sp = `${skill1}/${skill2}`;
            if (skillFilters.find(f => f.key?.includes(skill1) && f.key?.includes(skill2))) continue;
            skillFilters.push({
                key: sp,
                value: sp,
                text: sp
            });
        }
    }

    availBuffs.push({
        key: 'none',
        value: 'none',
        text: t(BuffNames['none'])
    })

    if (buffConfig) {
        availBuffs.push({
            key: 'player',
            value: 'player',
            text: t(BuffNames['player'])
        })
        availBuffs.push({
            key: 'quipment',
            value: 'quipment',
            text: t(BuffNames['quipment'])
        })

    }

    if (maxBuffs) {
        availBuffs.push({
            key: 'max',
            value: 'max',
            text: t(BuffNames['max'])
        });
        availBuffs.push({
            key: 'max_quipment_2',
            value: 'max_quipment_2',
            text: t(BuffNames['max_quipment_2'])
        });
        availBuffs.push({
            key: 'max_quipment_3',
            value: 'max_quipment_3',
            text: t(BuffNames['max_quipment_3'])
        });
        availBuffs.push({
            key: 'max_quipment_best',
            value: 'max_quipment_best',
            text: t(BuffNames['max_quipment_best'])
        });
    }

    return <React.Fragment>
        <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "stretch"
        }}>

            <div style={{
                display: "flex",
                flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row",
                justifyContent: "flex-start"
            }}>
                {viewMode === 'pair_cards' &&
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: "left",
                        margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                        textAlign: "left"
                    }}>
                        <h4><b>{t('gauntlet.show_top_crew')}</b></h4>

                        <Dropdown
                            title={t('hints.filter_crew_by_rank')}
                            options={[0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: o ? t('gauntlet.top_n', { n: `${o}` }) : t('gauntlet.no_limit'), key: o, value: o } })}
                            value={tops}
                            onChange={(e, { value }) => setTops(value as number)}
                        />
                    </div>}
                {viewMode === 'pair_cards' &&
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                        textAlign: "left"
                    }}>
                        <h4><b>{t('gauntlet.max_results_per_table')}</b></h4>

                        <Dropdown
                            title={t('gauntlet.max_results_per_table')}
                            options={[0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100].map(o => { return { text: !o ? 'No Limit' : "" + o, key: o, value: o } })}
                            value={config.filter?.maxResults}
                            onChange={(e, { value }) => setMaxResults(value as number)}
                        />
                    </div>}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                    textAlign: "left"
                }}>
                    <h4><b>{t('gauntlet.show_buffs_heading')}</b></h4>

                    <Dropdown
                        title={t('gauntlet.apply_buffs') + (pane === 'live' ? ` (${t('gauntlet.note_opponent_stats_no_calc_msg')})` : "")}
                        options={availBuffs}
                        value={getBuffState()}
                        onChange={(e, { value }) => setBuffState(value as PlayerBuffMode)}
                    />
                    <Checkbox
                        checked={getNatural()}
                        onChange={(e, { checked }) => setNatural(!!checked)}
                        disabled={!getBuffState().startsWith('max_quipment')}
                        label={t('quipment_dropdowns.slots.natural')} style={{margin: '1em 0'}} />
                </div>


                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                    textAlign: "left"
                }}>
                    <h4><b>{t('gauntlet.owned_status_heading')}</b></h4>

                    <Dropdown
                        title={t('hints.filter_by_owned_status')}
                        scrolling
                        options={filterOptions}
                        value={getOwnedStatus()}
                        onChange={(e, { value }) => setOwnedStatus(value as OwnedStatus)}
                    />
                </div>


                {true && <div style={{
                    display: "flex",
                    flexDirection: "column",
                    margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                    textAlign: "left"
                }}>
                    <h4><b>{t('gauntlet.skills_and_pairs')}</b></h4>
                    <div style={{ marginLeft: "-1em", marginTop: "-0.5em" }}>
                        <Dropdown
                            title={t('hints.filter_by_skill')}
                            placeholder={t('gauntlet.skills_and_pairs')}
                            clearable
                            compact
                            inline
                            scrolling
                            multiple
                            options={skillFilters}
                            value={getSkillPairs()}
                            onChange={(e, { value }) => setSkillPairs(value as string[])}
                        />
                    </div>
                </div>}

                <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-evenly" }}>
                    {viewMode === 'pair_cards' && pane === 'live' && <div style={{
                        display: "flex",
                        flexDirection: "row",
                        margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 1em 0",
                        textAlign: "left"
                    }}>

                        <Checkbox
                            title={t('gauntlet.only_highlight_active_round')}
                            options={filterOptions}
                            checked={getActiveRound()}
                            onChange={(e, { checked }) => setActiveRound(checked as boolean)}
                        />

                        <h4 style={{ margin: "0 1em", cursor: "pointer" }} onClick={(e) => setActiveRound(!getActiveRound())}><b>Highlight Active Round Only</b></h4>
                    </div>}
                    {pane === 'live' && <div style={{
                        display: "flex",
                        flexDirection: "row",
                        margin: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "1em 0 0 0" : "0 2em 0 0",
                        textAlign: "left"
                    }}>
                        <Checkbox
                            title={t('gauntlet.hide_opponents')}
                            options={filterOptions}
                            checked={getHideOpponents()}
                            onChange={(e, { checked }) => setHideOpponents(checked as boolean)}
                        />

                        <h4 style={{ margin: "0 1em", cursor: "pointer" }} onClick={(e) => setHideOpponents(!getHideOpponents())}><b>Hide Opponents</b></h4>
                    </div>}
                </div>

            </div>
        </div>
    </React.Fragment>

    function setMaxResults(maxResults?: number) {
        setConfig({
            ...config,
            filter: {
                ...config.filter ?? {},
                maxResults
            }
        });
    }

    function getActiveRound() {
        return !!config.onlyActiveRound;
    }

    function setActiveRound(onlyActiveRound: boolean) {
        setConfig({ ...config, onlyActiveRound });
    }

    function getHideOpponents() {
        return !!config.hideOpponents;
    }

    function setHideOpponents(hideOpponents: boolean) {
        setConfig({ ...config, hideOpponents });
    }

    function getBuffState() {
        if (!availBuffs.some(b => b.key === config.buffMode)) {
            return 'max';
        }
        return config.buffMode;
    }

    function setBuffState(buffMode: PlayerBuffMode) {
        setConfig({ ...config, buffMode })
    }

    function getNatural() {
        return config.natural;
    }

    function setNatural(natural: boolean) {
        setConfig({ ...config, natural })
    }


    function getSkillPairs() {
        return config.filter?.skillPairs ?? [];
    }

    function setSkillPairs(skillPairs: string[]) {
        setConfig({
            ...config,
            filter: {
                ...config.filter ?? {},
                skillPairs
            }
        });
    }

    function getOwnedStatus(): OwnedStatus | undefined {
        return config.filter?.ownedStatus;
    }

    function setOwnedStatus(ownedStatus?: OwnedStatus) {
        setConfig({
            ...config,
            filter: {
                ...config.filter ?? {},
                ownedStatus
            }
        });
    }


}