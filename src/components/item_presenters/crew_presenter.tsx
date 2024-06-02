import * as React from "react";
import { CrewMember, Skill, SkillData } from "../../model/crew";
import { CompletionState, PlayerBuffMode, PlayerCrew, PlayerImmortalMode } from "../../model/player";
import { Dropdown, Rating } from "semantic-ui-react";
import CrewStat from "../crewstat";
import {
    formatTierLabel,
    getSkills,
    gradeToColor,
    prettyObtained,
    printPortalStatus,
} from "../../utils/crewutils";
import { printImmoText } from "../../utils/crewutils";
import { ShipSkill } from "./shipskill";
import { TinyStore } from "../../utils/tiny";
import { PresenterProps } from "./ship_presenter";
import { StatLabelProps } from "../statlabel";
import { Label } from "semantic-ui-react";

import { Image } from "semantic-ui-react";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { GlobalContext } from "../../context/globalcontext";
import { CrewItemsView } from "./crew_items";
import {
    BuffNames,
    ImmortalNames,
    getAvailableBuffStates,
    nextImmortalState,
    nextBuffState,
    CrewPreparer,
    ProspectImmortalNames,
} from "./crew_preparer";
import {
    PresenterPlugin,
    PresenterPluginBase,
    PresenterPluginProps,
} from "./presenter_plugin";
import { Ship } from "../../model/ship";
import { navigate } from "gatsby";
import CONFIG from "../CONFIG";

const dormantStyle: React.CSSProperties = {
    background: "transparent",
    color: "gray",
    cursor: "pointer",
};

const disableStyle: React.CSSProperties = {
    background: "transparent",
    color: "gray",
};

const activeStyle: React.CSSProperties = {
    background: "transparent",
    color: "#FFE623",
    cursor: "pointer",
};

const ownedGreenStyle: React.CSSProperties = {
    ...activeStyle,
    color: "lightgreen",
};

const ownedBlueStyle: React.CSSProperties = {
    ...activeStyle,
    color: "orange",
};

const completeStyle: React.CSSProperties = {
    background: "transparent",
    color: "lightgreen",
    cursor: "default",
};

const frozenStyle: React.CSSProperties = {
    background: "transparent",
    color: "white",
    cursor: "default",
    marginRight: "0px",
};

const checkedStyle: React.CSSProperties = {
    color: "lightgreen",
    marginRight: "0px",
};

export class StatLabel extends React.Component<StatLabelProps> {
    render() {
        const { title, value } = this.props;

        return (            
            <Label
                size={window.innerWidth < DEFAULT_MOBILE_WIDTH ? "small" : "medium"}
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: "0.5em",
                    marginLeft: 0,
                    width:
                        window.innerWidth < DEFAULT_MOBILE_WIDTH ? "12.5em" : "12.75em",
                }}
            >
                {title}
                <Label.Detail>{value}</Label.Detail>
            </Label>
        );
    }
}


export interface CollectionDisplayProps {
    crew: PlayerCrew | CrewMember;
    style?: React.CSSProperties;
}

export const CollectionDisplay = (props: CollectionDisplayProps) => {
    const tinyCol = TinyStore.getStore('collections');
    const dispClick = (e, col: string) => {
        
        navigate("/collections?select=" + encodeURIComponent(col));
    }

    const { crew, style } = props;
    if (!crew.collections?.length) return <></>;
    return (<div style={{
        ... (style ?? {}),
        cursor: "pointer"
    }}>
        {crew.collections?.map((col, idx) => (
            <a onClick={(e) => dispClick(e, col)} key={"collectionText_" + crew.symbol + idx}>
                {col}
            </a>))?.reduce((prev, next) => <>{prev}, {next}</>) ?? <></>}
    </div>)
}


export interface HoverSelectorConfig<T> {
    key: T;
    value: T;
    text?: string;
    content?: JSX.Element;
}

export interface BuffSelectorProps {
    buff: PlayerBuffMode;
    setBuff: (value: PlayerBuffMode) => void;
    style?: React.CSSProperties | undefined;
    available: HoverSelectorConfig<PlayerBuffMode>[];
}

