import React from "react";
import { GauntletContext } from "./dataprovider";
import { GlobalContext } from "../../context/globalcontext";
import { Gauntlet, GauntletViewMode } from "../../model/gauntlets";
import moment from "moment";
import { Accordion, Dropdown, Message } from "semantic-ui-react";
import { gradeToColor, skillToShort } from "../../utils/crewutils";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import ItemDisplay from "../itemdisplay";
import { randomCrew } from "../../context/datacontext";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { AvatarView } from "../item_presenters/avatarview";



export interface GauntletHeaderProps {
    gauntlet: Gauntlet;
}

export const GauntletHeader = (props: GauntletHeaderProps) => {
    const gauntletContext = React.useContext(GauntletContext);
    const { viewMode, setViewMode, pane, setConfig, config } = gauntletContext;
    const { gauntlet } = props;
    const globalContext = React.useContext(GlobalContext);

    const { t, TRAIT_NAMES } = globalContext.localized;

    const featuredCrew = globalContext.core.crew.find((crew) => crew.symbol === gauntlet.jackpot_crew);
    let jp = [] as CrewMember[];

    if (pane === 'browse') {
        jp = globalContext.core.crew.filter((crew) => {
            return crew.traits_hidden.includes("exclusive_gauntlet");
        })
        .sort((a, b) => {
            return a.date_added.getTime() - b.date_added.getTime();
        });
    }
    else if (pane === 'live' && gauntlet) {
        let pc = gauntlet.contest_data?.selected_crew?.map(c => globalContext.player.playerData?.player.character.crew.find(f => f.symbol === c.archetype_symbol) as PlayerCrew);
        if (pc) jp = pc.filter(f => f);
    }

    const jackpots = jp;
    const prettyTraits = gauntlet.state === "POWER" ? [t('gauntlet.base_power')] : gauntlet.contest_data?.traits?.map(t => TRAIT_NAMES[t]);
    const prettyDate = gauntlet.state === "POWER" ? "" : (!gauntlet.template ? moment(gauntlet.date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format('dddd, D MMMM YYYY') : "");
    const displayOptions = [{
        key: "pair_cards",
        value: "pair_cards",
        text: t('gauntlet.view_modes.pair_cards.title'),
        title: t('gauntlet.view_modes.pair_cards.heading')
    },
    {
        key: "table",
        value: "table",
        text: t('gauntlet.view_modes.table.title'),
        title: t('gauntlet.view_modes.table.heading'),
    },
    {
        key: "big",
        value: "big",
        text: t('gauntlet.view_modes.big.title'),
        title: t('gauntlet.view_modes.big.heading'),
    },
    {
        key: "small",
        value: "small",
        text: t('gauntlet.view_modes.small.title'),
        heading: t('gauntlet.view_modes.small.heading')
    }]

    if (pane === 'live' && gauntlet?.opponents?.length) {
        displayOptions.push({
            key: "opponent_table",
            value: "opponent_table",
            text: t('gauntlet.view_modes.opponent_table.title'),
            heading: t('gauntlet.view_modes.opponent_table.heading')
        });
    }

    if (gauntlet.unavailable_msg) {
        return (
            <Message icon>
                {randomCrew("q_jdl", globalContext.core.crew)}
                <Message.Content>
                    <Message.Header>{gauntlet.unavailable_msg}</Message.Header>
                    {gauntlet.unavailable_desc_msg}
                </Message.Content>
            </Message>
        )
    }

    return <React.Fragment>
        <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            margin: 0,
            padding: 0,
        }}>
            {featuredCrew && pane !== 'browse' &&
                <div style={{
                    margin: 0,
                    padding: 0,
                    marginRight: "1em"
                }}
                >
                    <ItemDisplay
                        size={64}
                        maxRarity={featuredCrew.max_rarity}
                        rarity={featuredCrew.max_rarity}
                        src={`${process.env.GATSBY_ASSETS_URL}${featuredCrew.imageUrlPortrait}`}
                        allCrew={globalContext.core.crew}
                        playerData={globalContext.player.playerData}
                        targetGroup='gauntletsHover'
                        itemSymbol={featuredCrew?.symbol}
                    />
                </div>
            }
            {pane !== 'browse' && <div><h2 style={{ margin: 0, padding: 0 }}>{featuredCrew?.name}</h2><i>{t('gauntlet.jackpot_crew_for_date', { date: prettyDate })}</i></div>}

            {!!jackpots?.length && pane === 'browse' &&
                <Accordion
                    style={{ margin: "1em 0em" }}
                    defaultActiveIndex={undefined}
                    panels={[{
                        index: 0,
                        key: 'browse_exclusive_panel',
                        title: t('gauntlet.browse_gauntlet_exclusives'),
                        content: {
                            content: <>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    justifyContent: "flex-start",
                                    alignItems: "left"
                                }}>
                                    {jackpots.sort((a, b) => b.date_added.getTime() - a.date_added.getTime())
                                        .map((jcrew) => {
                                            const crit = 0; // ((prettyTraits?.filter(t => jcrew.traits_named.includes(t))?.length ?? 0) * 20 + 5);

                                            return (
                                                <div
                                                    key={`jackpot+${jcrew.symbol}`}
                                                    style={{
                                                        margin: "1em",
                                                        padding: 0,
                                                        width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "72px" : "96px",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "flex-start",
                                                        alignItems: "center",
                                                        textAlign: "center"
                                                    }}>
                                                        <AvatarView
                                                            mode='crew'
                                                            key={"jackpot" + jcrew.symbol}
                                                            size={64}
                                                            targetGroup='gauntletsHover'
                                                            symbol={jcrew?.symbol}
                                                            showMaxRarity={true}
                                                        />
                                                    <i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin: "0.5em 0 0 0" }}>{jcrew.name}</i>
                                                    <i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin: "0.25em 0 0 0" }}>({moment(jcrew.date_added).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("D MMM YYYY")})</i>
                                                </div>
                                            )
                                        })}
                                </div>
                            </>
                        }
                    }]}
                />}


        </div>

        <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            margin: "0.25em 0"
        }}>
            <div style={{
                display: "flex",
                flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
                justifyContent: "space-between"
            }}>
                <div>
                    <h3 style={{ fontSize: "1.5em", margin: "0.25em 0" }}>
                        {prettyDate}
                    </h3>
                    {!!jackpots?.length && pane === 'live' &&
                        <Accordion
                            style={{ margin: "1em 0em" }}
                            defaultActiveIndex={undefined}
                            panels={[{
                                index: 0,
                                key: 'bracket_id_panel',
                                title: `Bracket Id: ${gauntlet.bracket_id}`,
                                content: {
                                    content: <>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            flexWrap: "wrap",
                                            justifyContent: "space-between",
                                        }}>
                                            {jackpots.sort((a, b) => a.name.localeCompare(b.name))
                                                .map((jcrew) => {
                                                    const crit = ((prettyTraits?.filter(t => jcrew?.traits_named?.includes(t))?.length ?? 0) * 20 + 5);
                                                    return (
                                                        <div style={{
                                                            margin: "1em",
                                                            padding: 0,
                                                            width: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "72px" : "96px",
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            justifyContent: "flex-start",
                                                            alignItems: "center",
                                                            textAlign: "center"
                                                        }}
                                                        >
                                                            <AvatarView
                                                                mode='crew'
                                                                key={"jackpot" + jcrew.symbol}
                                                                size={64}
                                                                targetGroup='gauntletsHover'
                                                                symbol={jcrew?.symbol}
                                                            />
                                                            {/* <ItemDisplay
                                                                key={"jackpot" + jcrew.symbol}
                                                                size={64}
                                                                maxRarity={jcrew.max_rarity}
                                                                rarity={jcrew.max_rarity}
                                                                src={`${process.env.GATSBY_ASSETS_URL}${jcrew.imageUrlPortrait}`}
                                                                allCrew={globalContext.core.crew}
                                                                playerData={globalContext.player.playerData}
                                                                targetGroup='gauntletsHover'
                                                                itemSymbol={jcrew?.symbol}
                                                            /> */}
                                                            <i style={{ color: undefined, margin: "0.5em 0 0 0" }}>{jcrew.name}</i>
                                                            <i style={{ color: crit < 25 ? undefined : gradeToColor(crit) ?? undefined, margin: "0.5em 0 0 0" }}>{crit}%</i>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </>
                                }
                            }]}
                        />}

                </div>

                <div style={{
                    display: "flex",
                    flexDirection: "column"
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        marginBottom: "0.25em",
                        textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
                    }}>
                        <h4 style={{ marginRight: "0.5em" }}><b>{t('gauntlet.min_max_proficiency')}:&nbsp;</b></h4>
                        <div>
                            <Dropdown
                                style={{
                                    textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
                                }}
                                inline
                                direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
                                options={[0, 100, 200, 300, 400, 500, 600, 700, 800].map(o => { return { text: o, value: o, key: o } })}
                                value={getRangeMax()}
                                onChange={(e, { value }) => setRangeMax(value as number)} />
                        </div>
                    </div>

                </div>

            </div>
            <div style={{
                display: "flex",
                flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'column' : "row",
                justifyContent: "space-between"
            }}>
                <h2 style={{ fontSize: "2em", margin: "0.25em 0" }}>

                    {gauntlet.state !== "POWER" && (gauntlet.contest_data?.traits.map(t => TRAIT_NAMES[t]).join("/") + "/" + skillToShort(gauntlet.contest_data?.featured_skill ?? ""))}
                    {gauntlet.state === "POWER" && t('gauntlet.base_power')}

                </h2>

                <div style={{
                    display: "flex",
                    flexDirection: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "column" : "row"
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        textAlign: window.innerWidth < DEFAULT_MOBILE_WIDTH ? "left" : "right"
                    }}>
                        <h4><b>{t('gauntlet.view_modes.title')}</b></h4>

                        <Dropdown
                            title={t(`gauntlet.view_modes.${viewMode}.heading`)}
                            direction={window.innerWidth < DEFAULT_MOBILE_WIDTH ? 'right' : 'left'}
                            options={displayOptions}
                            value={viewMode}
                            onChange={(e, { value }) => setViewMode(value as GauntletViewMode)}
                        />
                    </div>
                </div>
            </div>
        </div>

        <div style={{ margin: "0.75em 0", fontSize: "10pt" }}>
            <i>{t('gauntlet.note_owned_crew_power_calc_msg')}</i>
        </div>

    </React.Fragment>

    function setRangeMax(value?: number) {
        setConfig({
            ...config,
            range_max: value
        });
    }

    function getRangeMax() {
        return config.range_max;
    }
}