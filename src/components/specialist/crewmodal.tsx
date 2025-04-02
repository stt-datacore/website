import React from 'react';
import { Button, Checkbox, Container, Icon, Image, Modal, Segment, Tab, Table } from 'semantic-ui-react';

import { CrewHoverStat } from '../hovering/crewhoverstat';
import { GlobalContext } from '../../context/globalcontext';
import { Leaderboard } from '../../model/events';
import { IEventData, IRosterCrew } from '../eventplanner/model';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { GalaxyCrewCooldown, SpecialistMission } from '../../model/player';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { calcSpecialistCost, calculateSpecialistTime, crewSpecialistBonus, getSpecialistBonus } from '../../utils/events';
import { Filter } from '../../model/game-elements';
import { omniSearchFilter } from '../../utils/omnisearch';
import CONFIG from '../CONFIG';
import { AvatarView } from '../item_presenters/avatarview';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { defaultSpecialistCompare, defaultSpecialistSort, drawSkills, printOnCooldown, printOnShuttle, printOnVoyage } from './utils';
import { printChrons } from '../retrieval/context';
import { useStateWithStorage } from '../../utils/storage';

export interface ISpecialistCrewConfig {
    crew: IRosterCrew;
    matched_skills: string[];
    matched_traits: string[];
    bonus: number;
    duration: {
        hours: number;
        minutes: number;
        total_minutes: number;
    },
    cost: number;
}

type SpecialistPickerProps = {
    pageId: string;
    eventData: IEventData;
    mission: SpecialistMission;
    exclusions?: number[];
    crew: IRosterCrew[];
    cooldowns?: GalaxyCrewCooldown[];
    selection?: IRosterCrew;
    onClose: (selection: IRosterCrew | undefined, affirmative: boolean) => void;
    //renderTrigger?: (mission: SpecialistMission, crew: IRosterCrew) => JSX.Element;
}