export interface ImmortalSelectorProps {
    immoed?: boolean;
    prospect?: boolean;
    immortalMode: PlayerImmortalMode;
    setImmortalMode: (value: PlayerImmortalMode) => void;
    style?: React.CSSProperties | undefined;
    available: HoverSelectorConfig<PlayerImmortalMode>[];
}


function drawBuff(
    key: string | number,
    data: PlayerBuffMode,
    buffClick?: (value: PlayerBuffMode) => void
): JSX.Element {
    const buffclick = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        buff: PlayerBuffMode
    ) => {
        if (buffClick) {
            e.preventDefault();
            buffClick(buff);
        }
    };
    if (data === "none") {
        return (
            <div key={key} style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => buffclick(e, "none")}
                    className="arrow alternate circle down icon"
                    title="No Boosts Applied"
                    style={{ ...dormantStyle, fontSize: "0.8em", marginRight: "0.5em" }}
                />
                {BuffNames[data]}
            </div>
        );
    } else if (data === "player") {
        return (
            <div key={key} style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => buffclick(e, "player")}
                    className="arrow alternate circle up icon"
                    title="Player Boosts Applied"
                    style={{
                        ...ownedGreenStyle,
                        fontSize: "0.8em",
                        marginRight: "0.5em",
                    }}
                />
                {BuffNames[data]}
            </div>
        );
    } else if (data === "quipment") {
        return (
            <div key={key} style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => buffclick(e, "player")}
                    className="arrow alternate circle up icon"
                    title="Quipment Boosts Applied"
                    style={{
                        ...ownedBlueStyle,
                        fontSize: "0.8em",
                        marginRight: "0.5em",
                    }}
                />
                {BuffNames[data]}
            </div>
        );
    } else if (data === "max") {
        return (
            <div key={key} style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => buffclick(e, "max")}
                    className="arrow alternate circle up icon glow"
                    title="Max Boosts Applied"
                    style={{ ...activeStyle, fontSize: "0.8em", marginRight: "0.5em" }}
                />
                {BuffNames[data]}
            </div>
        );
    }
    return <></>;
}

function drawImmo(
    key: string | number,
    data: PlayerImmortalMode,
    immoClick?: (value: PlayerImmortalMode) => void,
    immoed?: boolean,
    prospect?: boolean
): JSX.Element {
    const immoclick = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        immo: PlayerImmortalMode
    ) => {
        if (immoClick) {
            e.preventDefault();
            immoClick(immo);
        }
    };

    if (data === "full") {
        return (
            <div style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => immoclick(e, data)}
                    className={immoed ? "check icon" : "star icon"}
                    title="Immortalized"
                    style={{
                        ...(immoed ? ownedGreenStyle : activeStyle),
                        fontSize: "0.8em",
                        marginRight: "0.5em",
                    }}
                />
                {!immoed && "Shown "}{prospect ? ProspectImmortalNames[data] : ImmortalNames[data]}
            </div>
        );
    } else if (data === "frozen") {
        return (
            <div style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => immoclick(e, data)}
                    className="snowflake icon"
                    title="Frozen"
                    style={{ ...frozenStyle, fontSize: "0.8em", marginRight: "0.5em" }}
                />
                {prospect ? ProspectImmortalNames[data] : ImmortalNames[data]}
            </div>
        );
    } else {
        return (
            <div style={{ display: "inline-flex" }}>
                <i
                    onClick={(e) => immoclick(e, data)}
                    className="star icon"
                    title=""
                    style={{ ...dormantStyle, fontSize: "0.8em", marginRight: "0.5em" }}
                />
                {prospect ? ProspectImmortalNames[data] : ImmortalNames[data]}
            </div>
        );
    }
}

export class BuffSelector extends React.Component<BuffSelectorProps> {
    render() {
        return (
            <div style={this.props.style}>
                <Dropdown
                    inline
                    trigger={drawBuff("buffTrig", this.props.buff)}
                    placeholder={"Display Buffs"}
                    options={this.props.available}
                    value={this.props.buff}
                    onChange={(e, { value }) =>
                        this.props.setBuff(value as PlayerBuffMode)
                    }
                    closeOnChange
                ></Dropdown>
            </div>
        );
    }
}

