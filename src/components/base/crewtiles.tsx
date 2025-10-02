import React from "react";
import { CrewMember } from "../../model/crew"
import { CompactCrew, PlayerCrew } from "../../model/player"
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { AvatarView } from "../item_presenters/avatarview";
import { skillIcon } from "../stats/utils";
import { GlobalContext } from "../../context/globalcontext";


export interface CrewTilesProps {
    pageId: string;
    crew: (PlayerCrew | CrewMember | CompactCrew)[];
    targetGroup?: string;
    provideOwnHover?: boolean;
    style?: React.CSSProperties;
    round?: boolean;
    cellStyle?: React.CSSProperties;
    itemWidth?: string;
    itemHeight?: string;
    avatarSize: number;
    miniSkills?: boolean;
    rich?: boolean;
    maxCrew?: number;
    ownHoverModalPositioning?: boolean;
    extraMessage?: React.JSX.Element | string;
    displayExtraMessage?: (crew: (PlayerCrew | CrewMember | CompactCrew)) => boolean;
    title?: string | React.JSX.Element;
    scrolling?: boolean;
}

export const CrewTiles = (props: CrewTilesProps) => {
    const { t } = React.useContext(GlobalContext).localized;
    const { title, round, maxCrew, extraMessage, displayExtraMessage, rich, miniSkills, provideOwnHover, style, itemWidth, itemHeight, avatarSize, pageId, cellStyle } = props;
    const targetGroup = props.targetGroup || (provideOwnHover ? 'crew_tiles_hover_stat' : undefined);
    const flexRow: React.CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'top', justifyContent: 'space-evenly', gap: '2em', flexWrap: 'wrap' };
    const flexCol: React.CSSProperties = { display: 'flex', textAlign: 'center', fontStyle: 'italic', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5em', width: '10em', ...cellStyle };

    if (itemWidth) flexCol.width = itemWidth;
    if (itemHeight) flexCol.height = itemHeight;

    const more = maxCrew ? props.crew.length - maxCrew : 0;
    const crew = maxCrew ? props.crew.slice(0, maxCrew) : props.crew;

    return (
        <div style={{...style, overflowY: props.scrolling ? 'auto' : undefined}}>
            {!!title && <div style={{textAlign: 'center', position: 'sticky', top: '0'}}>
                {typeof title === 'string' && <div className='ui label'>{title}</div>}
                {typeof title !== 'string' && <>{title}</>}
            </div>}
            <div style={{...flexRow, marginTop: !!title ? '3em' : undefined}}>
                {!!provideOwnHover && <CrewHoverStat modalPositioning={props.ownHoverModalPositioning} targetGroup="crew_tiles_hover_stat" />}
                {crew.map((c, idx) => {
                    return (<div key={`crew_tiles_${pageId}_${c.symbol}+${idx}`} style={flexCol}>
                        <AvatarView
                            round={round}
                            crewBackground={rich ? 'rich' : 'normal'}
                            mode='crew'
                            targetGroup={targetGroup}
                            item={c}
                            size={avatarSize}
                        />
                        <span>{c.name}</span>
                        {!!miniSkills && <div style={{ ...flexRow, gap: '0.5em', justifyContent: 'space-evenly' }}>
                            {Object.values(c.base_skills!).map((skill) => {
                                return <img src={skillIcon(skill.skill)} style={{ height: '1.2em' }} />
                            })}
                        </div>}
                        {!!extraMessage && !!displayExtraMessage && displayExtraMessage(c) && <>{extraMessage}</>}
                    </div>)
                })}

            </div>

            {!!more && more > 0 && !!maxCrew &&
            <div className='ui label' style={{marginTop: '0.5em'}}>{t('global.and_n_more_ellipses', { n: `${more}` })}</div>
            }

        </div>)
}