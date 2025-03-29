import React from "react";
import { IEventData, IRosterCrew } from "../eventplanner/model"
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { GlobalContext } from "../../context/globalcontext";
import { Button, Modal, Table } from "semantic-ui-react";
import { SpecialistMission } from "../../model/player";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";
import CONFIG from "../CONFIG";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../stats/utils";
import SpecialistPickerModal from "./crewmodal";
import { AvatarView } from "../item_presenters/avatarview";
import { CrewHoverStat } from "../hovering/crewhoverstat";

export interface SpecialistMissionTableProps {
    crew: IRosterCrew[];
    eventData: IEventData;
}
export const SpecialistMissionTable = (props: SpecialistMissionTableProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized

    const { eventData, crew } = props;

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [currentMission, setCurrentMission] = React.useState<SpecialistMission | undefined>(undefined);

    const tableConfig = [
        { width: 1, column: 'name', title: t('global.name') },
        { width: 1, column: 'requirements', title: t('base.skills') },
        { width: 1, column: 'bonus_traits', title: t('base.traits') },
        {
            width: 2, column: 'crew_id', title: t('event_type.galaxy'),
            customCompare: (a: SpecialistMission, b: SpecialistMission) => {
                const crewa = getMissionCrew(a);
                const crewb = getMissionCrew(b);
                if (!crewa && !crewb) return 0;
                if (crewa && !crewb) return 1;
                if (!crewa && crewb) return -1;
                if (crewa && crewb) return crewa.name.localeCompare(crewb.name);
                return 0;
            }
        },
    ] as ITableConfigRow[];

    if (!eventData.activeContent?.missions?.length) return <></>;

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    const missions = eventData.activeContent.missions;

    return <React.Fragment>
        <CrewHoverStat targetGroup="specialist_missions" />
        <SearchableTable
            id='specialist_missions'
            data={missions}
            renderTableRow={renderTableRow}
            filterRow={filterRows}
            config={tableConfig}
            />
        {!!pickerOpen && !!currentMission &&
            <SpecialistPickerModal
                crew={crew}
                selection={getMissionCrew(currentMission)}
                eventData={eventData}
                mission={currentMission}
                onClose={closePicker}
                />
        }
    </React.Fragment>

    function getMissionCrew(mission: SpecialistMission) {
        if (!mission.crew_id) return undefined;
        return crew.find(c => c.id === mission.crew_id)
    }

    function closePicker(selection: IRosterCrew | undefined, affirmative: boolean) {
        setPickerOpen(false);
        if (currentMission && affirmative) {
            currentMission.crew_id = selection?.id;
            setCurrentMission(undefined);
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

        return <Table.Row>
            <Table.Cell>
                {row.title}
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
        if (!crew) {
            return (<div style={{...flexCol, cursor: 'pointer'}} onClick={() => openPicker(mission)}>
                <Button>{t('hints.select_crew')}</Button>
            </div>)
        }
        return <div style={{...flexRow, gap: '0.5em', cursor: 'pointer', justifyContent: 'center'}} onClick={() => openPicker(mission)}>

            <AvatarView
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
    }

}