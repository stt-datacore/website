import React from "react";
import { IEventData, IRosterCrew } from "../eventplanner/model"
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { Button, Checkbox, Icon, Label, Message, Modal, Segment, Table } from "semantic-ui-react";
import { SpecialistMission } from "../../model/player";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";
import CONFIG from "../CONFIG";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import SpecialistPickerModal from "./crewmodal";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { useStateWithStorage } from "../../utils/storage";
import { calcSpecialistCost, calculateSpecialistTime, crewSpecialistBonus } from "../../utils/events";
import { printChrons } from "../retrieval/context";
import { specialistRosterAutoSort, defaultSpecialistSort, drawSkills, drawTraits } from "./utils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { formatDuration, formatTime } from "../../utils/itemutils";

type MissionCrew = {
    mission: number;
    crew: number;
    ending_at?: Date;
    position?: number;
}

export interface SpecialistMissionTableProps {
    crew: IRosterCrew[];
    eventData: IEventData;
}

export const SpecialistMissionTable = (props: SpecialistMissionTableProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt, TRAIT_NAMES } = globalContext.localized

    const { eventData } = props;
    const { playerData, ephemeral } = globalContext.player;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const pageId = React.useMemo(() => {
        let p = '';
        if (playerData?.player.dbid) {
            p += `${playerData.player.dbid}/`;
        }
        return p + 'specialist_event_helper';
    }, [playerData]);

    const supplyKit = React.useMemo(() => {
        return ephemeral?.stimpack?.energy_discount ?? 0;
    }, [ephemeral]);

    const galaxyCooldowns = React.useMemo(() => {
        if (!ephemeral?.galaxyCooldowns?.length) return [];
        return ephemeral.galaxyCooldowns.map(gc => {
            if (typeof gc.disabled_until === 'string') gc.disabled_until = new Date(gc.disabled_until);
            gc.is_disabled = gc.disabled_until.getTime() > Date.now();
            return gc;
        });
    }, [ephemeral]);

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [currentMission, setCurrentMission] = React.useState<SpecialistMission | undefined>(undefined);

    const [considerFrozen, setConsiderFrozen] = useStateWithStorage(`${pageId}/consider_frozen`, false, { rememberForever: true });
    const [preferBonus, setPreferBonus] = useStateWithStorage(`${pageId}/prefer_bonus`, false, { rememberForever: true });
    const [missionCrew, setMissionCrew] = useStateWithStorage<MissionCrew[]>(`${pageId}/specialist/mission_crew`, []);
    const [selectedMissions, setSelectedMissions] = useStateWithStorage<number[]>(`${pageId}/specialist/mission_selections`, []);
    const [staffingFailures, setStaffingFailures] = React.useState<number[]>([]);

    React.useEffect(() => {
        if (eventData?.activeContent?.missions) {
            const { missions } = eventData.activeContent;
            let newmissions = selectedMissions.filter(f => missions.some(mi => mi.id === f && !mi.crew_id));
            let newcrew = missionCrew.filter(f => missions.some(mi => mi.id === f.mission));

            for (let mission of missions) {
                if (mission.completion_time) {
                    if (typeof mission.completion_time === 'string') mission.completion_time = new Date(mission.completion_time);
                }
                if (mission.crew_id) {
                    let newobj = newcrew.find(nc => nc.mission === mission.id);
                    if (!newobj) {
                        newobj = {
                            mission: mission.id,
                            crew: mission.crew_id
                        } as MissionCrew;
                        newcrew.push(newobj);
                    }
                    newobj.ending_at = mission.completion_time;
                }
            }
            setMissionCrew(newcrew);
            setSelectedMissions(newmissions);
            if (currentMission && !missions.some(mi => mi.id === currentMission.id)) {
                setCurrentMission(undefined);
            }
        }
        else {
            setSelectedMissions([]);
            setMissionCrew([]);
        }
    }, [eventData]);

    const tableConfig = [
        { width: 1, column: 'title', title: t('global.name') },
        { width: 1, column: 'requirements', title: t('base.skills') },
        { width: 1, column: 'bonus_traits', title: t('base.traits') },
        {
            width: 1, column: 'crew_id', title: t('event_type.galaxy'),
            customCompare: (a: SpecialistMission, b: SpecialistMission) => {
                const crewa = getMissionCrew(a);
                const crewb = getMissionCrew(b);
                if (!crewa && !crewb) return 0;
                if (crewa && !crewb) return 1;
                if (!crewa && crewb) return -1;
                if (crewa && crewb) {
                    let r = calculateSpecialistTime(crewa, eventData, a)!.total_minutes - calculateSpecialistTime(crewb, eventData, b)!.total_minutes;
                    if (r) return r;
                    return crewa.name.localeCompare(crewb.name);
                }
                return 0;
            }
        },
    ] as ITableConfigRow[];

    if (!eventData.activeContent?.missions?.length) return <></>;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const missions = React.useMemo(() => {
        return eventData.activeContent?.missions ?? [];
    }, [eventData]);

    const locked = React.useMemo(() => {
        return missions.filter(f => !!f.crew_id).map(m => m.id);
    }, [missions]);

    const crew = React.useMemo(() => {
        return props.crew.filter(f => f.immortal <= 0 || considerFrozen);
    }, [props.crew, considerFrozen]);

    React.useEffect(() => {
        const newdata = [...missionCrew];
        for (let m of missions) {
                if (missions?.length) {
                if (m.crew_id && !newdata.some(d => d.mission === m.id) && crew.some(c => c.id === m.crew_id)) {
                    newdata.push({
                        mission: m.id,
                        crew: m.crew_id
                    });
                }
            }
        }
        setMissionCrew(newdata);
    }, [missions]);

    const exclusions = React.useMemo(() => {
        if (!currentMission) return [];
        return missionCrew.filter(f => f.mission !== currentMission.id).map(c => c.crew);
    }, [currentMission, missionCrew]);

    return <React.Fragment>
        <h2>{t('event_planner.specialist_missions')}</h2>
        <CrewHoverStat targetGroup="specialist_missions" />
        <Message color='blue'>
            <Icon name='info' bordered style={{ borderRadius: '16px', backgroundColor: 'white' }} />
            {t('event_planner.specialist.instructions')}
        </Message>
        <div style={{...flexRow, gap: '1em', margin: '1em 0'}}>
            <Button
                disabled={!selectedMissions?.length}
                onClick={() => staffSelected()}><Icon name='user' /> {t('event_planner.staff_selected')}</Button>
            <Button
                disabled={selectedMissions?.length === missions?.length || locked?.length === missions?.length}
                onClick={() => selectAll()}><Icon name='globe' /> {t('global.select_all')}</Button>
            <Button
                disabled={!selectedMissions?.length || locked?.length === missions?.length}
                onClick={() => selectNone()}><Icon name='remove circle' /> {t('global.unselect_all')}</Button>
            <Button
                disabled={!selectedMissions?.length || locked?.length === missions?.length}
                onClick={() => clearAll()}><Icon name='cancel' /> {t('global.clear_all')}</Button>
        </div>
        <div style={{...flexRow, gap: '0.25em', margin: '1em 0'}}>
            <Checkbox checked={preferBonus} label={t('event_planner.prefer_high_bonus')} onChange={(e, { checked }) => setPreferBonus(!!checked)} />
        </div>
        <div style={{...flexRow, gap: '0.25em', margin: '1em 0'}}>
            <Checkbox checked={considerFrozen} label={t('consider_crew.consider_frozen')} onChange={(e, { checked }) => setConsiderFrozen(!!checked)} />
        </div>
        <div style={{...flexRow, gap: '0.25em', margin: '1em 0'}}>
            {printCrewTotals()}
        </div>
        <div style={{...flexRow, gap: '0.25em', margin: '1em 0'}}>
            {printTotal()}
        </div>
        <SearchableTable
            id={`${pageId}/specialist_missions`}
            data={missions}
            hideExplanation={true}
            renderTableRow={renderTableRow}
            filterRow={filterRows}
            config={tableConfig}
            />
        {!!pickerOpen && !!currentMission &&
            <SpecialistPickerModal
                pageId={`${pageId}/specialist_modal`}
                exclusions={exclusions}
                cooldowns={galaxyCooldowns}
                crew={crew}
                selection={getMissionCrew(currentMission)}
                eventData={eventData}
                mission={currentMission}
                onClose={closePicker}
                />
        }
    </React.Fragment>

    function getMissionCrew(mission: SpecialistMission) {
        let mc = missionCrew.find(f => f.mission === mission.id);
        if (!mc) return undefined;
        return crew.find(c => c.id === mc.crew);
    }

    function closePicker(selection: IRosterCrew | undefined, affirmative: boolean, position?: number) {
        setPickerOpen(false);
        if (currentMission && affirmative) {
            setCurrentMission(undefined);
            updateMissionCrew(currentMission, selection, position);
        }
    }

    function openPicker(mission: SpecialistMission) {
        setCurrentMission(mission);
        setPickerOpen(true);
    }

    function filterRows(row: SpecialistMission, filters: Filter[], filterType?: string) {
        return omniSearchFilter(row, filters, filterType, ['name',
            {
                field: 'requirements',
                customMatch: (value: string[], text) => {
                    text = text.toLowerCase();
                    for (let str of value) {
                        if (CONFIG.SKILLS[str] && CONFIG.SKILLS[str].toLowerCase().includes(text)) return true;
                    }
                    return false;
                }
            },
            {
                field: 'bonus_traits',
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

    function renderTableRow(row: SpecialistMission, idx?: number, isActive?: boolean) {
        const combo_txt = (() => {
            let txt = '';
            if (row.min_req_threshold === row.requirements.length) {
                txt = t('global.and');
            }
            else {
                txt = t('global.or');
            }
            txt = txt.toLocaleUpperCase();
            return txt;
        })();

        const isLocked = locked.includes(row.id);

        const skillimg = row.requirements.map((r) => {
            let skill_icon = `${process.env.GATSBY_ASSETS_URL}atlas/icon_${r}.png`;
            return <div style={{...flexRow, alignItems: 'center', justifyContent: 'center'}}>
                <img src={skill_icon} style={{width: '24px'}} />
            </div>
        });

        const skillcontent = [] as JSX.Element[];

        for (let img of skillimg) {
            if (skillcontent.length) skillcontent.push(<div style={{width: '24px'}}>{combo_txt}</div>);
            skillcontent.push(img);
        }

        const traitimg = row.bonus_traits.map((trait) => {
            let trait_icon = `${process.env.GATSBY_ASSETS_URL}items_keystones_${trait}.png`;
            return <div style={{...flexRow, alignItems: 'center', justifyContent: 'flex-start'}}>
                <img src={trait_icon} style={{height: '24px'}} />
                {TRAIT_NAMES[trait]}
            </div>
        });

        const traitcontent = [] as JSX.Element[];

        for (let img of traitimg) {
            traitcontent.push(img);
        }

        const selected = !!selectedMissions?.some(sel => sel === row.id);
        const failed = !!staffingFailures?.some(sel => sel === row.id);

        return <Table.Row negative={failed}>
            <Table.Cell style={{cursor: isLocked ? 'no-drop' : 'pointer'}} onClick={() => !isLocked && toggleMission(row)}>
                <div style={{...flexRow, alignItems: 'flex-start', gap: '0.25em'}}>
                    <div style={{width: '24px', margin: '0 0.5em'}}>
                        {selected && <Icon name='check' />}
                        {isLocked && <Icon name='lock' />}
                    </div>
                    <div style={{
                        ...flexCol,
                        alignItems: 'flex-start',
                        gap: '0em'}}>
                        <div>
                            {row.title}
                        </div>
                        {isLocked && (
                            <div style={{color: 'lightgreen', fontSize: '0.8em'}}>
                                ({t('event_planner.specialist.mission_running')})
                            </div>
                        )}
                    </div>
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexRow, justifyContent: 'space-between', width: '8em', textAlign: 'left', alignItems: 'center'}}>
                    {skillcontent}
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{...flexCol, justifyContent: 'center', width: '12em', textAlign: 'left', alignItems: 'flex-start', gap: '0.5em'}}>
                    {traitcontent}
                </div>
            </Table.Cell>
            <Table.Cell>
                {renderMissionCrew(row)}
            </Table.Cell>
        </Table.Row>
    }

    function renderMissionCrew(mission: SpecialistMission) {
        const rec = missionCrew.find(f => f.mission === mission.id);
        const assignment = crew.find(c => c.id === rec?.crew);
        const isLocked = locked.includes(mission.id);

        if (!assignment) {
            return (<div style={{...flexCol}}
                onClick={() => !isLocked ? openPicker(mission) : false}>
                <Button disabled={isLocked}>{t('hints.select_crew')}</Button>
            </div>)
        }

        const durationText = (() => {
            if (rec?.ending_at) {
                if (typeof rec.ending_at === 'string') rec.ending_at = new Date(rec.ending_at);
                let time = rec.ending_at.getTime() - Date.now();
                if (time > 0) return formatTime(time, t);
                else return t('global.completed')
            }
            return '';
        })();

        const traits = assignment.traits.filter(f => mission.bonus_traits.includes(f));
        const skills = assignment.skill_order.filter(f => mission.requirements.includes(f));
        const time = calculateSpecialistTime(assignment, eventData, mission);
        const cost = durationText && rec ?
                calcSpecialistCost(eventData, Math.ceil((rec.ending_at!.getTime() - Date.now()) / 60000), supplyKit) :
                time ? calcSpecialistCost(eventData, time.total_minutes, supplyKit) : 0;

        return (
            <Segment style={{
                display: 'grid',
                gridTemplateAreas: `'area1 area2 area3' 'area4 area2 area3'`,
                gridTemplateColumns: '15em 12em auto',
                margin: '0em',
                padding: '1em',
                width: '100%',
                cursor: isLocked ? 'no-drop' : 'pointer'
            }} onClick={() => !isLocked ? openPicker(mission) : false}>
                {!!rec?.position && <Label corner='right' style={{fontSize: '1.2em', padding: '0.75em', textAlign: 'right'}} content={rec.position}></Label>}
                <div style={{...flexRow, gap: '0.5em', justifyContent: 'flex-start', gridArea: 'area1', marginRight: '0.25em'}}>
                    <AvatarView
                        crewBackground="rich"
                        mode='crew'
                        //targetGroup="specialist_missions"
                        item={assignment}
                        partialItem={true}
                        size={48}
                        />

                    <span>
                        {!!assignment.immortal && assignment.immortal > 0 && <Icon name='snowflake' />}
                        {assignment.name}
                    </span>
                </div>
                {!!time && <div style={{
                    display: 'grid',
                    gridTemplateAreas: `'duration chrons bonus'`,
                    gridTemplateColumns: '5em 5em 3em',
                    gridArea: 'area4'}}>
                    <span style={{gridArea: 'duration', marginLeft: '0.25em'}}>
                        {!!durationText && <div style={{color: 'lightgreen'}}>{durationText}</div> || <>
                            {t('duration.n_h', { hours: time.hours })}
                            &nbsp;
                            {t('duration.n_m', { minutes: time.minutes })}
                        </>}
                    </span>
                    <div style={{gridArea: 'chrons', color: !!durationText ? 'lightgreen' : undefined }}>
                        {cost > 0 && printChrons(cost, t)}
                    </div>
                    <span>
                        {t('global.n_%', { n: crewSpecialistBonus(assignment, eventData) })}
                    </span>
                </div>}
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start', gridArea: 'area2'}}>
                    {drawSkills(skills, t, undefined, true, undefined, 16)}
                </div>
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start', gridArea: 'area3'}}>
                    {drawTraits(traits, TRAIT_NAMES)}
                </div>
            </Segment>)
    }

    function updateMissionCrew(mission: SpecialistMission, crew?: IRosterCrew, position?: number) {
        const newdata = missionCrew.filter(f => f.mission !== mission.id);
        if (crew) {
            newdata.push({
                mission: mission.id,
                crew: crew.id,
                position
            });
        }
        setMissionCrew(newdata);
    }

    function toggleMission(mission: SpecialistMission) {
        let obj = selectedMissions.find(f => f === mission.id);
        if (obj) {
            setSelectedMissions(selectedMissions.filter(f => f !== mission.id));
        }
        else {
            setSelectedMissions([...selectedMissions, mission.id]);
        }
    }

    function staffSelected() {
        const selmissions = selectedMissions.map(s => missions.find(m => m.id === s)!);
        const outstanding = missions.filter(f => !selectedMissions.some(sel => sel === f.id) && missionCrew.some(mc => mc.mission === f.id));
        const workCrew = crew.filter(f => !outstanding.some(mc => mc.crew_id === f.id));
        const failures = [] as number[];
        const newmissions = missionCrew.filter(f => !selmissions.some(m => m.id === f.mission));
        const galaxyCooldowns = globalContext.player.ephemeral?.galaxyCooldowns ?? [];
        for (let gcrew of galaxyCooldowns) {
            if (gcrew) {
                if (typeof gcrew.disabled_until === 'string') gcrew.disabled_until = new Date(gcrew.disabled_until);
            }
        }
        for (const mission of selmissions) {

            const positionCrew = workCrew.filter(c => c.immortal <= 0 &&
                (
                    (mission.requirements.length === mission.min_req_threshold && mission.requirements.every(skill => c.skill_order.includes(skill))) ||
                    (mission.requirements.length !== mission.min_req_threshold && mission.requirements.some(skill => c.skill_order.includes(skill)))
                    ) &&
                    !newmissions.some(mc => mc.crew === c.id)
            );

            const missioncrew = positionCrew
                .filter(c =>
                        // (c.active_status === 0 || c.active_status === 3) &&
                        !galaxyCooldowns.some(g => g.crew_id === c.id && g.disabled_until.getTime() > Date.now())
                )

            if (missioncrew.length) {
                specialistRosterAutoSort(missioncrew, eventData, mission, preferBonus);
                let obj = {
                    mission: mission.id,
                    crew: missioncrew[0].id
                } as MissionCrew;

                if (missioncrew[0].immortal <= 0) {
                    specialistRosterAutoSort(positionCrew, eventData, mission, false);
                    obj.position = positionCrew.findIndex(c => c.id === obj.crew) + 1;
                }
                newmissions.push(obj);
            }
            else {
                failures.push(mission.id);
            }
        }
        setMissionCrew(newmissions);
        setStaffingFailures(failures);
        //selectNone();
    }

    function selectAll() {
        setSelectedMissions([...missions.filter(m => !m.crew_id).map(m => m.id)]);
    }

    function selectNone() {
        setSelectedMissions([].slice());
    }

    function clearAll() {
        setMissionCrew(missionCrew.filter(f => !!f.ending_at));
        setSelectedMissions([].slice());
        setStaffingFailures([].slice());
    }

    function printCrewTotals() {
        const clen = crew.length;
        const cool = galaxyCooldowns.filter(f => f.is_disabled).length;
        const shuttle = crew.filter(f => f.active_status === 2).length;
        const voyage = crew.filter(f => f.active_status === 3).length;
        const titleStyle = {...flexRow, alignItems: 'flex-start', gap: '0.5em'}
        return (
        <Table size='small' striped style={{width: isMobile ? 'undefined' : '18em'}}>
            <Table.Row>
                <Table.Cell colspan={2} style={{textAlign: 'center'}}>
                    {t('global.n_total_x', {
                        n: clen,
                        x: t('base.crewmen')
                    })}
                </Table.Cell>
            </Table.Row>
                <Table.Row>
                    <Table.Cell style={titleStyle}>
                        <Icon name='time' />
                        {t('ship.cooldown')}{t('global.colon')}
                    </Table.Cell>
                    <Table.Cell>
                        {cool}
                    </Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell style={titleStyle}>
                        <Icon name='space shuttle' />
                        {t('base.on_shuttle')}{t('global.colon')}
                    </Table.Cell>
                    <Table.Cell>
                        {shuttle}
                    </Table.Cell>
                </Table.Row>
                <Table.Row>
                    <Table.Cell style={titleStyle}>
                        <Icon name='rocket' />
                        {t('base.on_voyage')}{t('global.colon')}
                    </Table.Cell>
                    <Table.Cell>
                        {voyage}
                    </Table.Cell>
                </Table.Row>
            </Table>)
    }

    function printTotal() {
        if (!missionCrew?.length || !crew?.length) return <></>;
        let cost = 0;
        for (let mc of missionCrew ?? []) {
            if (!mc) continue;
            let c = crew.find(f => f.id === mc.crew)
            if (!c) continue;
            let mission = missions.find(f => f.crew_id === mc.crew);
            if (!mission) continue;

            cost += calcSpecialistCost(eventData, calculateSpecialistTime(c, eventData, mission)?.total_minutes ?? 0, supplyKit);
        }
        if (!cost) return <></>;
        return tfmt('global.n_total_x', {
            n: cost.toLocaleString(),
            x: <div style={{...flexRow, gap: '0.25em'}}>
                <img src={`${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`} style={{height:'24px'}} />
                {t('global.item_types.chronitons')}
            </div>
        });
    }

}