import React from "react";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ItemWithBonus, getItemWithBonus, isQuipmentMatch, sortItemsWithBonus } from "../../utils/itemutils";
import { ShipSeatPicker } from "../crewtables/shipoptions";
import { EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { QuipmentTable } from "../items/quipmenttable";

export interface CrewQuipmentProps {
    crew: CrewMember;
}

export const CrewQuipment = (props: CrewQuipmentProps) => {

    const context = React.useContext(GlobalContext);
    const { crew } = props;
    const crew_skills = Object.keys(crew.base_skills);
    const [skills, setSkills] = React.useState(crew_skills);

    const [quips, setQuips] = React.useState([] as ItemWithBonus[]);
    const [quipment, setQuipment] = React.useState([] as EquipmentItem[]);

    React.useEffect(() => {
        if (skills.length === 0) {
            setSkills(crew_skills);
        }
    }, [skills]);
    React.useEffect(() => {
        let qps = context.core.items.filter(f =>
            f.type === 14 &&
            (!!f.max_rarity_requirement || !!f.traits_requirement?.length)
            && isQuipmentMatch(crew, f)
            )
        .map(f => getItemWithBonus(f))
        .filter(f => {
            if (Object.keys(f.bonusInfo.bonuses).some(k => skills.includes(k))) {
                return true;
            }
            else {
                return false;
            }
        });
        sortItemsWithBonus(qps, undefined, undefined, -1);
        setQuips(qps);
    }, [context, skills]);

    React.useEffect(() => {
        setQuipment(quips.map(q => q.item));
    }, [quips])

    const formatTitle = (value: string, state: boolean) => {
        let s = `${state ? 'Hide' : 'Show'} ${CONFIG.SKILLS[value]} Skill`;
        return s;
    }

    return (
        <div className={'ui segment'}>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: "0.25em"
            }}>
                <div>
                    <h4>Compatible Quipment</h4>
                </div>
                <div style={{display:'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    <div>
                        <h4 style={{marginRight:"0.5em"}}>Active Quipment Skills:</h4>
                    </div>
                    <ShipSeatPicker
                        formatTitle={formatTitle}
                        fluid={false}
                        selectedSeats={skills}
                        setSelectedSeats={setSkills}
                        availableSeats={crew_skills}  />
                </div>
            </div>
            <QuipmentTable
                ownedItems={!!context.player.playerData}
                ownedCrew={false}
                itemTargetGroup={'crew_quipment'}
                pageId={'crew_' + crew.symbol}
                items={quipment} />

        </div>
    )
}