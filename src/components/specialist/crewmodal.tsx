import React from 'react';
import { Button, Container, Image, Modal, Segment, Tab, Table } from 'semantic-ui-react';

import { CrewHoverStat } from '../hovering/crewhoverstat';
import { GlobalContext } from '../../context/globalcontext';
import { Leaderboard } from '../../model/events';
import { IEventData, IRosterCrew } from '../eventplanner/model';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { SpecialistMission } from '../../model/player';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { calcSpecialistCost, calculateSpecialistTime, crewSpecialistBonus, getSpecialistBonus } from '../../utils/events';
import { Filter } from '../../model/game-elements';
import { omniSearchFilter } from '../../utils/omnisearch';
import CONFIG from '../CONFIG';
import { AvatarView } from '../item_presenters/avatarview';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import { drawSkills } from './utils';
import { printChrons } from '../retrieval/context';

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
    eventData: IEventData;
    mission: SpecialistMission;
    exclusions?: number[];
    crew: IRosterCrew[];
    selection?: IRosterCrew;
    onClose: (selection: IRosterCrew | undefined, affirmative: boolean) => void;
    //renderTrigger?: (mission: SpecialistMission, crew: IRosterCrew) => JSX.Element;
}

function SpecialistPickerModal(props: SpecialistPickerProps) {
	const globalContext = React.useContext(GlobalContext);

	const { t, TRAIT_NAMES } = globalContext.localized;
    const { mission, onClose, crew, eventData, exclusions } = props;

    const [selection, setSelection] = React.useState<IRosterCrew | undefined>(props.selection);

    const both = mission.requirements.length === mission.min_req_threshold;

    const bonuses = getSpecialistBonus(eventData);

    const specialistCrew = React.useMemo(() => {
        const newRoster = [] as ISpecialistCrewConfig[];
        if (!eventData.activeContent || !bonuses) return [];

        for (let c of crew) {
            if (exclusions?.includes(c.id)) continue;
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
                cost: calcSpecialistCost(eventData, total_minutes)
            }
            newRoster.push(newItem);
        }
        if (!!selection && !newRoster.some(data => data.crew.symbol === selection.symbol)) {
            setSelection(undefined);
        }
        return newRoster.sort((a, b) => a.duration.total_minutes - b.duration.total_minutes || b.bonus - a.bonus);
    }, [crew, mission, exclusions]);

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
            width: 1, column: 'bonus', title: t('event_planner.table.columns.bonus'),
            reverse: true
        },
        {
            width: 1, column: 'duration.total_minutes', title: t('items.columns.duration'),
            customCompare: (a: ISpecialistCrewConfig, b: ISpecialistCrewConfig) => {
                let r = a.duration.total_minutes - b.duration.total_minutes;
                if (!r) r = b.bonus - a.bonus;
                if (!r) r = b.matched_traits.length - a.matched_traits.length;
                return r;
            }
        },
        {
            width: 1, column: 'cost', title: t('event_planner.table.columns.completion_cost')
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
                <SearchableTable
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

        return <Table.Row positive={selection?.id == row.crew.id} style={{cursor: 'pointer'}} onClick={() => selection == row.crew ? setSelection(undefined) : setSelection(row.crew)}>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
                    <AvatarView
                        crewBackground="rich"
                        mode='crew'
                        targetGroup='specialist_modal'
                        item={row.crew}
                        partialItem={true}
                        size={48}
                        />
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
}

export default SpecialistPickerModal;