export class ImmortalSelector extends React.Component<ImmortalSelectorProps> {
    render() {
        return (
            <div style={this.props.style}>
                <Dropdown
                    inline
                    placeholder={"Crew Level"}
                    trigger={drawImmo(
                        "immoTrig",
                        this.props.immortalMode,
                        undefined,
                        this.props.immoed,
                        this.props.prospect
                    )}
                    options={this.props.available}
                    value={this.props.immortalMode}
                    onChange={(e, { value }) =>
                        this.props.setImmortalMode(value as PlayerImmortalMode)
                    }
                    closeOnChange
                />
            </div>
        );
    }
}

export interface CrewPlugins {
    plugins?: typeof PresenterPluginBase<PlayerCrew | CrewMember | any>[];
    pluginData?: any[];
}

export interface CrewPresenterProps extends PresenterProps, CrewPlugins {
    crew: CrewMember | PlayerCrew;
    openCrew?: (crew: CrewMember | PlayerCrew) => void;
    onBuffToggle?: (state: PlayerBuffMode) => void;
    onImmoToggle?: (state: PlayerImmortalMode) => void;
    selfRender?: boolean;
    selfPrepare?: boolean;
    compact?: boolean;
    hideStats?: boolean;
    showPortrait?: boolean;
    proficiencies?: boolean;
    quipmentMode?: boolean;
}

export interface CrewPresenterState {
    mobileWidth: number;
    pluginsUsed: typeof React.Component<
        PresenterPluginProps<PlayerCrew | CrewMember | any>,
        any,
        any
    >[];
    selectedPlugin: number;
}

export class CrewPresenter extends React.Component<
    CrewPresenterProps,
    CrewPresenterState
