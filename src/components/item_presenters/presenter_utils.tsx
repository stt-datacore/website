import * as React from "react";
import { Dropdown } from "semantic-ui-react";
import { CrewMember } from "../../model/crew";
import { PlayerBuffMode, PlayerCrew, PlayerImmortalMode, TranslateMethod } from "../../model/player";

import { navigate } from "gatsby";
import { GlobalContext } from "../../context/globalcontext";
import { BuffNames, ImmortalNames, ProspectImmortalNames } from "./crew_preparer";

const dormantStyle: React.CSSProperties = {
    background: "transparent",
    color: "gray",
    cursor: "pointer",
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

const frozenStyle: React.CSSProperties = {
    background: "transparent",
    color: "white",
    cursor: "default",
    marginRight: "0px",
};

export interface CollectionDisplayProps {
    crew: PlayerCrew | CrewMember;
    style?: React.CSSProperties;
}

export const CollectionDisplay = (props: CollectionDisplayProps) => {
    const context = React.useContext(GlobalContext);
    const { playerData } = context.player;
    const { crew, style } = props;

    const ocols = [] as string[];

    const dispClick = (e, col: string) => {
        navigate("/collections?select=" + encodeURIComponent(col));
    }

    if (!crew.collections?.length) return <></>;

    if (
        (((("immortal" in crew)) && ((crew.immortal === 0 || crew.immortal < -1) && ![-10, -11].includes(crew.immortal))) ||
            ("any_immortal" in crew && crew.any_immortal === false))
        && playerData?.player.character.cryo_collections) {
        playerData?.player.character.cryo_collections.forEach(col => {
            if (col?.milestone?.goal) {
                ocols.push(col.name);
            }
        });
    }

    return (<div style={{
        ... (style ?? {}),
        cursor: "pointer"
    }}>
        {crew.collections?.map((col, idx) => (
            <a
                style={{
                    color: ocols.includes(col) ? 'lightgreen' : undefined
                }}
                onClick={(e) => dispClick(e, col)} key={"collectionText_" + crew.symbol + idx}>
                {col}
            </a>))?.reduce((prev, next) => <>{prev}, {next}</>) ?? <></>}
    </div>)
}

export interface HoverSelectorConfig<T> {
    key: T;
    value: T;
    text?: string;
    content?: React.JSX.Element;
}

export interface BuffSelectorProps {
    buff: PlayerBuffMode;
    setBuff: (value: PlayerBuffMode) => void;
    style?: React.CSSProperties | undefined;
    available: HoverSelectorConfig<PlayerBuffMode>[];
    t: TranslateMethod
}

export interface ImmortalSelectorProps {
    immoed?: boolean;
    prospect?: boolean;
    immortalMode: PlayerImmortalMode;
    setImmortalMode: (value: PlayerImmortalMode) => void;
    style?: React.CSSProperties | undefined;
    available: HoverSelectorConfig<PlayerImmortalMode>[];
    t: TranslateMethod,
    gender?: 'm' | 'f' | '';
}

export function drawBuff(
    t: TranslateMethod,
    key: string | number,
    data: PlayerBuffMode,
    buffClick?: (value: PlayerBuffMode) => void
): React.JSX.Element {
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
                {t(BuffNames[data])}
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
                {t(BuffNames[data])}
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
                {t(BuffNames[data])}
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
                {t(BuffNames[data])}
            </div>
        );
    }
    return <></>;
}

export function drawImmo(
    t: TranslateMethod,
    key: string | number,
    data: PlayerImmortalMode,
    immoClick?: (value: PlayerImmortalMode) => void,
    immoed?: boolean,
    prospect?: boolean,
    gender?: "m" | "f" | ""
): React.JSX.Element {
    const immoclick = (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        immo: PlayerImmortalMode
    ) => {
        if (immoClick) {
            e.preventDefault();
            immoClick(immo);
        }
    };

    let imname = '';
    let icon = '';
    let style = {} as React.CSSProperties;
    let title = '';
    if (data === 'full') {
        if (!immoed) {
            data = "shown_full";
            icon = 'star icon';
        }
        else {
            icon = 'check icon';
        }
        style = {
            ...(immoed ? ownedGreenStyle : activeStyle),
            fontSize: "0.8em",
            marginRight: "0.5em",
        };
        title = t('crew_state.immortalized', { __gender: gender ?? '' });
    }
    else if (data === 'frozen') {
        icon = 'snowflake icon';
        style = { ...frozenStyle, fontSize: "0.8em", marginRight: "0.5em" };
        title = t('crew_state.frozen', { __gender: gender ?? '' });
    }
    else {
        icon = 'star icon'
        style = { ...dormantStyle, fontSize: "0.8em", marginRight: "0.5em" };
    }

    if (prospect) {
        imname = t(ProspectImmortalNames[data], { __gender: gender ?? '', stars: data.toString() });
    }
    else {
        imname = t(ImmortalNames[data], { __gender: gender ?? '', stars: data.toString() });
    }

    const immoName = imname;
    const immoIcon = icon;
    const immoStyle = style;
    const immoTitle = title;

    return (
        <div key={key} style={{ display: "inline-flex" }}>
            <i
                onClick={(e) => immoclick(e, data)}
                className={immoIcon}
                title={immoTitle}
                style={immoStyle}
            />
            {immoName}
        </div>
    );
}

export const BuffSelector  = (props: BuffSelectorProps) => {
    const { t } = props;
    return (
        <div style={props.style}>
            <Dropdown
                inline
                trigger={drawBuff(props.t, "buffTrig", props.buff)}
                placeholder={t('hints.display_buffs')}
                options={props.available}
                value={props.buff}
                onChange={(e, { value }) =>
                    props.setBuff(value as PlayerBuffMode)
                }
                closeOnChange
            ></Dropdown>
        </div>
    );
}

export const ImmortalSelector = (props: ImmortalSelectorProps) => {
    const { t } = props;
    return (<div style={props.style}>
        <Dropdown
            inline
            placeholder={t('hints.crew_level')}
            trigger={drawImmo(
                props.t,
                "immoTrig",
                props.immortalMode,
                undefined,
                props.immoed,
                props.prospect,
                props.gender
            )}
            options={props.available}
            value={props.immortalMode}
            onChange={(e, { value }) =>
                props.setImmortalMode(value as PlayerImmortalMode)
            }
            closeOnChange
        />
    </div>)
}
