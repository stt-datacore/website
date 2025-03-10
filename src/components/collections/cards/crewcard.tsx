import React from 'react';
import { PlayerCollection, PlayerCrew } from '../../../model/player';
import { Icon } from 'semantic-ui-react';
import { RewardsGrid } from '../../crewtables/rewards';
import { CrewItemsView } from '../../item_presenters/crew_items';
import ItemDisplay from '../../itemdisplay';
import { GlobalContext } from '../../../context/globalcontext';
import { makeCiteNeeds } from '../../../utils/collectionutils';
import { AvatarView } from '../../item_presenters/avatarview';


export interface CollectionsCrewCardProps {
    collection: PlayerCollection
    crew: PlayerCrew;
    index: number;
    onClick: (e: React.MouseEvent, item: PlayerCrew) => void;
    style?: React.CSSProperties;
    className?: string;
    highlightIfNeeded?: boolean;
    highlightStyle?: React.CSSProperties;
    highlightClassName?: string;
}

const CollectionsCrewCard = (props: CollectionsCrewCardProps): JSX.Element => {
    const context = React.useContext(GlobalContext);
    const { t } = context.localized;
    const { highlightStyle, highlightIfNeeded, collection, crew, index, onClick } = props;
    const highlightClassName = props.highlightClassName ?? 'ui segment';
    const { style, className } = props;

    const needed = index < (collection?.needed ?? 0);

    return (<div
        className={needed && highlightIfNeeded ? highlightClassName : className}
        style={{
            width: "200px",
            margin: "1.5em",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.25em 1em",
            paddingTop: index < (collection?.needed ?? 0) ? '0.75em' : undefined,
            borderRadius: "5px",
            ... ((highlightIfNeeded && needed) ? highlightStyle : style) ?? {}
        }}>

        {needed && highlightIfNeeded &&
            <div style={{ zIndex: 5, display: 'flex', width: "100%", flexDirection: 'row', justifyContent: 'center' }}>
                <Icon color='green'
                    name='star'
                    style={{ marginLeft: "-52px", marginBottom: "-16px", height: '24px' }} />
            </div>}

        <AvatarView
            mode='crew'
            size={64}
            targetGroup={'collectionsTarget'}
            item={crew}
            useDirect={true}
        />

        <b
            onClick={(e) => onClick(e, crew)}
            style={{
                cursor: "pointer",
                margin: "0.5em 0 0 0",
                textDecoration: "underline"
            }}
            title={"Click to see collections containing this crew member"}
        >
            {crew.favorite && <Icon name='heart' style={{ textDecoration: 'none' }} />} {crew.name}
        </b>
        <i>({t('collections.n_increased', { n: `${crew.pickerId}` })})</i>
        {crew.have && <i>{t('base.level')} {crew.level}</i> || <i>{t('base.level')} 100</i>}
        <CrewItemsView itemSize={16} mobileSize={16} crew={crew} />

        <div style={{ margin: "0.5em 0" }} title={crew.have ? 'Citations' : 'Unowned'}>
            <RewardsGrid kind={'need'} needs={makeCiteNeeds(crew)} negative={!crew.have} />
        </div>

    </div>)
}

export default CollectionsCrewCard;