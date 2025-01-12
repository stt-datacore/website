import * as React from 'react';

import { navigate } from 'gatsby';
import { GlobalContext, IDefaultGlobal } from '../../context/globalcontext';
import { CrewMember, EquipmentSlot } from "../../model/crew";
import { EquipmentItem } from '../../model/equipment';
import { PlayerCrew, PlayerData } from "../../model/player";
import { qbitsToSlots, qbProgressToNext } from '../../utils/crewutils';
import { printShortDistance } from '../../utils/misc';
import { BuffStatTable } from '../../utils/voyageutils';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import ItemDisplay from '../itemdisplay';
import { Label, Progress } from 'semantic-ui-react';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';

export interface CrewItemsViewProps {
    crew: PlayerCrew | CrewMember;
    flexDirection?: 'row' | 'column';
    mobileWidth?: number;
    itemSize?: number;
    mobileSize?: number;
    quipment?: boolean;
    printNA?: string | JSX.Element;
    targetGroup?: string;
    locked?: boolean;
    vertical?: boolean;
    alwaysHideProgress?: boolean;
}

function expToDate(playerData: PlayerData, crew: PlayerCrew) {
    if (playerData?.calc?.lastModified) {
        let dnum = Math.floor(playerData.calc.lastModified.getTime() / 1000);
        let result = (crew.kwipment_expiration?.map((kw: number | number[], idx: number) => {
            if (kw === 0) return undefined;
            let n = 0;
            if (typeof kw === 'number') {
                n = (dnum+kw);
            }
            else {
                n = (dnum+kw[1]);
            }
            let control = new Date(dnum * 1000);
            let result = new Date(n * 1000);
            return result;

        })) as Date[];
        if (!result) result = [];
        return result;
    }
    return undefined;
}


export const CrewItemsView = (props: CrewItemsViewProps) => {
	const context = React.useContext(GlobalContext);
    const { t } = context.localized;
	const playerContext = context.player;
	const mobileWidth = props.mobileWidth ?? DEFAULT_MOBILE_WIDTH;

    const crew = props.crew as PlayerCrew;
    const quip = !!props.quipment;

    const { targetGroup, locked, vertical, alwaysHideProgress } = props;

    const maxqIdx = (!quip ? 0 : (crew ? qbitsToSlots(crew.q_bits) : 0)) - 1;

    const [toNext, next] = (!!alwaysHideProgress || !quip || !crew.have || crew.immortal !== -1) ? [0, 0] : qbProgressToNext(crew.q_bits);
6
    let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext?.maxBuffs ?? context.core?.all_buffs;
    crew.equipment ??= [];
    let startlevel = Math.floor(crew.level / 10) * 4;
    if (crew.level % 10 == 0 && crew.equipment.length >= 1) startlevel = startlevel - 4;
    let equip = [] as EquipmentItem[];
    let expirations: Date[] | undefined = undefined;

    if (!quip) {
        if (!crew.equipment_slots[startlevel] || !context.core.items?.length) {

            // some crew have incomplete slots.
            // since in most cases, these crew are for show, only,
            // their level will be 100. We'll look for crew around
            // the given level and see if it's there.
            [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));

            let lvl = crew.level;
            if (lvl % 10) lvl = lvl - (lvl % 10);
            if (lvl === 100) lvl = 90;
            let ceq = crew.equipment_slots.filter(eq => eq.level >= lvl && eq.level <= lvl + 10);
            if (ceq?.length && ceq.length >= 4) {
                ceq = ceq.slice(ceq.length - 4);
                let i = 0;
                for (let eq of ceq) {
                    let ef = context.core.items.find(item => item.symbol === eq.symbol);
                    if (ef) {
                        equip[i++] = (JSON.parse(JSON.stringify(ef)));
                    }
                }
            }
        } else {

            [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));

            for (let i = startlevel; i < startlevel + 4; i++) {
                let eq: EquipmentSlot;
                eq = crew.equipment_slots[i];

                if (eq) {
                    let ef = context.core.items.find(item => item.symbol === eq.symbol);
                    if (ef) {
                        equip[i - startlevel] = (JSON.parse(JSON.stringify(ef)));
                    }
                }
            }
        }
    }
    else {
        if (context.player.playerData) {
            expirations = expToDate(context.player.playerData, crew);
        }

        [0, 1, 2, 3].forEach(i => equip.push({} as EquipmentItem));
        if (crew.kwipment?.length && !crew.kwipment_slots) {
            if ((crew.kwipment as number[])?.some((q: number) => !!q)) {
                let quips = (crew.kwipment as number[]).map(q => context.core.items.find(i => i.kwipment_id?.toString() === q.toString()) as EquipmentItem)?.filter(q => !!q) ?? [];
                crew.kwipment_slots = quips.map(q => {
                    return {
                        level: 100,
                        symbol: q.symbol,
                        imageUrl: q.imageUrl
                    }
                });
            }
        }
        for (let i = 0; i < 4; i++) {
            let eq: number | undefined = undefined;

            if (crew.kwipment_slots?.length) {
                if (crew.kwipment.length > i) {
                    if (typeof crew.kwipment[i] === 'number') {
                        eq = crew.kwipment[i] as number;
                    }
                    else {
                        eq = crew.kwipment[i][1] as number;
                    }
                }
            }

            equip[i] ??= {} as EquipmentItem;

            if (eq) {
                let ef = context.core.items.find(item => item?.kwipment_id?.toString() === eq?.toString());
                if (ef) {
                    equip[i] = (JSON.parse(JSON.stringify(ef)));
                }
            }
            else {
                if (maxqIdx < i) {
                    equip[i].name = "Quipment slot is locked.";
                    // equip[i].imageUrl = "atlas/minus_round_icon.png";
                }
                else {
                    equip[i].name = "Quipment slot is unequipped.";
                }
            }
        }
    }

    if (!quip && !!crew.equipment) {
        [0, 1, 2, 3].forEach(idx => {
            if ((crew.equipment as number[]).indexOf(idx) < 0) {
                equip[idx].imageUrl = "items_equipment_box02_icon.png"
                equip[idx].empty = true;
                equip[idx].rarity = 0;
            }
        });
    }
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

	return (
        !context.core.items?.length &&
            <div className='ui medium centered text active inline loader'>{t('spinners.default')}</div>
        ||context.core.items?.length &&
            <div style={{...flexCol, gap: 0}}>
            {!!crew.kwipment_prospects && quip && <Label color='blue'><i>{t('voyage.quipment.title')}</i></Label> }
            <div style={{
                display: "flex",
                flexDirection: vertical ? 'column' : 'row',
                justifyContent: "center",
                alignItems: "center",
                margin: 0,
                padding: 0
            }}>
            {equip.map((item, idx) => (
                    <CrewItemDisplay
                        key={`${crew.id}_${crew.symbol}_${idx}_${item.symbol}__crewEquipBox`}
                        context={context}
                        vertical={!!vertical}
                        targetGroup={targetGroup}
                        style={(quip && maxqIdx < idx) ? { opacity: locked ? "0.50" : "0.25" } : undefined}
                        locked={locked && (quip && maxqIdx < idx)}
                        itemSize={props.itemSize}
                        mobileSize={props.mobileSize}
                        mobileWidth={mobileWidth}
                        crew={crew}
                        expiration={expirations ? (expirations[idx] ? printShortDistance(expirations[idx]) : <>{props.printNA && item.symbol ? props.printNA : <br/>}</>) : undefined}
                        equipment={item} />
                ))}
            </div>
            {!!next && <div style={{textAlign: 'center', margin: '0 0.5em', fontSize: '0.8em'}}><Progress size='tiny' total={next} value={next - toNext} style={{marginBottom: '0px'}} />({next - toNext}/{next})</div>}
            </div>
        || <></>

	);
};

