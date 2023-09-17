import * as React from "react";
import { CrewMember, SkillData } from "../../model/crew";
import { CompletionState, PlayerCrew } from "../../model/player";
import { Dropdown, Rating } from "semantic-ui-react";
import CrewStat from "../crewstat";
import {
    formatTierLabel,
    getSkills,
    gradeToColor,
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
    PlayerBuffMode,
    PlayerImmortalMode,
    BuffNames,
    ImmortalNames,
    getAvailableBuffStates,
    nextImmortalState,
    nextBuffState,
    CrewPreparer,
} from "./crew_preparer";
import {
    PresenterPlugin,
    PresenterPluginBase,
    PresenterPluginProps,
} from "./presenter_plugin";
import { Ship } from "../../model/ship";
import { navigate } from "gatsby";

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
    immoed?: boolean
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
                {!immoed && "Shown "}{ImmortalNames[data]}
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
                {ImmortalNames[data]}
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
                {ImmortalNames[data]}
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
                        this.props.immoed
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
        return this.tiny.getValue<PlayerBuffMode>("buffmode", "player") ?? "player";
    }

    protected set playerBuffMode(value: PlayerBuffMode) {
        this.tiny.setValue<PlayerBuffMode>("buffmode", value, true);
        if (this.props.selfRender) this.forceUpdate();
    }

    protected get immortalMode(): PlayerImmortalMode {
        let value: PlayerImmortalMode;
        if (this.props.crew) {
            value =
                this.tiny.getValue<PlayerImmortalMode>(
                    "immomode/" + this.props.crew.symbol,
                    "owned"
                ) ?? "owned";
        } else {
            value =
                this.tiny.getValue<PlayerImmortalMode>("immomode", "owned") ?? "owned";
        }

        return value;
    }

    protected set immortalMode(value: PlayerImmortalMode) {
        if (value == this.immortalMode) return;
        if (this.props.crew) {
            this.tiny.setValue<PlayerImmortalMode>(
                "immomode/" + this.props.crew.symbol,
                value,
                true
            );
        } else {
            this.tiny.setValue<PlayerImmortalMode>("immomode", value, true);
        }
        if (this.props.selfRender) this.forceUpdate();
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

        const { mobileWidth, pluginsUsed, selectedPlugin } = this.state;

        if (!inputCrew) {
            return <></>;
        }

        var me = this;

        const availstates = getAvailableBuffStates(
            this.context.player.playerData,
            this.context.maxBuffs
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
                me.context.maxBuffs
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
                text: ImmortalNames[data],
            } as HoverSelectorConfig<PlayerImmortalMode>;

            immo.content = drawImmo(idx, data, clickImmo, immoed);
            return immo;
        });

        let immo = me.immortalMode;
        let sd = JSON.parse(JSON.stringify(crew)) as SkillData;

        getSkills(crew).forEach((skill) => {
            if (!(skill in crew)) return;
            sd.base_skills[skill] = {
                core: crew[skill].core,
                range_min: crew[skill].min,
                range_max: crew[skill].max,
            };
        });

        const skillData = sd;

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
            pt = "Unowned (Available in the Portal)";
            npt = "Unowned (Not in the Portal)";
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
                        <Image src={`/media/series/${crew.series}.png`} />
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
                        <div style={{ marginBottom: "0.13em", marginRight: "0.5em" }}>
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
                                                {(crew.in_portal && (
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
                                                            className="lock icon"
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
                            justifyContent: "space-evenly",
                            marginTop: "4px",
                            marginBottom: "2px",
                        }}
                    >
                        {skillData.base_skills.security_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="security_skill"
                                data={skillData.base_skills.security_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}

                        {skillData.base_skills.command_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="command_skill"
                                data={skillData.base_skills.command_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}

                        {skillData.base_skills.diplomacy_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="diplomacy_skill"
                                data={skillData.base_skills.diplomacy_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}

                        {skillData.base_skills.science_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="science_skill"
                                data={skillData.base_skills.science_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}

                        {skillData.base_skills.medicine_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="medicine_skill"
                                data={skillData.base_skills.medicine_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}

                        {skillData.base_skills.engineering_skill && (
                            <CrewStat
                                proficiencies={proficiencies}
                                skill_name="engineering_skill"
                                data={skillData.base_skills.engineering_skill}
                                scale={hover ? 0.75 : 1}
                            />
                        )}
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
                                <span title={printPortalStatus(crew, true, true, true)}>
                                    <StatLabel
                                        title="In Portal"
                                        value={crew.in_portal ? <span style={{color:"lightgreen", fontWeight:"bold"}}>Yes</span> : printPortalStatus(crew, true) }
                                    />
                                </span>
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
