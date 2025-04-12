import * as React from "react";
import { Dropdown, Rating } from "semantic-ui-react";
import { BaseSkills, CrewMember, Skill, SkillData } from "../../model/crew";
import { CompletionState, PlayerBuffMode, PlayerCrew, PlayerImmortalMode, TranslateMethod } from "../../model/player";
import {
    crewGender,
    formatMissingTrait,
    gradeToColor,
    prettyObtained,
    printImmoText,
    printPortalStatus
} from "../../utils/crewutils";
import { TinyStore } from "../../utils/tiny";
import { ThinStatLabel } from "../statlabel";
import CrewStat from "./crewstat";
import { PresenterProps } from "./ship_presenter";
import { ShipSkill } from "./shipskill";

import { navigate } from "gatsby";
import { Image } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { getCoolStats } from "../../utils/misc";
import CONFIG from "../CONFIG";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CrewItemsView } from "./crew_items";
import {
    BuffNames,
    CrewPreparer,
    ImmortalNames,
    ProspectImmortalNames,
    getAvailableBuffStates,
    nextBuffState,
    nextImmortalState,
} from "./crew_preparer";
import {
    PresenterPluginBase,
    PresenterPluginProps
} from "./presenter_plugin";
import { HoverSelectorConfig, BuffSelector, ImmortalSelector, CollectionDisplay, drawBuff, drawImmo } from "./presenter_utils";

