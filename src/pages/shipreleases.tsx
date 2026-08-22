import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Grid, Icon, Rating } from "semantic-ui-react";
import CONFIG from "../components/CONFIG";
import { DEFAULT_MOBILE_WIDTH } from "../components/hovering/hoverstat";
import { ClassicPresenter, DateAdded } from "../components/item_presenters/classic_presenter";
import CrewStat from "../components/item_presenters/crewstat";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { CrewMember } from "../model/crew";
import { applyCrewBuffs, gradeToColor, numberToGrade } from "../utils/crewutils";
import { ReferenceShip, Ship } from "../model/ship";
import { getIconPath } from "../utils/assets";
import { mergeRefShips } from "../utils/shiputils";
import { ShipPresenter } from "../components/item_presenters/ship_presenter";
import { StatLabel } from "../components/statlabel";

export interface ReleasesProps {
    itemsPerPage?: number;
    ships?: ReferenceShip[];
}

const ShipReleasesPage = () => {
    const { t } = React.useContext(GlobalContext).localized;

    return (
        <DataPageLayout
            pageTitle={t('menu.game_info.ship_releases')}
            suppressTitleDisplay={true}
            suppressPlayerHeader={true}
            demands={['event_instances', 'collections']}>
            <ShipReleases />
        </DataPageLayout>
    );
}