> {
    static contextType = GlobalContext;
    context!: React.ContextType<typeof GlobalContext>;

    private readonly tiny: TinyStore;
    constructor(props: CrewPresenterProps) {
        super(props);

        this.state = {
            ...this.state,
            mobileWidth: props.mobileWidth ?? DEFAULT_MOBILE_WIDTH,
            pluginsUsed: (props.plugins ?? [ShipSkill]).map(
                (comp: unknown) =>
                    comp as unknown as typeof React.Component<
                        PlayerCrew | CrewMember | any,
                        any,
                        any
                    >
            ),
            selectedPlugin: 0,
        };

        this.tiny = TinyStore.getStore(props.storeName);       
    }

    private setSelectedPlugin = (index: number) => {
        if (index < 0) index = this.state.pluginsUsed.length - 1;
        else if (index >= this.state.pluginsUsed.length) index = 0;

        this.setState({ ...this.state, selectedPlugin: index });
    };

    protected get playerBuffMode(): PlayerBuffMode {
        if (this.props.quipmentMode) return 'quipment'
        let key = "buffmode";
        let def = "max" as PlayerBuffMode;
        if (this.context.player.playerData) {
            key += "_player";
            def = 'player';
        }

        let result = this.tiny.getValue<PlayerBuffMode>(key, def) ?? def;
        if (result === 'quipment' && !(this.props.crew as PlayerCrew)?.immortal) result = 'player';

        return result;
    }

    protected set playerBuffMode(value: PlayerBuffMode) {        
        let key = "buffmode";
        if (this.context.player.playerData) key += "_player";
        this.tiny.setValue<PlayerBuffMode>(key, value, true);
        if (this.props.selfRender) setTimeout(() => this.forceUpdate());
    }

    protected get immortalMode(): PlayerImmortalMode {
        let key = "immomode";
        let mode = "full" as PlayerImmortalMode;

        if (this.context.player.playerData) {
            key += "_player";
            mode = 'owned';
        }

        let value: PlayerImmortalMode;
        if (this.props.crew) {
            value =
                this.tiny.getValue<PlayerImmortalMode>(
                    key + "/" + this.props.crew.symbol,
                    mode
                ) ?? mode;
        } else {
            value =
                this.tiny.getValue<PlayerImmortalMode>(key, mode) ?? mode;
        }

        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        let key = "immomode";
        if (this.context.player.playerData) key += "_player";

        if (value == this.immortalMode) return;
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode>(
                key + "/" + this.props.crew.symbol,
                value,
                true
            );
        } else {
            this.tiny.setValue<PlayerImmortalMode>(key, value, true);
        }
        if (this.props.selfRender) setTimeout(() => this.forceUpdate());
    }

    protected get validImmortalModes(): PlayerImmortalMode[] {
        let value: PlayerImmortalMode[];
        if (this.props.crew) {
            value = this.tiny.getValue<PlayerImmortalMode[]>(
                "immomodevalid/" + this.props.crew.symbol,
                ["owned"]
            ) ?? ["owned"];
        } else {
            value = this.tiny.getValue<PlayerImmortalMode[]>("immomodevalid", [
                "owned",
            ]) ?? ["owned"];
        }
        // console.log("immortal-mode")
        // console.log(value);
        return value;
    }

    protected set validImmortalModes(value: PlayerImmortalMode[]) {
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode[]>(
                "immomodevalid/" + this.props.crew.symbol,
                value,
                false
            );
        } else {
            this.tiny.setValue<PlayerImmortalMode[]>("immomodevalid", value, true);
        }
    }

    componentDidMount(): void {
        if (this.props.quipmentMode && this.playerBuffMode !== 'quipment' && !!this.context.player.playerData) {
            this.playerBuffMode = 'quipment';
        }
    }
    render(): JSX.Element {
        const {
            proficiencies,
            crew: inputCrew,
            openCrew,
            touched,
            hover,
            showPortrait,
            pluginData,
            width,
            imageWidth,
            compact,
            hideStats,
        } = this.props;

        const { t, tfmt } = this.context.localized;
        const { mobileWidth, pluginsUsed, selectedPlugin } = this.state;

        if (!inputCrew) {
            return <></>;
        }

        var me = this;

        const availstates = this.props.quipmentMode ? ['quipment' as PlayerBuffMode] : getAvailableBuffStates(
            this.context.player.playerData,
            this.context.maxBuffs,
            inputCrew as PlayerCrew
        );

        if (availstates?.includes(me.playerBuffMode) !== true) {
            me.playerBuffMode = availstates[0];
        }

        let newcrew: PlayerCrew | undefined = undefined;

        if (this.props.selfPrepare) {
            let res = CrewPreparer.prepareCrewMember(
                inputCrew,
                this.playerBuffMode,
                this.immortalMode,
                this.context
            );
            newcrew = (res[0] as PlayerCrew) ?? undefined;
            this.validImmortalModes = res[1] ?? ["full"];
        }

        const crew = newcrew ?? (inputCrew as PlayerCrew);

        const availmodes = me.validImmortalModes;
        if (availmodes?.includes(me.immortalMode) !== true) {
            me.immortalMode = availmodes[availmodes.length - 1];
        }

        const clickImmo = (e) => {
            me.immortalMode = e;
            if (this.props.onImmoToggle) {
                this.props.onImmoToggle(e);
            }
        };

        const clickBuff = (e) => {
            me.playerBuffMode = e;
            if (this.props.onBuffToggle) {
                this.props.onBuffToggle(e);
            }
        };

        const nextImmo = (e) => {
            me.immortalMode = nextImmortalState(
                me.immortalMode,
                me.validImmortalModes
            );
            if (this.props.onImmoToggle) {
                this.props.onImmoToggle(me.immortalMode);
            }
        };

        const nextBuff = (e) => {
            me.playerBuffMode = nextBuffState(
                me.playerBuffMode,
                me.context.player.playerData,
                me.context.maxBuffs,
                undefined,
                crew
            );
            if (this.props.onBuffToggle) {
                this.props.onBuffToggle(me.playerBuffMode);
            }
        };

        const navClick = (e) => {
            if (!crew) return;

            if (openCrew) {
                openCrew(crew);
            } else {
                navigate("/crew/" + crew.symbol);
            }
        };

        const availBuffs = availstates.map((data, idx) => {
            let buff = {
                key: data,
                value: data,
                text: BuffNames[data],
            } as HoverSelectorConfig<PlayerBuffMode>;

            buff.content = drawBuff(idx, data, clickBuff);
            return buff;
        });

        const immoed =
            ("immortal" in crew && crew.immortal && crew.immortal >= -1) || false;
        const availImmos = me.validImmortalModes.map((data, idx) => {
            let immo = {
                key: data,
                value: data,
                text: crew.prospect ? ProspectImmortalNames[data] : ImmortalNames[data],
            } as HoverSelectorConfig<PlayerImmortalMode>;

            immo.content = drawImmo(idx, data, clickImmo, immoed, crew.prospect);
            return immo;
        });

        let immo = me.immortalMode;
        let sd = JSON.parse(JSON.stringify(crew)) as SkillData;
        let sc = 0;
        getSkills(crew).forEach((skill) => {
            if (!(skill in crew)) return;
            if (!crew[skill].core) return;
            sd.base_skills[skill] = {
                core: crew[skill].core,
                range_min: crew[skill].min,
                range_max: crew[skill].max,
            };
            sc++;
        });

        const skillData = sd;
        const skillCount = sc;

        const getStars = () => {
            if (me.immortalMode === "min") return 1;
            else if (me.immortalMode === "full" || !("immortal" in crew))
                return crew?.max_rarity;
            else return skillData.rarity;
        };

        let pt: string | undefined = undefined;
        let npt: string | undefined = undefined;

        if (
            "immortal" in crew &&
            crew.immortal === CompletionState.DisplayAsImmortalUnowned
        ) {
            if (crew.prospect) {
                pt = "Prospective Crew (Available in the Portal)";
                npt = "Prospective Crew (Not in the Portal)";    
            }
            else {
                pt = "Unowned (Available in the Portal)";
                npt = "Unowned (Not in the Portal)";    
            }
        } else if (
            !("immortal" in crew) ||
            ("immortal" in crew &&
                crew.immortal === CompletionState.DisplayAsImmortalStatic)
        ) {
            pt = "Available in the Portal";
            npt = "Not in the Portal";
        }

        const portalText = pt;
        const noPortalText = npt;
        const isNever = printPortalStatus(crew, t) === t('global.never');
        const isMobile = this.props.forceVertical || typeof window !== 'undefined' && window.innerWidth < mobileWidth;

        return crew ? (
            <div
                style={{
                    fontSize:
                        isMobile || compact ? "10pt" : "11pt",
                    display: "flex",
                    flexDirection: "row", // window.innerWidth < mobileWidth ? "column" : "row",
                    width: hover ? undefined : width,
                    textAlign: 'left'
                }}
            >
                <div
                    style={{
                        zIndex: -1,
                        position: "absolute",
                        left: "0",
                        top: "0",
                        width: "100%",
                        height: "100%",
                        opacity: 0.025,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "2.5em",
                        alignItems: "center",
                    }}
                >
                    {hover && crew.series && (
                        <Image src={`/media/series/${crew.series}.png`} style={{maxHeight: "26em"}} />
                    )}
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: hover ? undefined : imageWidth,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "flex-start",
                        }}
                    >
                        {touched && (
                            <>
                                <i
                                    className="close icon"
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) =>
                                        this.props.close ? this.props.close() : undefined
                                    }
                                />
                            </>
                        )}
                    </div>
                    <div
                        style={{
                            flexGrow: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                        }}
                    >
                        {!showPortrait && (
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlFullBody}`}
                                style={{
                                    height: hover
                                        ? isMobile
                                            ? "15em"
                                            : "19em"
                                        : compact
                                            ? "14em"
                                            : "25em",
                                    marginRight: "8px",
                                }}
                            />
                        )}
                        {showPortrait && (
                            <img
                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                style={{
                                    width: compact ? "5em" : "10em",
                                    marginRight: "8px",
                                }}
                            />
                        )}
                    </div>
                    {!compact && (
                        <div style={{ marginBottom: "0.13em", marginRight: "0.5em", fontSize: "9pt", fontWeight: 'normal' }}>
                            {crew.immortal === -1 && this.validImmortalModes[0] !== 'frozen' && !!crew.kwipment?.length && 
                                <CrewItemsView crew={crew} quipment={true} />}
                            
                            <CrewItemsView crew={crew} />
                        </div>
                    )}
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "8em",
                        justifyContent: "space-between",
                        width: isMobile ? "15m" : "32em",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <h3
                                style={{
                                    margin: "2px 8px",
                                    padding: "8px",
                                    marginLeft: "0px",
                                    paddingLeft: "0px",
                                }}
                            >
                                <a
                                    onClick={(e) => navClick(e)}
                                    style={{ cursor: "pointer" }}
                                    title={"Go To Crew Page For '" + crew.name + "'"}
                                >
                                    {crew.name}
                                </a>
                            </h3>
                            <div
                                style={{
                                    margin: "4px",
                                    marginLeft: 0,
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                <Rating
                                    onClick={(e) => nextImmo(e)}
                                    icon="star"
                                    rating={getStars()}
                                    maxRating={crew.max_rarity}
                                    size="large"
                                    disabled
                                />
                                <h4
                                    onClick={(e) => nextImmo(e)}
                                    style={{
                                        cursor: "default",
                                        margin: "2px 8px",
                                        padding: "8px",
                                    }}
                                    className="ui segment"
                                    title={
                                        "immortal" in crew
                                            ? printImmoText(crew.immortal)
                                            : "Crew Is Shown Immortalized"
                                    }
                                >
                                    {("immortal" in crew &&
                                        (crew.immortal ===
                                            CompletionState.DisplayAsImmortalUnowned ||
                                            crew.immortal ===
                                            CompletionState.DisplayAsImmortalStatic ? (
                                            <>
                                                {" "}
                                                {((crew.in_portal && !crew.prospect) && (
                                                    <div
                                                        style={{
                                                            alignSelf: "center",
                                                            display: "flex",
                                                            flexDirection: "row",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        <img
                                                            style={{
                                                                height: "1.5em",
                                                                margin: 0,
                                                                padding: 0,
                                                            }}
                                                            title={portalText}
                                                            src={"/media/portal.png"}
                                                        />
                                                    </div>
                                                )) || (
                                                        <i
                                                            className={crew.prospect ? "add user icon" : "lock icon"}
                                                            style={frozenStyle}
                                                            title={noPortalText}
                                                        />
                                                    )}{" "}
                                            </>
                                        ) : crew.immortal === 0 ||
                                            crew.rarity !== crew.max_rarity ? (
                                            <b>{crew.level}</b>
                                        ) : crew.immortal > 0 ? (
                                            <i className="snowflake icon" style={frozenStyle} />
                                        ) : (
                                            <i className="check icon" style={checkedStyle} />
                                        ))) || <i className="check icon" style={checkedStyle} />}
                                </h4>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-evenly",
                                fontSize: "0.9em",
                                fontStyle: "italic",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: isMobile ? 'flex-start' : "flex-end",
                                }}
                            >
                                <BuffSelector
                                    available={availBuffs}
                                    buff={me.playerBuffMode}
                                    setBuff={(e) => clickBuff(e)}
                                />
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: isMobile ? 'flex-start' : "flex-end",
                                }}
                            >
                                <ImmortalSelector
                                    immoed={immoed}
                                    prospect={crew.prospect}
                                    available={availImmos}
                                    immortalMode={me.immortalMode}
                                    setImmortalMode={(e) => clickImmo(e)}
                                />
                            </div>
                        </div>
                    </div>
                    <div
                        onClick={(e) => nextBuff(e)}
                        style={{
                            cursor: "default",
                            display: "flex",
                            flexWrap: "wrap",
                            fontSize: hover ? "1.2em" : "0.9em",
                            flexDirection: isMobile ? "column" : "row",
                            justifyContent: skillCount < 3 ? "flex-start" : 'space-evenly',
                            marginTop: "4px",
                            marginBottom: "2px",
                        }}
                    >
                        {Object.entries(skillData.base_skills).sort(([akey, askill], [bkey, bskill]) => {
                            return (bskill as Skill).core - (askill as Skill).core;
                            
                        }).map(([key, skill]) => {

                            return <CrewStat
                                quipmentMode={this.props.quipmentMode}
                                key={"crewpresent_skill_" + key}
                                proficiencies={proficiencies}
                                skill_name={key}
                                data={skill}
                                scale={hover ? 0.75 : 1}
                            />
                        })}

                        <div style={{ width: "4px" }} />
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
                        {crew.traits_named.join(", ")}
                    </div>
                    <div>
                        <CollectionDisplay crew={crew} style={{fontSize: "0.8em", fontStyle: "italic"}} />
                    </div>
                    <div>
                        {(!pluginData ||
                            (pluginData && pluginData.length == pluginsUsed.length)) &&
                            pluginsUsed.map((PlugIn, idx) => {
                                if (selectedPlugin !== idx) return <div key={idx} />;

                                return (
                                    <PlugIn
                                        key={idx}
                                        context={crew}
                                        fontSize="0.8em"
                                        data={pluginData ? pluginData[idx] : undefined}
                                    />
                                );
                            })}
                    </div>
                    {pluginsUsed.length > 1 && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "flex-end",
                            }}
                        >
                            <div style={{ display: "inline-flex", marginTop: "-1.8em" }}>
                                <i
                                    onClick={(e) => {
                                        this.setSelectedPlugin(selectedPlugin - 1);
                                    }}
                                    className="arrow alternate circle left icon"
                                    title="Previous Pane"
                                    style={{
                                        ...activeStyle,
                                        fontSize: "0.8em",
                                        marginRight: "0.5em",
                                    }}
                                />
                                <i
                                    onClick={(e) => {
                                        this.setSelectedPlugin(selectedPlugin + 1);
                                    }}
                                    className="arrow alternate circle right icon"
                                    title="Next Pane"
                                    style={{
                                        ...activeStyle,
                                        fontSize: "0.8em",
                                        marginRight: "0.5em",
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {!hideStats && (
                        <div>
                            <div
                                style={{
                                    textAlign: "center",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    flexDirection:
                                        isMobile ? "column" : "row",
                                    justifyContent:
                                        isMobile ? "left" : "space-between",
                                }}
                            >
                                <StatLabel
                                    title="Big Book Tier"
                                    value={
                                        <div
                                            style={{
                                                fontWeight: "bold",
                                                color: gradeToColor(crew.bigbook_tier) ?? undefined,
                                            }}
                                        >
                                            {formatTierLabel(crew)}
                                        </div>
                                    }
                                />

                                <StatLabel
                                    title="Voyage Rank"
                                    value={"" + crew.ranks.voyRank}
                                />

                                <StatLabel title="CAB Rating" value={crew.cab_ov ?? "?"} />
                            </div>
                        </div>
                    )}
                    {!hideStats && (
                        <div>
                            <div
                                style={{
                                    textAlign: "center",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    flexDirection:
                                        isMobile ? "column" : "row",
                                    justifyContent:
                                        isMobile ? "left" : "space-between",
                                }}
                            >
                                <StatLabel
                                    title="CAB Grade"
                                    value={
                                        <div
                                            style={{
                                                fontWeight: "bold",
                                                color:
                                                    gradeToColor(crew.cab_ov_grade as string) ??
                                                    undefined,
                                            }}
                                        >
                                            {crew.cab_ov_grade ?? "?"}
                                        </div>
                                    }
                                />
                                <StatLabel
                                    title="Gauntlet Rank"
                                    value={"" + crew.ranks.gauntletRank}
                                />

                                {!isNever && 
                                <>
                                {(crew.in_portal && !!crew.unique_polestar_combos?.length) && 
                                    <span title={printPortalStatus(crew, t, true, true, true, true)}>                                    
                                    <StatLabel
                                        title=""
                                        value={<span style={{color:"lightgreen", fontWeight:"bold"}}>{t('data_names.base.uniquely_retrievable')}</span>}
                                    />
                                    </span> 
                                    ||
                                    <span title={printPortalStatus(crew, t, true, true, true, true)}>
                                    <StatLabel                                        
                                        title={t('data_names.base.in_portal')}
                                        value={crew.in_portal ? <span style={{color:"lightgreen", fontWeight:"bold"}}>{t('global.yes')}</span> : printPortalStatus(crew, t, true) }
                                    />
                                   </span>
                                }
                                </>}
                                {isNever && 
                                    <span title={printPortalStatus(crew, t, true, true, true, true)}>                                  
                                    <StatLabel
                                        title={t('global.obtained')}
                                        value={<span style={{ padding:0, color: CONFIG.RARITIES[5].color, fontWeight:"bold"}}>{prettyObtained(crew, t)}</span>}                                        
                                    />
                                </span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <></>
        );
    }
}