function SpecialistPickerModal(props: SpecialistPickerProps) {
	const globalContext = React.useContext(GlobalContext);

	const { t, TRAIT_NAMES } = globalContext.localized;
    const { playerData, ephemeral } = globalContext.player;
    const { mission, onClose, crew, eventData, exclusions, pageId, cooldowns } = props;

    const [selection, internalSetSelection] = React.useState<IRosterCrew | undefined>(props.selection);
    const [hideActive, setHideActive] = useStateWithStorage<boolean>(`${pageId}/hide_active`, false, { rememberForever: true });
    const [coolSwitch, setCoolSwitch] = React.useState(0);
    const both = mission.requirements.length === mission.min_req_threshold;

    const bonuses = getSpecialistBonus(eventData);

    const supplyKit = React.useMemo(() => {
        return ephemeral?.stimpack?.energy_discount ?? 0;
    }, [ephemeral]);

    const specialistCrew = React.useMemo(() => {
        const newRoster = [] as ISpecialistCrewConfig[];
        if (!eventData.activeContent || !bonuses) return [];
        let cool = false;
        for (let c of crew) {
            const cooldown = cooldowns?.find(f => f.crew_id === c.id);
            if (cooldown) {
                cooldown.is_disabled = cooldown.disabled_until.getTime() > Date.now();
                if (cooldown.is_disabled) cool = true;
                if (hideActive && cooldown.is_disabled) continue;
            }
            if (exclusions?.includes(c.id)) continue;
            if (hideActive && c.active_status) continue;
            const matched_skills = Object.keys(c.base_skills).filter(skill => mission.requirements.includes(skill) && c.base_skills[skill].core);
            if (both && matched_skills.length !== mission.requirements.length) continue;
            else if (!matched_skills.length) continue;
            const matched_traits = mission.bonus_traits.filter(trait => c.traits.includes(trait));
            const duration_data = calculateSpecialistTime(c, eventData, mission);

            if (!duration_data) continue;
            const total_minutes = duration_data.minutes + (duration_data.hours * 60);
            const newItem: ISpecialistCrewConfig = {
                crew: c,
                matched_skills,
                matched_traits,
                bonus: crewSpecialistBonus(c, eventData),
                duration: {
                    ...duration_data,
                    total_minutes
                },
                cost: calcSpecialistCost(eventData, total_minutes, supplyKit)
            }
            newRoster.push(newItem);
        }
        if (!!selection && !newRoster.some(data => data.crew.symbol === selection.symbol)) {
            setSelection(undefined);
        }
        if (cool) {
            setCoolSwitch(1);
        }
        return defaultSpecialistSort(newRoster);
    }, [crew, mission, exclusions, supplyKit, ephemeral, hideActive]);

    React.useEffect(() => {
        if (coolSwitch) {
            let cool = false;
            for (let c of crew) {
                const cooldown = cooldowns?.find(f => f.crew_id === c.id);
                if (cooldown) {
                    cooldown.is_disabled = cooldown.disabled_until.getTime() > Date.now();
                    if (cooldown.is_disabled) cool = true;
                    if (hideActive && cooldown.is_disabled) continue;
                }
            }
            if (cool) {
                setTimeout(() => {
                    setCoolSwitch(coolSwitch + 1);
                }, 30000);
            }
            else {
                setCoolSwitch(0);
            }
        }
    }, [coolSwitch]);

    const activeLock = React.useMemo(() => {
        if (!selection) return undefined;
        let sel = specialistCrew.find(f => f.crew === selection);
        if (sel) return [sel];
        return undefined;
    }, [specialistCrew, selection]);

    const tableConfig = [
        { width: 1, column: 'crew.name', title: t('global.name') },
        {
            width: 1, column: 'matched_skills', title: t('base.skills'),
            reverse: true,
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                let r = a.matched_skills.length - b.matched_skills.length;
                if (!r) {
                    let askill = a.matched_skills.map(skill => a.crew[skill].core as number || 0).reduce((p, n) => p + n);
                    let bskill = b.matched_skills.map(skill => b.crew[skill].core as number || 0).reduce((p, n) => p + n);
                    r = askill - bskill;
                }
                if (!r) a.matched_skills.join().localeCompare(b.matched_skills.join());
                return r;
            }
        },
        {
            width: 1, column: 'matched_traits', title: t('base.traits'),
            reverse: true,
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                let r = a.matched_traits.length - b.matched_traits.length;
                if (!r) r = a.matched_traits.map(t => TRAIT_NAMES[t]).join().localeCompare(b.matched_traits.map(t => TRAIT_NAMES[t]).join());
                return r;
            }
        },
        {
            width: 2, column: 'crew.active_status', title: t('base.status'),
            reverse: true,
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                let r = 0;
                if (!r && !!cooldowns?.length) {
                    let spa = cooldowns.find(f => f.crew_id === a.crew.id);
                    let spb = cooldowns.find(f => f.crew_id === b.crew.id);
                    if (!spa && !spb) return 0;
                    if (!spa) return -1;
                    if (!spb) return 1;
                    if (spa && spb) {
                        let now = Date.now();
                        let cta = spa.disabled_until.getTime() - now;
                        let ctb = spb.disabled_until.getTime() - now;
                        r = cta - ctb;
                    }
                }
                if (!r) r = a.crew.active_status - b.crew.active_status;
                if (!r) r = defaultSpecialistCompare(a, b);
                return r;
            }
        },
        {
            width: 1, column: 'bonus', title: t('event_planner.table.columns.bonus'),
            reverse: false
        },
        {
            width: 1, column: 'duration.total_minutes', title: t('items.columns.duration'),
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                return defaultSpecialistCompare(a, b);
            }
        },
        {
            width: 1, column: 'cost', title: t('event_planner.table.columns.completion_cost'),
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                return defaultSpecialistCompare(a, b);
            }
        }
    ] as ITableConfigRow[];

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return (
        <Modal
            size={'large'}
            open={true}
            onClose={() => onClose(undefined, false)}
            header={
                renderHeader()
            }
            content={
                renderContent()
            }/>)

    function renderHeader() {
        return (
            <Segment>
                <div style={{...flexRow, justifyContent: 'space-between', margin: '0.5em', flexWrap: 'wrap'}}>
                    <div style={{fontSize: '1.5em', fontWeight: 'bold'}}>
                        {mission.title}
                    </div>
                    <div style={{...flexRow}}>
                        {drawSkills(mission.requirements, t, mission.min_req_threshold === mission.requirements.length ? 'and' : 'or')}
                    </div>
                </div>
            </Segment>
        )
    }

    function renderContent() {
        return (
            <>
            <Container style={{
                padding: '1em',
                overflow: 'auto',
                maxHeight: isMobile ? '100vh' : '70vh'
                }}>
                <CrewHoverStat targetGroup='specialist_modal' modalPositioning={true}  />
                <Checkbox
                    style={{margin: '1em 0'}}
                    label={t('options.crew_status.active_hide')}
                    checked={hideActive}
                    onChange={(e, { checked }) => setHideActive(!!checked)}
                    />
                <SearchableTable
                    lockable={activeLock}
                    lockTitle={(obj: ISpecialistCrewConfig) => obj.crew.name}
                    hideExplanation={true}
                    pagingOptions={[{ key: '0', value: 5, text: '5' }, { key: '0', value: 10, text: '10' }]}
                    data={specialistCrew}
                    config={tableConfig}
                    renderTableRow={renderTableRow}
                    filterRow={filterRows}
                    />
            </Container>
            <Segment attached='bottom'>
                    <div style={{...flexRow, justifyContent: 'flex-end'}}>
                        <div style={{margin: '0.5em 1em'}}>
                            <div style={{...flexRow, justifyContent: 'flex-end', gap: '1em'}}>
                                <Button onClick={() => onClose(selection, false)}>{selection !== props.selection ?t('global.cancel') : t('global.close')}</Button>
                                {selection !== props.selection && <Button onClick={() => onClose(selection, true)}>{t('global.save')}</Button>}
                            </div>
                        </div>
                    </div>
                </Segment>
            </>
        );
    }

    function filterRows(row: ISpecialistCrewConfig, filters: Filter[], filterType?: string) {
        return omniSearchFilter(row, filters, filterType, ['crew.name',
            {
                field: 'matched_skills',
                customMatch: (value: string[], text) => {
                    text = text.toLowerCase();
                    for (let str of value) {
                        if (CONFIG.SKILLS[str] && CONFIG.SKILLS[str].toLowerCase().includes(text)) return true;
                    }
                    return false;
                }
            },
            {
                field: 'matched_traits',
                customMatch: (value: string[], text) => {
                    text = text.toLowerCase();
                    for (let str of value) {
                        if (TRAIT_NAMES[str] && TRAIT_NAMES[str].toLowerCase().includes(text)) return true;
                    }
                    return false;
                }
            }
        ]);
    }

    function renderTableRow(row: ISpecialistCrewConfig, idx?: number, isActive?: boolean) {

        const cooldown = cooldowns?.find(f => f.crew_id === row.crew.id);
        if (cooldown) {
            cooldown.is_disabled = cooldown.disabled_until.getTime() > Date.now();
        }
        const skillimg = row.matched_skills.map((skill) => {
            let skill_icon = `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`;
            return <div title={CONFIG.SKILLS[skill]} style={{...flexRow, alignItems: 'center', justifyContent: 'flex-start', gap: '0.5em'}}>
                {<div style={{fontWeight: 'bold', width: '3em'}}>{row.crew[skill].core}</div>}
                <div style={{width:'28px'}}>
                    <img src={skill_icon} style={{maxHeight: '24px', maxWidth: '24px'}} />
                </div>
                {CONFIG.SKILLS[skill]}
            </div>
        });

        const skillcontent = [] as JSX.Element[];

        for (let img of skillimg) {
            skillcontent.push(img);
        }

        const traitimg = row.matched_traits.map((trait) => {
            let trait_icon = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
            return <div title={TRAIT_NAMES[trait]} style={{...flexRow, alignItems: 'center', justifyContent: 'flex-start'}}>
                <img src={trait_icon} style={{height: '24px'}} />
                {TRAIT_NAMES[trait]}
            </div>
        });

        const traitcontent = [] as JSX.Element[];

        for (let img of traitimg) {
            traitcontent.push(img);
        }

        const isDisabled = (!!row.crew.active_status || !!cooldown?.is_disabled);

        return <Table.Row
                    positive={selection?.id == row.crew.id}
                    onClick={() => setSelection(row)}
                    style={{
                        cursor: isDisabled ? 'no-drop' : 'pointer',
                        }}
                    >
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.5em'}}>
                    <AvatarView
                        style={{
                            opacity: isDisabled ? '0.2' : undefined
                            }}
                        crewBackground="rich"
                        mode='crew'
                        targetGroup='specialist_modal'
                        item={row.crew}
                        partialItem={true}
                        size={48}
                        />
                    {!!row.crew.immortal && row.crew.immortal > 0 && <Icon name='snowflake' />}
                    <span>{row.crew.name}</span>
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexCol, margin: '0.25em', justifyContent: 'center', width: '12em', textAlign: 'left', alignItems: 'flex-start', gap: '0.5em'}}>
                    {skillcontent}
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexCol, margin: '0.25em', justifyContent: 'center', width: '12em', textAlign: 'left', alignItems: 'flex-start', gap: '0.5em'}}>
                    {traitcontent}
                </div>
            </Table.Cell>
            <Table.Cell>
                {row.crew.active_status === 2 && printOnShuttle(t)}
                {row.crew.active_status === 3 && printOnVoyage(t)}
                {!!cooldown?.is_disabled && !!coolSwitch && printOnCooldown(t, cooldown)}
            </Table.Cell>
            <Table.Cell>
                {!!row.bonus && t('global.n_%', { n: row.bonus })}
            </Table.Cell>
            <Table.Cell>
                <p>
                    {t('duration.n_h', { hours: row.duration.hours })}
                    &nbsp;
                    {t('duration.n_m', { minutes: row.duration.minutes })}
                </p>
            </Table.Cell>
            <Table.Cell>
                {printChrons(row.cost)}
            </Table.Cell>
        </Table.Row>

    }

    function setSelection(row?: ISpecialistCrewConfig) {
        if (row?.crew?.active_status || cooldowns?.some(cd => cd.crew_id === row?.crew?.id && cd.is_disabled)) return;
        if (selection == row?.crew) internalSetSelection(undefined);
        else internalSetSelection(row?.crew);
    }

}

export default SpecialistPickerModal;
