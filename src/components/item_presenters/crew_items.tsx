import * as React from 'react';

import { Button, Icon, Label, Modal, Progress, Table } from 'semantic-ui-react';
import { GlobalContext, IDefaultGlobal } from '../../context/globalcontext';
import { CrewMember, EquipmentSlot } from "../../model/crew";
import { EquipmentItem } from '../../model/equipment';
import { PlayerCrew, PlayerData } from "../../model/player";
import { getCrewQuipment, qbitsToSlots, qbProgressToNext } from '../../utils/crewutils';
import { printShortDistance } from '../../utils/misc';
import { DEFAULT_MOBILE_WIDTH } from '../hovering/hoverstat';
import ItemDisplay from '../itemdisplay';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';
import { getRealCrewLevel } from '../../utils/equipment';
import { useNavigate } from 'react-router-dom';
import { AvatarView } from './avatarview';
import { getItemBonuses, getItemWithBonus, isQuipmentMatch } from '../../utils/itemutils';
import CrewStat from './crewstat';

export interface CrewItemsViewProps {
    crew: PlayerCrew | CrewMember;
    nonInteractive?: boolean;
    flexDirection?: 'row' | 'column';
    mobileWidth?: number;
    itemSize?: number;
    mobileSize?: number;
    quipment?: boolean;
    printNA?: string | React.ReactNode;
    targetGroup?: string;
    locked?: boolean;
    altProspectText?: string;
    vertical?: boolean;
    alwaysHideProgress?: boolean;
    alwaysShowProgress?: boolean;
    gap?: string;
    prospectsClicked?: (data?: PlayerCrew) => void;
    altItemClick?: (data: EquipmentItem | undefined, idx: number) => void;
}

