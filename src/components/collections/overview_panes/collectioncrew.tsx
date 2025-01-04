import React from "react"
import { Collection } from "../../../model/game-elements"
import { GlobalContext } from "../../../context/globalcontext";
import { AvatarView } from "../../item_presenters/avatarview";
import { CrewPresenter } from "../../item_presenters/crew_presenter";
import { DEFAULT_MOBILE_WIDTH } from "../../hovering/hoverstat";
import { Link } from "gatsby";
import CONFIG from "../../CONFIG";

export const CollectionCrew = (props: { collection: Collection }) => {

    const globalContext = React.useContext(GlobalContext);
    const { collection } = props;

    const crew = globalContext.core?.crew?.filter(f => f.collection_ids.includes(collection.id!.toString()));
    if (!crew) return <></>
    crew.sort((a, b) => {
        let r = b.max_rarity - a.max_rarity;
        //if (!r) r = a.bigbook_tier - b.bigbook_tier;
        if (!r) r = a.cab_ov_rank - b.cab_ov_rank;
        if (!r) r = ((new Date(b.date_added)).getTime()) - ((new Date(a.date_added)).getTime());
        return r;
    });

    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    return <React.Fragment>
        <div className="ui segment" style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
        }}>
            {crew.slice(0, 5).map((crew) => {
                return (
                    <div key={crew.symbol} style={{ width: '7em', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5em', textAlign: 'center' }}>
                        <AvatarView mode='crew' item={crew} size={96} targetGroup="col_overview_crew" />
                        <Link key={crew.symbol} to={`/crew/${crew.symbol}/`} style={{ color: CONFIG.RARITIES[crew?.max_rarity ?? 0].color }}>
                            <i>{crew?.name}</i>
                        </Link>
                    </div>
                )
            })}
        </div>
        <div className="ui segment" style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '0.5em'
        }}>
            {crew.slice(5).map((crew) => {
                return (
                    <div key={crew.symbol} style={{ width: isMobile ? '100%' : '30%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5em', textAlign: 'center' }}>
                        <AvatarView mode='crew' item={crew} size={64} targetGroup="col_overview_crew" />
                        <Link key={crew.symbol} to={`/crew/${crew.symbol}/`} style={{ color: CONFIG.RARITIES[crew?.max_rarity ?? 0].color }}>
                            <i>{crew?.name}</i>
                        </Link>
                    </div>
                )
            })}
        </div>
    </React.Fragment>
}