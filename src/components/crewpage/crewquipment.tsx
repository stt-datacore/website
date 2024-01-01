import React from "react";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { getItemWithBonus, isQuipmentMatch, sortItemsWithBonus } from "../../utils/itemutils";
import ItemDisplay from "../itemdisplay";
import ProfileItems from "../profile_items";
import { ItemHoverStat } from "../hovering/itemhoverstat";






export interface CrewQuipmentProps {
    crew: CrewMember;
}


export const CrewQuipment = (props: CrewQuipmentProps) => {

    const context = React.useContext(GlobalContext);
    const { crew } = props;

    let quips = context.core.items.filter(f => f.type === 14 && (!!f.max_rarity_requirement || !!f.traits_requirement?.length) && isQuipmentMatch(crew, f)).map(f => getItemWithBonus(f))
    sortItemsWithBonus(quips);

    return (
        <div className={'ui segment'}>                
            <h4>Compatible Quipment</h4>
            <ProfileItems                    
                types={[14]}
                pageName={'crew_' + crew.symbol} 
                hideOwnedInfo={true}
                crewMode={false}
                hideSearch={true}
                noWorker={true}
                buffs={true}
                data={quips.map(m => m.item)} />
           
        </div>
    )
}