function expToDate(playerData: PlayerData, crew: PlayerCrew) {
    if (playerData?.calc?.lastModified) {
        let dnum = Math.floor(playerData.calc.lastModified.getTime() / 1000);
        let result = (crew.kwipment_expiration?.map((kw: number | number[]) => {
            if (kw === 0) return undefined;
            let n: number;
            if (typeof kw === 'number') {
                n = (dnum+kw);
            }
            else {
                n = (dnum+kw[1]);
            }
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
	const mobileWidth = props.mobileWidth ?? DEFAULT_MOBILE_WIDTH;

    const crew = props.crew as PlayerCrew;
    const quip = !!props.quipment;

    const { targetGroup, locked, vertical, alwaysHideProgress, alwaysShowProgress } = props;

    const maxqIdx = (!quip ? 0 : (crew ? qbitsToSlots(crew.q_bits) : 0)) - 1;

    const [toNext, next] = alwaysShowProgress && crew.q_bits >= 1300 ? [0, 1300] : (!!alwaysHideProgress || !quip || !crew.have || crew.immortal !== -1) ? [0, 0] : qbProgressToNext(crew.q_bits);

    crew.equipment ??= [];
    let startlevel: number;
    let { level: lvl } = getRealCrewLevel(crew);
    startlevel = Math.floor(lvl / 10) * 4;
    // if (crew.local_slots?.length && crew.local_slots[0]?.level === crew.level) {
    //     startlevel = Math.floor(crew.local_slots[0].level / 10) * 4;
    // }
    // else {
    //     startlevel = Math.floor(crew.level / 10) * 4;
    //     if (crew.level % 10 == 0 && crew.equipment.length >= 1) startlevel = startlevel - 4;
    // }
    let equip = [] as EquipmentItem[];
    let disabled = [] as boolean[];
    let expirations: Date[] | undefined = undefined;

    [0, 1, 2, 3].forEach(i => {
        equip.push({} as EquipmentItem);
        disabled.push(false);
    });

    if (!quip) {
        if (!crew.equipment_slots[startlevel] || !context.core.items?.length) {

            // some crew have incomplete slots.
            // since in most cases, these crew are for show, only,
            // their level will be 100. We'll look for crew around
            // the given level and see if it's there.

            let lvl = crew.level;
            if (crew.local_slots?.length && crew.local_slots[0]?.level === crew.level) {
                lvl = crew.local_slots[0].level;
            }
            else {
                if (lvl % 10) lvl = lvl - (lvl % 10);
                if (lvl === 100) lvl = 90;
            }
            let ceq = crew.equipment_slots.filter(eq => eq.level >= lvl && eq.level <= lvl + 10);
            if (ceq?.length && ceq.length >= 4) {
                ceq = ceq.slice(ceq.length - 4);
                let i = 0;
                for (let eq of ceq) {
                    let ef = context.core.items.find(item => item.symbol === eq.symbol);
                    if (ef) {
                        equip[i++] = (structuredClone(ef));
                    }
                }
            }
        } else {
            for (let i = startlevel; i < startlevel + 4; i++) {
                let eq: EquipmentSlot;
                eq = crew.equipment_slots[i];

                if (eq) {
                    let ef = context.core.items.find(item => item.symbol === eq.symbol);
                    if (ef) {
                        equip[i - startlevel] = (structuredClone(ef));
                        disabled[i - startlevel] = eq.level > crew.level;
                    }
                }
            }
        }
    }
    else {
        if (context.player.playerData) {
            expirations = expToDate(context.player.playerData, crew);
        }

        if (crew.kwipment?.length && !crew.kwipment_slots) {
            if ((crew.kwipment as number[])?.some((q: number) => !!q)) {
                let quips = (crew.kwipment as number[]).map(q => context.core.items.find(i => i.kwipment_id?.toString() === q.toString()) as EquipmentItem)?.filter(q => !!q) ?? [];
                // eslint-disable-next-line react-hooks/immutability
                crew.kwipment_slots = quips.map(q => {
                    return {
                        level: 100,
                        symbol: q.symbol,
                        imageUrl: q.imageUrl,
                        archetype: q.id ? Number(q.id) : q.archetype_id
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
                    equip[i] = (structuredClone(ef));
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
            {!!crew.kwipment_prospects && quip && <Label
            style={{cursor: props.prospectsClicked ? 'pointer' : undefined}}
            onClick={() => props.prospectsClicked ? props.prospectsClicked(crew) : false}
            color='blue'><i>{props.altProspectText || t('voyage.quipment.title')}</i></Label> }
            <div style={{
                display: "flex",
                flexDirection: vertical ? 'column' : 'row',
                justifyContent: "center",
                alignItems: "center",
                margin: 0,
                padding: 0,
                gap: props.gap
            }}>
            {equip.map((item, idx) => (
                    <CrewItemDisplay
                        idx={idx}
                        nonInteractive={props.nonInteractive}
                        key={`${crew.id}_${crew.symbol}_${idx}_${item.symbol}__crewEquipBox`}
                        context={context}
                        vertical={!!vertical}
                        altProspectText={props.altProspectText}
                        targetGroup={targetGroup}
                        style={(quip && maxqIdx < idx) || disabled[idx] ? { opacity: locked ? "0.50" : "0.25" } : undefined}
                        locked={getLocked(idx)}
                        itemSize={props.itemSize}
                        mobileSize={props.mobileSize}
                        prospectsClicked={props.prospectsClicked}
                        mobileWidth={mobileWidth}
                        crew={crew}
                        altItemClick={(quip && maxqIdx < idx) || disabled[idx] ? undefined : props.altItemClick}
                        expiration={expirations ? (expirations[idx] ? printShortDistance(expirations[idx]) : <>{props.printNA && item.symbol ? props.printNA : <br/>}</>) : undefined}
                        equipment={item} />
                ))}
            </div>
            {(!!next || !!alwaysShowProgress) &&
                <div style={{textAlign: 'center', margin: '0 0.5em', fontSize: '0.8em'}}>
                <Progress
                    progress={false}
                    success={false}
                    autoSuccess={false}
                    size='tiny'
                    total={next}
                    value={next - toNext}
                    style={{marginBottom: '0px'}} />
                ({next - toNext}/{next})
                </div>}
            </div>
        || <></>

	);

    function getLocked(idx: number) {
        return (locked && (quip && maxqIdx < idx)) || (locked && !quip && disabled[idx])
    }
};

export interface CrewItemDisplayProps extends CrewItemsViewProps {
    equipment?: EquipmentItem;
    expiration?: string | React.ReactNode;
    vertical: boolean;
    idx?: number;
    itemSize?: number;
    mobileSize?: number;
    style?: React.CSSProperties;
    targetGroup?: string;
    context: IDefaultGlobal;
}

export const CrewItemDisplay = (props: CrewItemDisplayProps) => {

    const navigate = useNavigate();

    const { altItemClick, locked, nonInteractive, style, targetGroup, vertical, equipment, mobileWidth, mobileSize, expiration, prospectsClicked, idx } = props;

    const itemSize = window.innerWidth < (mobileWidth ?? DEFAULT_MOBILE_WIDTH) ? (mobileSize ?? 24) : (props.itemSize ?? 32);

    const itemClick = (() => {
        if (altItemClick) {
            altItemClick(equipment, idx || 0);
        }
        else if (!nonInteractive && !targetGroup && !!equipment?.symbol) {
            navigate("/item_info?symbol=" + equipment.symbol)
        }
    });

    return (<div
        onClick={(e) => itemClick()}
        title={equipment?.name}
        style={{
        cursor: (equipment?.symbol || altItemClick) ? "pointer" : 'no-drop',
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
        <AvatarView
            style={style}
            mode='item'
            symbol={equipment?.symbol}
            item={equipment}
            size={itemSize}
            src={`${process.env.VITE_ASSETS_URL}${equipment?.imageUrl ?? "items_equipment_box02_icon.png"}`}
            />

        {locked && <img style={{position: "relative", marginTop:"-16px", height: "16px"}} src={`${process.env.VITE_ASSETS_URL}atlas/lock_icon.png`}/>}
        </div>
    </div>)
}

export type QuipmentPickerModalProps = {
    crew: PlayerCrew | CrewMember,
    current?: EquipmentItem;
    setCurrent: (value: EquipmentItem | undefined, old_value: EquipmentItem | undefined, idx: number) => void,
    idx?: number,
    equipment?: EquipmentItem[];
    show: boolean;
    setShow: (value: boolean) => void;
}

export const QuipmentPickerModal = (props: QuipmentPickerModalProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { equipment, crew, current, setCurrent, idx, show, setShow } = props;

    const [proposed, setProposed] = React.useState(current);

    const { items, itemsWithBonus } = React.useMemo(() => {
        const quips = (equipment || globalContext.core.items.filter(i => i.type === 14));
        const items = quips.filter(quip => isQuipmentMatch(crew as PlayerCrew, quip) && (proposed?.symbol === quip.symbol || current?.symbol === quip.symbol || !crew.kwipment?.some(k => Number(quip.id) == k)));
        const itemsWithBonus = items.map(item => getItemWithBonus(item));
        return { items, itemsWithBonus };
    }, [equipment, globalContext.core.items, proposed]);

    return (<>
        <Modal size={'small'} open={show}>
            <Modal.Header>
                { (
                    <div style={{
                            gap: '1em',
                            fontSize: '1rem',
                            alignItems: 'center',
                            margin: '0 2em',
                            wordWrap: 'normal',
                            maxWidth: '75%',
                            display: 'grid',
                            gridTemplateAreas: `'a b'`,
                        }}>
                        <AvatarView
                            style={{gridArea: 'a'}}
                            mode='item'
                            item={proposed}
                            size={48}
                            src={`${process.env.VITE_ASSETS_URL}${proposed?.imageUrl ?? "items_equipment_box02_icon.png"}`}
                            />
                        <div style={{gridArea:'b'}}>
                            {proposed?.name || t('global.none')}
                        </div>
                    </div>
                )}

            </Modal.Header>
            <Modal.Content style={{maxHeight: '25em', overflowY: 'auto'}}>
                <Table striped selectable>
                    <Table.Body>
                        {items.map((available, idx) => {
                            const bonuses = Object.values(itemsWithBonus[idx].bonusInfo.bonuses);

                            return (
                                <Table.Row key={`quipment_pickeR_modal_${available.symbol}`}
                                    onClick={() => setProposed(available)}
                                    style={{ cursor: 'pointer' }}
                                    >
                                    <Table.Cell width={1}>
                                        {proposed?.symbol === available.symbol && <Icon name='check' color='green' />}
                                    </Table.Cell>
                                    <Table.Cell width={1}>
                                        <div
                                            style={{...OptionsPanelFlexColumn}}>
                                            <AvatarView
                                                mode='item'
                                                item={available}
                                                size={48}
                                                />
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {available.name}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div style={{...OptionsPanelFlexColumn, alignItems: 'flex-start', justifyContent: 'center'}}>
                                        {bonuses?.map((skill, idx) => {
                                            return (
                                                <CrewStat style={{fontSize: '1rem'}} key={`stat_${idx}_${skill.skill}_${available.symbol}`} skill_name={skill.skill} data={skill} />
                                            )
                                        })}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            )
                        })}
                    </Table.Body>
                </Table>
            </Modal.Content>
            <Modal.Header style={{float: 'right'}}>
                <Button onClick={() => cancel()}>
                    {t('global.cancel')}
                </Button>
                <Button onClick={() => setProposed(undefined)}>
                    {t('global.clear')}
                </Button>
                <Button onClick={() => setProposed(current)}>
                    {t('global.reset')}
                </Button>
                <Button onClick={() => accept()}>
                    {t('global.apply')}
                </Button>
            </Modal.Header>
        </Modal>
    </>)

    function accept() {
        setCurrent(proposed, current, props.idx || 0);
        setShow(false);
    }

    function cancel() {
        setProposed(current);
        setShow(false);
    }

}