import React from 'react';
import { PlayerCollection, PlayerCrew } from '../../../model/player';
import { Icon } from 'semantic-ui-react';
import { RewardsGrid } from '../../crewtables/rewards';
import { CrewItemsView } from '../../item_presenters/crew_items';
import ItemDisplay from '../../itemdisplay';
import { GlobalContext } from '../../../context/globalcontext';
import { makeCiteNeeds } from '../../../utils/collectionutils';
import { AvatarView } from '../../item_presenters/avatarview';
import { OptionsPanelFlexColumn } from '../../stats/utils';


export interface CollectionsCrewCardProps {
    collection: PlayerCollection
    crew: PlayerCrew;
    index: number;
    onClick: (e: React.MouseEvent, item: PlayerCrew) => void;
    compactView: boolean;
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
    const { style, className, compactView } = props;

    const needed = index < (collection?.needed ?? 0);

    const regularStyle: React.CSSProperties = {
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
    };

    const compactStyle: React.CSSProperties = {
        width: "300px",
        margin: "1.5em",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: '1em',
        justifyContent: "flex-start",
        padding: "0.25em 1em",
        paddingTop: index < (collection?.needed ?? 0) ? '0.75em' : undefined,
        borderRadius: "5px",
        ... ((highlightIfNeeded && needed) ? highlightStyle : style) ?? {}
    };

    return (<div
        className={needed && highlightIfNeeded ? highlightClassName : className}
        style={compactView ? compactStyle : regularStyle}>

        {needed && highlightIfNeeded && !compactView && (
            <div style={{ zIndex: 5, display: 'flex', width: "100%", flexDirection: 'row', justifyContent: 'center' }}>
                <Icon color='green'
                    name='star'
                    style={{ marginLeft: "-52px", marginBottom: "-16px", height: '24px' }} />
            </div>
        )}
        <div style={{...OptionsPanelFlexColumn}}>
            <AvatarView
                mode='crew'
                size={compactView ? 48 : 64}
                targetGroup={'collectionsTarget'}
                item={crew}
                useDirect={true}
            />
            {needed && highlightIfNeeded && compactView && (
                <Icon color='green'
                    name='star' />
            )}
        </div>
        <div style={{...OptionsPanelFlexColumn}}>
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
        </div>
        <div style={{...OptionsPanelFlexColumn}}>
            {crew.have && <i>{t('base.level')} {crew.level}</i> || <i>{t('base.level')} 100</i>}
            <CrewItemsView itemSize={16} mobileSize={16} crew={crew} />
            <div style={{ margin: "0.5em 0" }} title={crew.have ? 'Citations' : 'Unowned'}>
                <RewardsGrid kind={'need'} needs={makeCiteNeeds(crew)} negative={!crew.have} />
            </div>
        </div>
    </div>)
}

export default CollectionsCrewCard;