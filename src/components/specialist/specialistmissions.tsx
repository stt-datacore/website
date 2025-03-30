import React from "react";
import { IEventData, IRosterCrew } from "../eventplanner/model"
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { Button, Icon, Modal, Table } from "semantic-ui-react";
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
import { drawSkills, drawTraits } from "./utils";

type MissionCrew = {
    mission: number;
    crew: number;
}

export interface SpecialistMissionTableProps {
    crew: IRosterCrew[];
    eventData: IEventData;
}

export const SpecialistMissionTable = (props: SpecialistMissionTableProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt, TRAIT_NAMES } = globalContext.localized

    const { eventData, crew } = props;

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [currentMission, setCurrentMission] = React.useState<SpecialistMission | undefined>(undefined);

    const [missionCrew, setMissionCrew] = useStateWithStorage<MissionCrew[]>('specialist_mission_crew', []);
    const [selectedMissions, setSelectedMissions] = useStateWithStorage<number[]>('specialist_mission_selections', []);
    const [staffingFailures, setStaffingFailures] = React.useState<number[]>([]);

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

    React.useEffect(() => {
        const newdata = [...missionCrew];
        if (missions?.length) {
            for (let m of missions) {
                if (m.crew_id && !newdata.some(d => d.mission === m.id)) {
                    newdata.push({
                        mission: m.id,
                        crew: m.crew_id
                    });
                }
            }
        }
        setMissionCrew(newdata);
    }, [missions]);

    return <React.Fragment>
        <h2>{t('event_planner.specialist_missions')}</h2>
        <CrewHoverStat targetGroup="specialist_missions" />
        <div style={{...flexRow, gap: '1em', margin: '1em 0'}}>
            <Button onClick={() => staffSelected()}><Icon name='user' /> {t('event_planner.staff_selected')}</Button>
            <Button onClick={() => selectAll()}><Icon name='globe' /> {t('global.select_all')}</Button>
            <Button onClick={() => selectNone()}><Icon name='remove circle' /> {t('global.unselect_all')}</Button>
            <Button onClick={() => clearAll()}><Icon name='cancel' /> {t('global.clear_all')}</Button>
        </div>
        <div style={{...flexRow, gap: '0.25em', margin: '1em 0'}}>
            {printTotal()}
        </div>
        <SearchableTable
            id='specialist_missions'
            data={missions}
            hideExplanation={true}
            renderTableRow={renderTableRow}
            filterRow={filterRows}
            config={tableConfig}
            />
        {!!pickerOpen && !!currentMission &&
            <SpecialistPickerModal
                exclusions={missionCrew.filter(f => f.mission !== currentMission.id).map(c => c.crew)}
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

    function closePicker(selection: IRosterCrew | undefined, affirmative: boolean) {
        setPickerOpen(false);
        if (currentMission && affirmative) {
            setCurrentMission(undefined);
            updateMissionCrew(currentMission, selection);
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
            <Table.Cell style={{cursor: 'pointer'}} onClick={() => toggleMission(row)}>
                <div style={{...flexRow, alignItems: 'flex-start', gap: '0.25em'}}>
                    <div style={{width: '24px', margin: '0 0.5em'}}>
                        {selected && <Icon name='check' />}
                    </div>
                    <div>
                        {row.title}
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
        const crew = getMissionCrew(mission);
        const isLocked = locked.includes(mission.id);
        if (!crew) {
            return (<div style={{...flexCol}}
                onClick={() => !isLocked ? openPicker(mission) : false}>
                <Button disabled={isLocked}>{t('hints.select_crew')}</Button>
            </div>)
        }
        const traits = crew.traits.filter(f => mission.bonus_traits.includes(f));
        const skills = crew.skill_order.filter(f => mission.requirements.includes(f));
        const time = calculateSpecialistTime(crew, eventData, mission);
        const cost = time ? calcSpecialistCost(eventData, time.minutes + (time.hours * 60)) : 0;
        return (
            <div style={{
                display: 'grid',
                gridTemplateAreas: `'area1 area2 area3' 'area4 area2 area3'`,
                gridTemplateColumns: '14em 12em auto',
                margin: '0.25em',
                padding: 0,
                width: '100%',
                cursor: isLocked ? undefined : 'pointer'

            }} onClick={() => !isLocked ? openPicker(mission) : false}>
                <div style={{...flexRow, gap: '0.5em', justifyContent: 'flex-start', gridArea: 'area1'}}>
                    <AvatarView
                        crewBackground="rich"
                        mode='crew'
                        //targetGroup="specialist_missions"
                        item={crew}
                        partialItem={true}
                        size={48}
                        />
                    <span>
                        {crew.name}
                    </span>
                </div>
                {!!time && <div style={{
                    display: 'grid',
                    gridTemplateAreas: `'duration chrons bonus'`,
                    gridTemplateColumns: '5em 5em 3em',
                    gridArea: 'area4'}}>
                    <span style={{gridArea: 'duration'}}>
                        {t('duration.n_h', { hours: time.hours })}
                        &nbsp;
                        {t('duration.n_m', { minutes: time.minutes })}
                    </span>
                    <div style={{gridArea: 'chrons'}}>
                        {printChrons(cost, t)}
                    </div>
                    <span>
                        {t('global.n_%', { n: crewSpecialistBonus(crew, eventData) })}
                    </span>
                </div>}
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start', gridArea: 'area2'}}>
                    {drawSkills(skills, t, undefined, true, undefined, 16)}
                </div>
                <div style={{...flexCol, gap: '0.5em', alignItems: 'flex-start', gridArea: 'area3'}}>
                    {drawTraits(traits, TRAIT_NAMES)}
                </div>
            </div>)
    }

    function updateMissionCrew(mission: SpecialistMission, crew?: IRosterCrew) {
        const newdata = missionCrew.filter(f => f.mission !== mission.id);
        if (crew) {
            newdata.push({
                mission: mission.id,
                crew: crew.id
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
        for (const mission of selmissions) {
            const missioncrew = workCrew
                .filter(c =>
                        (
                        (mission.requirements.length === mission.min_req_threshold && mission.requirements.every(skill => c.skill_order.includes(skill))) ||
                        (mission.requirements.length !== mission.min_req_threshold && mission.requirements.some(skill => c.skill_order.includes(skill)))
                        ) &&
                        !newmissions.some(m => m.crew === c.id)
                )
                .sort((a, b) => {
                    const dura = calculateSpecialistTime(a, eventData, mission);
                    const durb = calculateSpecialistTime(b, eventData, mission);
                    if (!dura && !durb) return 0;
                    else if (!dura && !!durb) return 1;
                    else if (!!dura && !durb) return -1;
                    else {
                        let r = dura!.total_minutes - durb!.total_minutes;
                        if (!r) {
                            let abonus = crewSpecialistBonus(a, eventData);
                            let bbonus = crewSpecialistBonus(b, eventData);
                            r = bbonus - abonus;
                        }
                        if (!r) {
                            let at = a.traits.filter(trait => mission.bonus_traits.includes(trait)).length;
                            let bt = b.traits.filter(trait => mission.bonus_traits.includes(trait)).length;
                            r = bt - at;
                        }
                        return r;
                    }
                });
            if (missioncrew.length) {
                newmissions.push({
                    mission: mission.id,
                    crew: missioncrew[0].id
                });
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
        setSelectedMissions([...missions.map(m => m.id)]);
    }

    function selectNone() {
        setSelectedMissions([].slice());
    }

    function clearAll() {
        setMissionCrew([].slice());
        setSelectedMissions([].slice());
        setStaffingFailures([].slice());
    }

    function printTotal() {
        if (!missionCrew?.length || !crew?.length) return <></>;
        let cost = missionCrew?.map(mc => calcSpecialistCost(eventData, calculateSpecialistTime(crew.find(f => f.id === mc.crew)!, eventData, missions.find(m => m.id == mc.mission)!)!.total_minutes)).reduce((a, b) => a + b, 0);
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