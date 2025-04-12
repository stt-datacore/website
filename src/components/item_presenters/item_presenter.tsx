import { navigate } from "gatsby";
import React, { Component } from "react";
import { Grid, Header, Rating, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { Skill } from "../../model/crew";
import { EquipmentItem } from "../../model/equipment";
import { PlayerCrew, TranslateMethod } from "../../model/player";
import { ItemBonusInfo, combineBonuses, formatDuration, getItemBonuses } from "../../utils/itemutils";
import { TinyStore } from "../../utils/tiny";
import CONFIG from "../CONFIG";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import ItemDisplay from "../itemdisplay";
import { printRequiredTraits } from "../items/utils";
import ItemSources from "../itemsources";
import { OptionsPanelFlexColumn } from "../stats/utils";
import { AvatarView } from "./avatarview";
import { CrewItemsView } from "./crew_items";
import { PresenterProps } from "./ship_presenter";


export function renderKwipmentBonus(kwipment: number[], items: EquipmentItem[], prospect?: boolean, t?: TranslateMethod, crew?: PlayerCrew, for_export?: boolean) {
    if (!kwipment || kwipment.every(k => !k)) return <></>;
    let quip = items.filter(f => kwipment.some(q => !!q && q.toString() === f.kwipment_id?.toString()));
    let bonuses = [] as ItemBonusInfo[];
    for (let q of quip) {
        bonuses.push(getItemBonuses(q));
    }
    let combined = combineBonuses(bonuses.map(b => b.bonuses));
    if (crew) {
        return (
            <>
                <CrewItemsView crew={crew} quipment={true} />
                {renderBonuses(combined, undefined, undefined, prospect, t, for_export)}
            </>
        )
    }
    else {
        return renderBonuses(combined, undefined, undefined, prospect, t, for_export);
    }

}

export function renderBonuses(skills: { [key: string]: Skill }, maxWidth?: string, margin?: string, prospect?: boolean, t?: TranslateMethod, for_export?: boolean) {
    const flexCol = OptionsPanelFlexColumn;

    if (for_export) {
        return (<Table>
            {!!prospect && !!t && <div style={flexCol}>{t('voyage.quipment.title')}</div>}
            {Object.values(skills).map(((skill, idx) => {
                const atext = CONFIG.SKILLS[skill.skill!];
                return (
                    <Table.Row
                        title={atext}
                        key={(skill.skill ?? "") + idx}>
                        <Table.Cell>
                        <div style={{ width: maxWidth ?? "2em", marginRight: "0.5em" }}>
                            {CONFIG.SKILLS_SHORT.find(sk => sk.name === skill.skill)?.short}
                        </div>
                        </Table.Cell>
                        <Table.Cell>
                        <h4 style={{ margin: margin ?? "0.5em" }} >+{skill.core ?? 0} +({skill.range_min ?? 0}-{skill.range_max ?? 0})</h4>
                        </Table.Cell>
                        <Table.Cell>
                        <h4 style={{ margin: margin ?? "0.5em" }} >{atext}</h4>
                        </Table.Cell>
                    </Table.Row>)
            }))}
        </Table>)
    }
    else {
        return (<div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignItems: "left"
        }}>
            {!!prospect && !!t && <div style={flexCol}>{t('voyage.quipment.title')}</div>}
            {Object.values(skills).map(((skill, idx) => {
                const atext = CONFIG.SKILLS[skill.skill!];
                return (
                    <div
                        title={atext}
                        key={(skill.skill ?? "") + idx}
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "flex-start",
                            alignItems: "center",
                            alignContent: "center"
                        }}
                    >
                        <div style={{ width: maxWidth ?? "2em", marginRight: "0.5em" }}>
                            <img style={{ maxHeight: "2em", maxWidth: maxWidth ?? "2em", margin: margin ?? "0.5em", marginLeft: "0" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill.skill}.png`} />
                        </div>
                        <h4 style={{ margin: margin ?? "0.5em" }} >+{skill.core ?? 0} +({skill.range_min ?? 0}-{skill.range_max ?? 0})</h4>
                        <h4 style={{ margin: margin ?? "0.5em" }} >{atext}</h4>
                    </div>)
            }))}
        </div>)
    }

}


export type DemandMode = "all" | "immediate";

export interface ItemPresenterProps extends PresenterProps {
    item: EquipmentItem;
    openItem?: (item: EquipmentItem) => void;
    crewTargetGroup?: string;
    compact?: boolean;
}

export interface ItemPresenterState {
    mobileWidth: number;
}

export class ItemPresenter extends Component<ItemPresenterProps, ItemPresenterState> {
    static contextType = GlobalContext;
    declare context: React.ContextType<typeof GlobalContext>;

    tiny: TinyStore;

    constructor(props: ItemPresenterProps) {
        super(props);
        this.state = {
            ... this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH
        }

        this.tiny = TinyStore.getStore(props.storeName)
    }

    public get demandMode(): DemandMode {
        return this.tiny.getValue<DemandMode>("demandMode", "all") ?? "all"
    }

    public set demandMode(value: DemandMode) {
        if (this.demandMode === value) return;
        this.tiny.setValue("demandMode", value);
        this.forceUpdate();
    }

    render(): JSX.Element {
        const { t, tfmt } = this.context.localized;
        const { item: item, touched, tabs, showIcon } = this.props;
        const { playerData } = this.context.player;
        const { items } = this.context.core;
        const { mobileWidth } = this.state;
        const compact = this.props.compact ?? this.props.hover;
        const roster = playerData?.player?.character?.crew ?? [];
        const mode = this.demandMode;

        if (!item) {
            return <></>
        }
        item.item_sources?.sort((a, b) => {
            let r = (a.avg_cost ?? 0) - (b.avg_cost ?? 0);
            if (!r) r = a.name.localeCompare(b.name);
            return r;
        });
        const frozenStyle: React.CSSProperties = {
            background: 'transparent',
            color: 'white',
            cursor: "default",
            marginRight: "0px"
        }

        const checkedStyle: React.CSSProperties = {
            color: "lightgreen",
            marginRight: "0px"
        }

        var me = this;

        const demandOpts = [{
            key: "all",
            value: "all",
            text: "All Upcoming Demands"
        },
        {
            key: "immediate",
            value: "immediate",
            text: "Immediate Demands"
        }];

        const navClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, altItem?: EquipmentItem) => {
            altItem ??= item;
            if (!altItem) return;
            if (this.props.openItem) {
                this.props.openItem(altItem);
            }
        }

        let mt = true;
        const dcrew = item.demandCrew?.map(sym => {
            const crew = roster.find(f => {
                if (f.symbol !== sym || (f.level === 100 && f.equipment?.length === 4)) return false;
                // if (mode === 'immediate') {
                //     let startlevel = Math.floor(f.level / 10) * 4;
                //     if (f.level % 10 == 0 && f.equipment.length >= 1) startlevel = startlevel - 4;

                //     for (let bd of Object.values(f.equipment)) {
                //         let eqnum = startlevel + (bd as number);
                //         f.equipment_slots[eqnum].symbol
                //     }

                // }
                return f;
            });
            if (crew) mt = false;
            return (<>
                {crew && <div
                    onClick={(e) => navigate("/crew/" + crew.symbol)}
                    style={{
                        cursor: "pointer",
                        textAlign: "center",
                        display: "flex",
                        width: "96px",
                        margin: "1em",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center"
                    }}>
                    <ItemDisplay
                        targetGroup={this.props.crewTargetGroup}
                        playerData={playerData}
                        allCrew={this.context.core.crew}
                        itemSymbol={sym}
                        rarity={crew.rarity}
                        maxRarity={crew.max_rarity}
                        size={64}
                        src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                    />
                    <i>{crew?.name}</i>
                </div> || <></>}
            </>)
        });

        const empty = mt;

        if (!item) return <></>;
        const { bonuses, bonusText } = getItemBonuses(item);
        const ltMargin = 0;
        const traits = this.context.localized.TRAIT_NAMES;

        return (<div style={{
            fontSize: "12pt",
            display: "flex",
            textAlign: 'left',
            flexDirection: window.innerWidth < mobileWidth ? "column" : "row",
            //width: window.innerWidth < mobileWidth ? "calc(100vw - 16px)" : undefined

        }}>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start" }}>
                {touched && <>
                    <i className='close icon' style={{ cursor: "pointer" }} onClick={(e) => this.props.close ? this.props.close() : undefined} />
                </>}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
                    <AvatarView
                        //src={`${process.env.GATSBY_ASSETS_URL}${item.imageUrl}`}
                        size={compact ? 128 : 128}
                        //rarity={item.rarity}
                        //maxRarity={item.rarity}
                        item={item}
                        partialItem={true}
                        mode='item'
                        style={{ maxWidth: "calc(100vw - 32px)", marginRight: "8px" }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-around", fontStyle: "italic", fontSize: "0.8em" }}>
                        {!!item.quantity && !!item.needed && <div>{t("items.n_owned", { n: `${item.quantity.toLocaleString()}` })}, {t("items.n_needed", { n: `${item.needed.toLocaleString()}` })}</div>}
                        {!!item.quantity && !item.needed && !!item.isReward && <div>{t("items.n_rewarded", { n: `${item.quantity.toLocaleString()}` })}</div>}
                        {!!item.quantity && !item.needed && !item.isReward && <div>{t("items.n_owned", { n: `${item.quantity.toLocaleString()}` })}</div>}
                        {!item.quantity && !!item.needed && <div>{t("items.n_needed", { n: `${item.needed.toLocaleString()}` })}</div>}
                    </div>
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: !empty ? "8em" : "5em",
                    justifyContent: "space-between",
                    maxWidth: window.innerWidth < mobileWidth ? "15em" : (!empty ? "34em" : "24em"),
                    minWidth: "15m",
                }}
            >
                <div style={{ display: "flex", flexDirection: 'column', justifyContent: "flex-start" }}>
                    <h3 style={{ margin: "2px 8px", padding: "8px", marginLeft: "0px", paddingLeft: "0px" }}>
                        <a onClick={(e) => navClick(e)} style={{ cursor: "pointer" }} title={item.name}>
                            {item.name}
                        </a>
                    </h3>
                    <div style={{ margin: "4px", marginLeft: 0, display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <Rating
                            icon='star'
                            rating={item.rarity}
                            maxRating={item.rarity}
                            size='large'
                            disabled />
                    </div>
                    <div
                        style={{
                            textAlign: "left",
                            fontStyle: "italic",
                            fontSize: "0.85em",
                            marginTop: "2px",
                            marginBottom: "4px",
                        }}
                    >
                        <i>{item.flavor?.replace(/\<b\>/g, '').replace(/\<\/b\>/g, '')}</i>
                    </div>

                    {!!bonusText.length && renderBonuses(bonuses, "1em", "0.25em")}
                </div>
                {!!item.duration &&
                    <div
                        style={{
                            textAlign: "left",
                            //fontStyle: "italic",
                            fontSize: "0.75em",
                            marginTop: "2px",
                            marginBottom: "4px",
                            marginLeft: ltMargin
                        }}
                    >
                        <div><b>{t('ship.duration')}:</b>&nbsp;
                            <i>{formatDuration(item.duration, t)}</i></div>
                    </div>}
                {!!item.max_rarity_requirement &&
                    <div style={{
                        textAlign: "left",
                        //fontStyle: "italic",
                        fontSize: "0.75em",
                        marginTop: "2px",
                        marginBottom: "4px",
                        marginLeft: ltMargin
                    }}>
                        {tfmt('items.equippable_by_rarity', {
                            rarity: <span style={{
                                color: CONFIG.RARITIES[item.max_rarity_requirement].color,
                                fontWeight: 'bold'
                            }}>{CONFIG.RARITIES[item.max_rarity_requirement].name}
                            </span>
                        })}
                    </div>}
                {!!item.kwipment && !!item.traits_requirement?.length &&
                    <div
                        style={{
                            textAlign: "left",
                            //fontStyle: "italic",
                            fontSize: "0.75em",
                            marginTop: "2px",
                            marginBottom: "4px",
                            marginLeft: ltMargin
                        }}
                    >
                        <div><b>
                            {tfmt('items.required_traits', { traits: <i>{printRequiredTraits(item, traits, t)}</i> })}
                        </b>
                        </div>
                    </div>}
                <div>
                    {!!((item.item_sources?.length ?? 0) > 0) && (
                        <div style={{ fontSize: "8pt", marginRight: "1em", marginTop: "0.5em" }}>
                            <Header as="h3">{t('items.item_sources')}:</Header>
                            <ItemSources refItem={item.symbol} brief={true} item_sources={item.item_sources} />
                            <br />
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", marginBottom: "1em" }}>
                    {!!(item.recipe?.list?.length) && !compact && (
                        <div style={{ fontSize: "8pt" }}>
                            <Header as="h3">{t('items.recipe')}:</Header>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "top",
                                textAlign: "center",
                                justifyContent: "flex-start",
                                flexWrap: "wrap",
                                overflow: "auto",
                                maxHeight: "320px"
                            }}>
                                {item.recipe.list.map((ing, idx) => {
                                    let ingitem = items?.find(f => f.symbol === ing.symbol);
                                    const demand = item.demands?.find(f => f.symbol === ing.symbol);
                                    if (ingitem && demand) {
                                        ingitem = { ...ingitem, quantity: demand.have, needed: demand.count };
                                    }
                                    if (!ingitem) return <></>
                                    return (
                                        <div key={"recipe_component_hover_" + ing.symbol + item.symbol + idx}
                                            style={{
                                                width: "96px",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                textAlign: "center",
                                                margin: "1em",
                                                padding: 0
                                            }}>
                                            <a onClick={(e) => navClick(e, ingitem)} style={{ cursor: "pointer" }} title={ingitem.name}>
                                                <ItemDisplay
                                                    src={`${process.env.GATSBY_ASSETS_URL}${ingitem.imageUrl}`}
                                                    rarity={ingitem.rarity}
                                                    maxRarity={ingitem.rarity}
                                                    size={48}
                                                />
                                            </a>
                                            <i>{ingitem.name}&nbsp;({ing.count})</i>
                                            <div>
                                            {tfmt('items.n_owned',
                                                {
                                                    n: <span style={{color: ingitem.quantity && ingitem.quantity >= ing.count ? undefined : 'tomato' }}>{ingitem.quantity || '0'}</span>
                                                }
                                            )}
                                            </div>
                                        </div>)
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", marginBottom: "1em" }}>
                    {!empty &&
                        (<div>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between"
                            }}>
                                <Header as="h3">{t('items.current_demands')}:</Header>
                                {/* <div style={{fontSize: "0.8em"}}>
                                <Dropdown
                                    options={demandOpts}
                                    value={this.demandMode}
                                    onChange={(e, { value }) => this.demandMode = value as DemandMode}
                                    />
                                </div> */}
                            </div>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "flex-start",
                                alignItems: "flex-start",
                                maxHeight: "252px",
                                overflow: "auto",
                                flexWrap: "wrap"
                            }}>

                                {dcrew}
                            </div>
                        </div>)}
                </div>
            </div>
        </div>)

    }

}