export interface CrewItemDisplayProps extends CrewItemsViewProps {
    equipment?: EquipmentItem;
    expiration?: string | JSX.Element;
    vertical: boolean;
    itemSize?: number;
    mobileSize?: number;
    style?: React.CSSProperties;
    targetGroup?: string;
    context: IDefaultGlobal;
}

export const CrewItemDisplay = (props: CrewItemDisplayProps) => {

    const globalContext = props.context;

    const { locked, style, targetGroup, vertical, equipment, mobileWidth, mobileSize, expiration } = props;

    const itemSize = window.innerWidth < (mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? (mobileSize ?? 24) : (props.itemSize ?? 32);

    return (<div
        onClick={(e) => !targetGroup ? navigate("/item_info?symbol=" + props.equipment?.symbol) : null}
        title={equipment?.name}
        style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        margin: window.innerWidth < (mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? "0.15em" : "0.25em",
        marginTop: vertical ? 0 : window.innerWidth < (mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? "0.15em" : "0.25em",
        marginBottom: vertical ? 0 : window.innerWidth < (mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? "0.15em" : "0.25em",
        //...this.props.style
    }}>
        <div style={{display:'flex', flexDirection:'column', alignItems: 'center', justifyContent: "center"}}>
        {!!expiration && <div style={{fontSize: "0.75em", textAlign: 'center'}}>{expiration}</div>}
        <ItemDisplay
            style={style}
            targetGroup={targetGroup}
            itemSymbol={equipment?.symbol}
            allItems={globalContext.core.items}
            playerData={globalContext.player.playerData}
            src={`${process.env.GATSBY_ASSETS_URL}${equipment?.imageUrl ?? "items_equipment_box02_icon.png"}`}
            size={itemSize}
            maxRarity={equipment?.rarity ?? 0}
            rarity={equipment?.rarity ?? 0}
        />
        {locked && <img style={{position: "relative", marginTop:"-16px", height: "16px"}} src={`${process.env.GATSBY_ASSETS_URL}atlas/lock_icon.png`}/>}
        </div>
    </div>)

}