const activeStyle: React.CSSProperties = {
    background: "transparent",
    color: "#FFE623",
    cursor: "pointer",
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

const opponentStyle: React.CSSProperties = {
    color: "tomato",
    marginRight: "0px",
};

const selectedStyle: React.CSSProperties = {
    color: "green",
    marginRight: "0px",
};

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
    declare context: React.ContextType<typeof GlobalContext>;

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

    crewToSkillData(crew: PlayerCrew) {
        const skillData = {
            base_skills: {} as BaseSkills,
            rarity: crew.rarity
        } as SkillData;
        for (let skill of crew.skill_order) {
            skillData.base_skills[skill] = {
                core: crew[skill].core,
                range_min: crew[skill].min,
                range_max: crew[skill].max,
            };
        }
        return skillData;
    }

    readonly getStars = (crew: PlayerCrew) => {
        if (this.immortalMode === "min") return 1;
        else if (this.immortalMode === "full" || !("immortal" in crew)) return crew?.max_rarity;
        else return crew.rarity;
    };

    readonly shouldShowQuipment = (crew: PlayerCrew) => {
        if (crew.immortal === -1 && this.validImmortalModes[0] !== 'frozen') return true;
        else {
            if (!crew.have) {
                delete (crew as any).q_bits;
            }
            return crew.kwipment?.some(q => typeof q === 'number' ? q !== 0 : q[0] !== 0)
        }
    }

    readonly clickImmo = (immo: PlayerImmortalMode) => {
        this.immortalMode = immo;
        if (this.props.onImmoToggle) {
            this.props.onImmoToggle(immo);
        }
    };

    readonly clickBuff = (buff: PlayerBuffMode) => {
        this.playerBuffMode = buff;
        if (this.props.onBuffToggle) {
            this.props.onBuffToggle(buff);
        }
    };

    readonly nextImmo = () => {
        this.immortalMode = nextImmortalState(
            this.immortalMode,
            this.validImmortalModes
        );
        if (this.props.onImmoToggle) {
            this.props.onImmoToggle(this.immortalMode);
        }
    };

    readonly nextBuff = (crew: PlayerCrew) => {
        this.playerBuffMode = nextBuffState(
            this.playerBuffMode,
            this.context.player.playerData,
            this.context.maxBuffs,
            undefined,
            crew
        );
        if (this.props.onBuffToggle) {
            this.props.onBuffToggle(this.playerBuffMode);
        }
    };

    readonly navClick = (crew?: PlayerCrew) => {
        if (!crew) return;

        if (this.props.openCrew) {
            this.props.openCrew(crew);
        } else {
            navigate("/crew/" + crew.symbol);
        }
    };

    readonly createRenderCrew = (inputCrew: PlayerCrew | CrewMember) => {
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

        return newcrew ?? (inputCrew as PlayerCrew);
    }

    render(): JSX.Element {
        const {
            crew: inputCrew,
            touched,
            hover,
            showPortrait,
            width,
            imageWidth,
            compact,
            hideStats,
        } = this.props;

        const { t, language } = this.context.localized;
        const { mobileWidth, pluginsUsed } = this.state;

        if (!inputCrew) {
            return <></>;
        }

        const me = this;

        const opponent = "immortal" in inputCrew && inputCrew.immortal === CompletionState.DisplayAsImmortalOpponent;
        const selected = "immortal" in inputCrew && inputCrew.immortal === CompletionState.DisplayAsImmortalSelected;

        const crew = this.createRenderCrew(inputCrew);

        const isMobile = this.props.forceVertical || typeof window !== 'undefined' && window.innerWidth < mobileWidth;

        const availmodes = me.validImmortalModes;

        const availstates = this.props.quipmentMode ? ['quipment' as PlayerBuffMode] : getAvailableBuffStates(
            this.context.player.playerData,
            this.context.maxBuffs,
            inputCrew as PlayerCrew
        );

        if (availstates?.includes(me.playerBuffMode) !== true) {
            me.playerBuffMode = availstates[0];
        }

        if (availmodes?.includes(me.immortalMode) !== true) {
            me.immortalMode = availmodes[availmodes.length - 1];
        }

        const mainContainerStyle = {
            fontSize:
                isMobile || compact ? "10pt" : "11pt",
            display: "flex",
            flexDirection: "row", // window.innerWidth < mobileWidth ? "column" : "row",
            width: hover ? undefined : width,
            textAlign: 'left'
        } as React.CSSProperties;

        const bgImageStyle = {
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
        } as React.CSSProperties;

        return crew ? (
            <div style={mainContainerStyle}>
                <div style={bgImageStyle}>
                    {hover && crew.series && (
                        <Image src={`/media/series/${crew.series}.png`} style={{ maxHeight: "26em" }} />
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
                                    height: hover ? (isMobile ? "15em" : "19em") : (compact ? "14em" : "25em"),
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
                    {!compact && !selected && !opponent && (
                        <div style={{ marginBottom: "0.13em", marginRight: "0.5em", fontSize: "9pt", fontWeight: 'normal' }}>
                            {this.shouldShowQuipment(crew) && <CrewItemsView crew={crew} quipment={true} />}
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
                        width: isMobile ? "15m" : (language === 'de' ? "40em" : (language === 'sp' ? '35em' : '32em')),
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: isMobile ? "column" : "row",
                            justifyContent: "space-between",
                        }}
                    >
                        {this.renderRating(crew)}
                        {!opponent && !selected && this.renderViewOptions(crew, isMobile)}
                    </div>
                    {this.renderSkills(crew, hover, isMobile)}
                    {this.renderCoolStats(crew)}
                    {this.renderTraits(crew)}
                    {this.renderCollections(crew)}
                    {this.renderPlugins(crew)}
                    {pluginsUsed.length > 1 && this.renderPluginArrows()}
                    {!hideStats && this.renderStats(crew, isMobile)}
                </div>
            </div>
        ) : (
            <></>
        );
    }

    renderRating(crew: PlayerCrew) {
        const { t } = this.context.localized;

        let portal_text: string | undefined = undefined;
        let no_portal_text: string | undefined = undefined;

        if ("immortal" in crew && crew.immortal === CompletionState.DisplayAsImmortalUnowned) {
            if (crew.prospect) {
                portal_text = t('crew_state.prospective_crew_portal');
                no_portal_text = t('crew_state.prospective_crew_no_portal');
            }
            else {
                portal_text = t('crew_state.unowned_portal');
                no_portal_text = t('crew_state.unowned_no_portal');
            }
        }
        else if (!("immortal" in crew) || ("immortal" in crew &&
            crew.immortal === CompletionState.DisplayAsImmortalStatic)
        ) {
            portal_text = t('crew_state.portal_available');
            no_portal_text = t('crew_state.not_in_portal');
        }

        const portalText = portal_text;
        const noPortalText = no_portal_text;
        return (
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
                        onClick={() => this.navClick(crew)}
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
                        onClick={() => this.nextImmo()}
                        icon="star"
                        rating={this.getStars(crew)}
                        maxRating={crew.max_rarity}
                        size="large"
                        disabled
                    />
                    <h4
                        onClick={() => this.nextImmo()}
                        style={{
                            cursor: "default",
                            margin: "2px 8px",
                            padding: "8px",
                        }}
                        className="ui segment"
                        title={
                            "immortal" in crew
                                ? printImmoText(crew.immortal, undefined, undefined, t, crewGender(crew))
                                : t('item_state.item_is_shown_immortalized', { item: t('base.crew'), __gender: crewGender(crew) ?? '' })
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
                            ) : crew.immortal === CompletionState.DisplayAsImmortalOpponent ? (
                                <i className="chess rook icon" style={opponentStyle} />
                            ) : crew.immortal === CompletionState.DisplayAsImmortalSelected ? (
                                <i className="chess rook icon" style={selectedStyle} />
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
            </div>)
    }

    renderViewOptions(crew: PlayerCrew, isMobile: boolean) {
        const { t } = this.context.localized;
        const availmodes = this.validImmortalModes;

        const availstates = this.props.quipmentMode ? ['quipment' as PlayerBuffMode] : getAvailableBuffStates(
            this.context.player.playerData,
            this.context.maxBuffs,
            crew as PlayerCrew
        );

        if (availstates?.includes(this.playerBuffMode) !== true) {
            this.playerBuffMode = availstates[0];
        }

        if (availmodes?.includes(this.immortalMode) !== true) {
            this.immortalMode = availmodes[availmodes.length - 1];
        }

        const availBuffs = availstates.map((data, idx) => {
            let buff = {
                key: data,
                value: data,
                text: BuffNames[data],
            } as HoverSelectorConfig<PlayerBuffMode>;

            buff.content = drawBuff(t, idx, data, this.clickBuff);
            return buff;
        });

        const immoed = ("immortal" in crew && crew.immortal && crew.immortal >= -1) || false;

        const availImmos = this.validImmortalModes.map((data, idx) => {
            const immo = {
                key: data,
                value: data,
                text: crew.prospect ? ProspectImmortalNames[data] : ImmortalNames[data],
            } as HoverSelectorConfig<PlayerImmortalMode>;

            immo.content = drawImmo(t, idx, data, this.clickImmo, immoed, crew.prospect, crewGender(crew));
            return immo;
        });

        return (
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
                        t={t}
                        available={availBuffs}
                        buff={this.playerBuffMode}
                        setBuff={(buff) => this.clickBuff(buff)}
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
                        t={t}
                        immoed={immoed}
                        prospect={crew.prospect}
                        available={availImmos}
                        immortalMode={this.immortalMode}
                        setImmortalMode={(immo) => this.clickImmo(immo)}
                        gender={crewGender(crew)}
                    />
                </div>
            </div>
        )

    }

    renderSkills(crew: PlayerCrew, hover: boolean, isMobile: boolean) {
        const { proficiencies } = this.props;
        const skillCount = crew.skill_order.length;
        const opponent = "immortal" in crew && crew.immortal === CompletionState.DisplayAsImmortalOpponent;
        const selected = "immortal" in crew && crew.immortal === CompletionState.DisplayAsImmortalSelected;
        const skillData = this.crewToSkillData(crew);

        return (<div
            onClick={() => this.nextBuff(crew)}
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
            {Object.entries(skillData.base_skills).sort(([akey, askill]: [string, Skill], [bkey, bskill]: [string, Skill]) => {
                return bskill.core - askill.core;

            }).map(([key, skill]) => {
                return <CrewStat
                    quipmentMode={this.props.quipmentMode}
                    key={"crewpresent_skill_" + key}
                    proficiencies={proficiencies || opponent || selected}
                    skill_name={key}
                    data={skill}
                    scale={hover ? 0.75 : 1}
                />
            })}

            <div style={{ width: "4px" }} />
        </div>)
    }

    renderCoolStats(crew: PlayerCrew) {
        const { t } = this.context.localized;
        return (
            <div style={{
                marginTop: '0.5em',
                marginBottom: '0.5em',
                fontSize: '0.8em'
            }}>
                {getCoolStats(t, crew, false, false, 50, 20, 20)}
            </div>
        )
    }

    renderTraits(crew: PlayerCrew) {
        const { TRAIT_NAMES } = this.context.localized;
        return (
            <React.Fragment>
                <div
                    style={{
                        textAlign: "left",
                        fontStyle: "italic",
                        fontSize: "0.85em",
                        marginTop: "2px",
                        marginBottom: "4px",
                    }}
                >
                    {crew.traits.map(t => TRAIT_NAMES[t] || formatMissingTrait(t)).join(", ")}
                </div>
                <div
                    style={{
                        textAlign: "left",
                        fontStyle: "italic",
                        fontSize: "0.85em",
                        marginTop: "2px",
                        opacity: 0.50,
                        marginBottom: "4px",
                    }}
                >
                    {crew.traits_hidden.join(", ")}
                </div>
            </React.Fragment>
        )
    }

    renderCollections(crew: PlayerCrew) {
        return (
            <div>
                <CollectionDisplay crew={crew} style={{ fontSize: "0.8em", fontStyle: "italic" }} />
            </div>
        );
    }

    renderPlugins(crew: PlayerCrew) {
        const { pluginData } = this.props;
        const { pluginsUsed, selectedPlugin } = this.state;

        return (<div>
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
        </div>)
    }

    renderPluginArrows() {
        const { selectedPlugin } = this.state;
        return (
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
        )
    }

    renderStats(crew: PlayerCrew, isMobile: boolean) {
        const { t } = this.context.localized;
        const isNever = printPortalStatus(crew, t) === t('global.never');

        return (
            <React.Fragment>
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
                        <ThinStatLabel
                            title={t('rank_names.datascore')}
                            value={
                                <div
                                    style={{
                                        fontWeight: "bold",
                                        color: gradeToColor(crew.ranks.scores.overall_grade) ?? undefined,
                                    }}
                                >
                                    {crew.ranks.scores.overall_grade}
                                </div>
                            }
                        />
                        <ThinStatLabel
                            title={t('rank_names.voyage_rank')}
                            value={"" + crew.ranks.voyRank}
                        />

                        <ThinStatLabel title={t('rank_names.scores.overall_rank')} value={crew.ranks.scores.overall_rank ?? "?"} />
                    </div>
                </div>
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
                        <ThinStatLabel
                            title={t('rank_names.cab_grade')}
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
                        <ThinStatLabel
                            title={t('rank_names.gauntlet_rank')}
                            value={"" + crew.ranks.gauntletRank}
                        />

                        {!isNever &&
                            <>
                                {(crew.in_portal && !!crew.unique_polestar_combos?.length) &&
                                    <span title={printPortalStatus(crew, t, true, true, true, true)}>
                                        <ThinStatLabel
                                            title=""
                                            value={<span style={{ color: "lightgreen", fontWeight: "bold" }}>{t('base.uniquely_retrievable')}</span>}
                                        />
                                    </span>
                                    ||
                                    <span title={printPortalStatus(crew, t, true, true, true, true)}>
                                        <ThinStatLabel
                                            title={t('base.in_portal')}
                                            value={crew.in_portal ? <span style={{ color: "lightgreen", fontWeight: "bold" }}>{t('global.yes')}</span> : printPortalStatus(crew, t, true)}
                                        />
                                    </span>
                                }
                            </>}
                        {isNever &&
                            <span title={printPortalStatus(crew, t, true, true, true, true)}>
                                <ThinStatLabel
                                    title={t('global.obtained')}
                                    value={<span style={{ padding: 0, color: CONFIG.RARITIES[5].color, fontWeight: "bold" }}>{prettyObtained(crew, t)}</span>}
                                />
                            </span>}
                    </div>
                </div>
            </React.Fragment>
        )

    }
}