const ShipReleases = (props: ReleasesProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { series, all_buffs } = globalContext.core;
    const ref_ships = props.ships || globalContext.core.all_ships;
    const ships = mergeRefShips(ref_ships, [], globalContext.localized.SHIP_TRAIT_NAMES, true, false, all_buffs);

    const [itemsPerPage, setItemsPerPage] = React.useState(props.itemsPerPage || 10);
    const [currentPage, setCurrentPage] = React.useState(1);
    const navigate = useNavigate();
    const [bigShow, setBigShow] = React.useState(undefined as Ship | undefined);
    const [lastScroll, setLastScroll] = React.useState(0);

    const topRare = {} as {[key:string]: {symbol: string, score: number}[]}
    const shipRare = {} as {[key:string]: {score:number, rank: number}}
    for (let ship of ships) {
        topRare[ship.rarity] ??= [];
        topRare[ship.rarity].push({
            symbol: ship.symbol,
            score: ship.ranks!.overall
        });
    }
    Object.values(topRare).forEach((list) => {
        list.sort((a, b) => b.score - a.score);
        let max = list[0].score;
        let x = 1;
        for (let l of list) {
            l.score = l.score / max;
            shipRare[l.symbol] = {
                score: l.score,
                rank: x
            }
            x++;
        }
    })
    ships.sort((a, b) => {
        if (a.preview && b.preview) {
            return b.archetype_id! - a.archetype_id!;
        }
        return b.date_added!.getTime() - a.date_added!.getTime()
    });

    const numPages = React.useMemo(() => {
        let np = Math.ceil(ships.length / itemsPerPage);
        if (currentPage > np) {
            setTimeout(() => {
                setCurrentPage(np);
            });
        }
        return np;
    }, [itemsPerPage]);

    const pageData = React.useMemo(() => {
        let cp = currentPage - 1;
        return ships.slice(cp * itemsPerPage, (cp * itemsPerPage) + itemsPerPage);
    }, [currentPage, itemsPerPage]);

    return (<div>
        {!bigShow && <div className="tall-feathered-border" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            width: '100%'
        }}>
            {pageData.map((ship, idx) => {
                return (
                    <div key={`${ship.symbol}_${idx}_release`}>
                        {drawShip(ship, idx % 2 != 0)}
                    </div>
                )
            })}

            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '2em 2em'
            }}>
                <Button
                    icon
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{background: 'transparent'}}>
                    <Icon name='backward' size='large' />
                </Button>
                <a onClick={() => setItemsPerPage(itemsPerPage + 10)}
                    style={{
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12pt'
                    }}>
                    {t('global.show_more_ellipses')}
                </a>
                <Button
                    icon
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= numPages}
                    style={{background: 'transparent'}}>
                    <Icon name='forward' size='large' />
                </Button>
            </div>
        </div>}
        {!!bigShow && drawBigShow(bigShow)}
    </div>);

    function drawBigShow(ship: Ship) {

        return (
            <div
                onClick={() => toggleBigShow(undefined)}
                className="tall-feathered-border" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'fixed',
                left: `1em`,
                top: `1em`,
                width: 'calc(100vw - 2em)',
                height: 'calc(100vh - 2em)',
                cursor: 'zoom-out'
            }}>
                <img style={{ height: !isMobile ? 'calc(100vh - 14em)' : undefined}} src={`${process.env.VITE_ASSETS_URL}${getIconPath(ship.icon!, true)}`} />
                <div>
                    <Rating maxRating={ship.rarity} rating={ship.rarity} icon='star' size='huge' />
                </div>
                <div style={{fontFamily: 'Star Cine', marginTop: '0.5em', fontSize: '2em', color: CONFIG.RARITIES[ship.rarity].color}}>
                    {ship.name}
                </div>

            </div>
        );
    }

    function drawShip(ship: Ship, reverse?: boolean) {
        let img = '';
        if (ship.series && ship.series in series) {
            img = `${process.env.VITE_DATACORE_URL}media/series/${ship.series}.png`;
        }

        const mainContainerStyle = {
            borderRadius: '4em',
            margin: '1em 0',
            fontSize:
                isMobile ? "10pt" : "11pt",
            display: "grid",
            gridTemplateAreas: `'x`,
            textAlign: 'left'
        } as React.CSSProperties;

        const bgImageStyle = {
            opacity: 0.1,
            gridArea: 'x',
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "2.5em",
            width: '100%',
            height: '100%',
            alignItems: "center",
        } as React.CSSProperties;

        const col_img = (
            <Grid.Column style={{
                marginLeft: isMobile ? undefined : reverse ? '0' : '-4em',
                marginRight: isMobile ? undefined : !reverse ? '0' : '-4em',
                }}>
                <div style={{
                    display: 'grid',
                    gridTemplateAreas: `'z' 'w'`,
                    cursor: 'zoom-in'
                    }}
                    onClick={() => toggleBigShow(ship)}
                    >
                    <div style={{
                        gridArea: 'w',
                        display: 'flex',
                        justifyContent: 'center' // reverse ? 'flex-end' : 'flex-start'
                        //padding: reverse ? '0 0 0 5em' : '0 0 0 5em',
                    }}>
                        <img style={{
                            height: isMobile ? undefined : '36em',
                            width: isMobile ? 'calc(100%)' : undefined,
                        }} src={`${process.env.VITE_ASSETS_URL}${getIconPath(ship.icon!, true)}`} />
                    </div>
                </div>
            </Grid.Column>
        );

        const statStyle = { background: 'rgba(127, 127, 127, 0.25)', border: '1px solid #666' };

        const col_present = (
            <Grid.Column>
                <div style={{
                    padding: isMobile ? '0 0.5em' : '0 4em',
                    margin: '2em 0'
                }}>
                    <p>{ship.flavor}</p>
                    <ShipPresenter
                        statsOnly
                        noRarity
                        ship={ship}
                        hover={false}
                        navigate={navigate}
                        storeName="shipreleases"
                        />
                    <br />
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '1em'
                    }}>
                        <StatLabel
                            size='jumbo'
                            style={statStyle}
                            title={t('rank_names.ship_rank')}
                            value={
                                <div style={{color: gradeToColor(ship.ranks!.overall / 100)}}>
                                    {ship.ranks!.overall_rank}
                                </div>
                            }
                            />
                        <StatLabel
                            size='jumbo'
                            style={statStyle}
                            title={t('base.rarity')}
                            value={
                                <div style={{color: gradeToColor(shipRare[ship.symbol].score)}}>
                                    {shipRare[ship.symbol].rank}
                                </div>
                            }
                            />
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '1em'
                    }}>
                        <StatLabel
                            style={statStyle}
                            title={t('rank_names.arena_rank')}
                            value={
                                <div style={{color: gradeToColor(ship.ranks!.arena / 100)}}>
                                    {ship.ranks!.arena}
                                </div>
                            }
                            />
                        <StatLabel
                            style={statStyle}
                            title={t('rank_names.fbb_rank')}
                            value={
                                <div style={{color: gradeToColor(ship.ranks!.fbb / 100)}}>
                                    {ship.ranks!.fbb}
                                </div>
                            }
                            />
                    </div>
                    <div>
                        <DateAdded crew={ship as any as CrewMember} />
                    </div>
                </div>
            </Grid.Column>
        );

        return (
            <div style={mainContainerStyle}>
                <div style={bgImageStyle}>
                    <img  style={{width:'90%'}} src={img}
                        />
                </div>
                <Grid columns={isMobile ? 1 : 2} style={{gridArea: 'x'}}>
                    <Grid.Row columns={1}>
                        <Grid.Column>
                            <div
                                onClick={() => navigate(`/ship/${ship.symbol}`)}
                                style={{
                                fontSize: '1em',
                                display: 'flex',
                                flexDirection:'column',
                                justifyContent:'center',
                                alignItems:'center',
                                fontFamily: 'Star Cine',
                                textAlign: 'center',
                                padding: '2em 0 2em 0',
                                cursor: 'pointer',
                                color: CONFIG.RARITIES[ship.rarity].color,
                                gap:'1em'
                                }}>
                                <div style={{fontSize: '2em', lineHeight: '2em'}}>
                                    {ship.name}
                                </div>
                                <Rating size="huge" maxRating={ship.rarity} rating={ship.rarity} icon="star" />
                                <div style={{
                                    border: '1px solid ' + CONFIG.RARITIES[ship.rarity].color,
                                    borderRadius: '4em',
                                    padding: '1em',
                                    gap: '1em',
                                    display: 'inline-flex',
                                    justifySelf: 'center',
                                    justifyContent: 'center',
                                    flexDirection:'row',
                                    flexWrap: isMobile ? 'wrap' : undefined,
                                    background: CONFIG.RARITIES[ship.rarity].rgb.replace("1)", "0.25)")
                                    }}>
                                    {ship.battle_stations?.map((bs, idx) => {
                                        return (
                                            <img
                                                key={`${bs.skill}_key_${ship.symbol}_${idx}`}
                                                style={{ height: "2em", margin: '0.5em 1em' }}
                                                src={`${process.env.VITE_ASSETS_URL}atlas/icon_${bs.skill}.png`}
                                            />
                                        );
                                    })}
                                </div>
                                <div style={{fontSize: '1.5em'}}>
                                    {ship.preview ? t('global.pending_release') : ship.date_added?.toLocaleDateString()}
                                </div>
                            </div>
                        </Grid.Column>
                    </Grid.Row>
                    {!isMobile && (<>
                        <Grid.Row>
                            {!!reverse && (<>
                                {col_img}
                                {col_present}
                            </>)}
                            {!reverse && (<>
                                {col_present}
                                {col_img}
                            </>)}
                        </Grid.Row>
                    </>)}
                    {!!isMobile && (<>
                        <Grid.Row>
                            {true && (<>
                                {col_img}
                                {col_present}
                            </>)}
                        </Grid.Row>
                    </>)}
                </Grid>
            </div>
        )
    }

    function toggleBigShow(value?: Ship) {
        if (isMobile && value) return;
        if (typeof window === 'undefined') return;
        if (value) {
            setLastScroll(window.scrollY);
        }
        else {
            setTimeout(() => {
                window.scrollTo(0, lastScroll);
            });
        }
        setBigShow(value);
    }
}

export default ShipReleasesPage;