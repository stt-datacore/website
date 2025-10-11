import React from "react";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ItemWithBonus, getItemWithBonus, isQuipmentMatch, sortItemsWithBonus } from "../../utils/itemutils";
import { ShipSeatPicker } from "../crewtables/shipoptions";
import { EquipmentItem } from "../../model/equipment";
import CONFIG from "../CONFIG";
import { QuipmentTable } from "../items/quipmenttable";
import { Checkbox } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";

export interface CrewQuipmentProps {
    crew: CrewMember;
}

export const CrewQuipment = (props: CrewQuipmentProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;
    const { crew } = props;
    const crew_skills = Object.keys(crew.base_skills);

    const dbidPrefix = React.useMemo(() => {
        if (playerData?.player?.dbid) {
            return `${playerData.player.dbid}/`;
        }
        else {
            return "";
        }
    }, [playerData]);

    const [skills, setSkills] = React.useState(crew_skills);
    const [limited, setLimited] = useStateWithStorage<boolean>(`${dbidPrefix}crew_page/trait_limit`, false, { rememberForever: !!dbidPrefix });

    React.useEffect(() => {
        if (skills.length === 0) {
            setSkills(crew_skills);
        }
    }, [skills]);

    const itemBonusData = React.useMemo(() => {
        let quipdata = globalContext.core.items.filter(f =>
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
        if (limited && quipdata?.some(q => !!q.item.traits_requirement?.length)) {
            quipdata = quipdata.filter(q => !!q.item.traits_requirement?.length);
        }
        sortItemsWithBonus(quipdata, undefined, undefined, -1);
        return quipdata;
    }, [globalContext, skills, limited]);

    const quipment = React.useMemo(() => {
        return itemBonusData.map(q => q.item);
    }, [itemBonusData]);

    const canLimit = React.useMemo(() =>
        quipment.some(q => !!q.traits_requirement?.length),
    [quipment]);

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
                    <h4>{t('crew_quipment.compatible_quipment')}</h4>
                </div>
                <div style={{display:'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '1em'}}>
                    <div style={{display:'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                        <div style={{marginRight:"0.5em", marginTop: "1.0em"}}>
                            <span>{t('crew_quipment.active_quipment_skills{{:}}')}</span>
                        </div>
                        <ShipSeatPicker
                            formatTitle={formatTitle}
                            fluid={false}
                            selectedSeats={skills}
                            setSelectedSeats={setSkills}
                            availableSeats={crew_skills}  />
                    </div>
                    {canLimit && <div>
                        <Checkbox
                            label={t('crew_quipment.trait_limited')}
                            checked={limited}
                            onChange={(e, { checked }) => setLimited(!!checked)}
                            />
                    </div>}
                </div>
            </div>
            <QuipmentTable
                ownedItems={!!globalContext.player.playerData}
                ownedCrew={false}
                itemTargetGroup={'crew_quipment'}
                pageId={'crew_' + crew.symbol}
                items={quipment} />

        </div>
    )
}