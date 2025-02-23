import React from "react"
import { Popup, Icon } from "semantic-ui-react"
import crew from "../../fleetbossbattles/crew"
import { renderKwipmentBonus } from "../../item_presenters/item_presenter"
import { POPUP_DELAY } from "../utils"
import { PlayerCrew } from "../../../model/player"
import { GlobalContext } from "../../../context/globalcontext"
import { OptionsPanelFlexColumn } from "../../stats/utils"
import { CrewQuipment } from "../../crewpage/crewquipment"
import { CrewItemsView } from "../../item_presenters/crew_items"


export interface QuipmentPopoverProps {
    crew: PlayerCrew;
    showQuipment?: boolean;
    ignoreProspects?: boolean;
}

export const QuipmentPopover = (props: QuipmentPopoverProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { showQuipment } = props;
    const flexCol = OptionsPanelFlexColumn;
    let crew = props.crew;

    if (props.ignoreProspects && crew.kwipment_prospects && globalContext.player.playerData?.player.character.crew) {
        let orig = globalContext.player.playerData?.player.character.crew.find(f => f.symbol === crew.symbol);
        if (orig) {
            crew = orig;
        }
    }
    return (
        <Popup wide
            content={renderKwipmentBonus((crew.kwipment as number[][]).map(q => typeof q === 'number' ? q : q[1]), globalContext.core.items, crew.kwipment_prospects, t, showQuipment ? crew : undefined)}
            mouseEnterDelay={POPUP_DELAY}
            trigger={
                <div style={{...flexCol, margin: 0, padding: 0}}>
                    <div style={{ cursor: 'help', display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
                        <img src={`${process.env.GATSBY_ASSETS_URL}atlas/ContinuumUnlock.png`} style={{ marginLeft: "0.25em", marginRight: "0.25em", height: '1em', verticalAlign: 'middle' }} className='invertibleIcon' />
                        {!!crew.kwipment_prospects && <Icon name='add' size='tiny' />}
                    </div>
                </div>
            }
        />
    )
}