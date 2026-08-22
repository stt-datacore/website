import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Grid, Icon, Rating } from "semantic-ui-react";
import CONFIG from "../components/CONFIG";
import { DEFAULT_MOBILE_WIDTH } from "../components/hovering/hoverstat";
import { ClassicPresenter } from "../components/item_presenters/classic_presenter";
import CrewStat from "../components/item_presenters/crewstat";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { CrewMember } from "../model/crew";
import { applyCrewBuffs } from "../utils/crewutils";

export interface ReleasesProps {
    itemsPerPage?: number;
    crew?: CrewMember[];
}

const ReleasesPage = () => {
    const { t } = React.useContext(GlobalContext).localized;

    return (
        <DataPageLayout
            pageTitle={t('menu.game_info.crew_releases')}
            suppressTitleDisplay={true}
            suppressPlayerHeader={true}
            demands={['event_instances', 'collections']}>
            <Releases />
        </DataPageLayout>
    )
}

const Releases = (props: ReleasesProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { series, all_buffs } = globalContext.core;
    const crew = props.crew || globalContext.core.crew;

    const [itemsPerPage, setItemsPerPage] = React.useState(props.itemsPerPage || 10);
    const [currentPage, setCurrentPage] = React.useState(1);
    const navigate = useNavigate();
    const [bigShow, setBigShow] = React.useState(undefined as CrewMember | undefined);
    const [lastScroll, setLastScroll] = React.useState(0);

    crew.sort((a, b) => {
        if (a.preview && b.preview) {
            return b.archetype_id - a.archetype_id;
        }
        return b.date_added.getTime() - a.date_added.getTime()
    });

    const numPages = React.useMemo(() => {
        let np = Math.ceil(crew.length / itemsPerPage);
        if (currentPage > np) {
            setTimeout(() => {
                setCurrentPage(np);
            });
        }
        return np;
    }, [itemsPerPage]);

    const pageData = React.useMemo(() => {
        let cp = currentPage - 1;
        return crew.slice(cp * itemsPerPage, (cp * itemsPerPage) + itemsPerPage);
    }, [currentPage, itemsPerPage]);

    return (<div>
        {!bigShow && <div className="tall-feathered-border" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            width: '100%'
        }}>
            {pageData.map((crew, idx) => {
                return (
                    <div key={`${crew.symbol}_${idx}_release`}>
                        {drawCrew(crew, idx % 2 != 0)}
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

    function drawBigShow(crew: CrewMember) {

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
                <img style={{ height: !isMobile ? 'calc(100vh - 14em)' : undefined}} src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlFullBody}`} />
                <div>
                    <Rating maxRating={crew.max_rarity} rating={crew.max_rarity} icon='star' size='huge' />
                </div>
                <div style={{fontFamily: 'Star Cine', marginTop: '0.5em', fontSize: '2em', color: CONFIG.RARITIES[crew.max_rarity].color}}>
                    {crew.name}
                </div>

            </div>
        );
    }

    function drawCrew(crew: CrewMember, reverse?: boolean) {

        let img = '';

        applyCrewBuffs(crew, all_buffs);

        for(let t of crew.traits_hidden) {
            if (t in series) {
                img = `${process.env.VITE_DATACORE_URL}media/series/${t}.png`;
                break;
            }
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
                    onClick={() => toggleBigShow(crew)}
                    >
                    <div style={{
                        gridArea: 'w',
                        display: 'flex',
                        justifyContent: 'center' // reverse ? 'flex-end' : 'flex-start'
                        //padding: reverse ? '0 0 0 5em' : '0 0 0 5em',
                    }}>
                        <img style={{height: '60em'}} src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlFullBody}`} />
                    </div>
                </div>
            </Grid.Column>
        );

        const col_present = (
            <Grid.Column>
                <div style={{
                    padding: isMobile ? '0 2em' : '0 4em',
                    margin: '2em 0'
                }}>
                    <ClassicPresenter
                        coolMode={true}
                        //compact={isMobile}
                        fields={[
                            'flavor',
                            'ship_ability',
                            'rank_highlights',
                            'ranks',
                            'short_name',
                            'traits',
                            'collections',
                            'nicknames',
                            'cross_fuses',
                            'date_added',
                            'cap_achiever'
                        ]}
                        crew={crew}
                        />
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
                                onClick={() => navigate(`/crew/${crew.symbol}`)}
                                style={{
                                fontSize: '1em',
                                display: 'flex',
                                flexDirection:'column',
                                justifyContent:'center',
                                alignItems:'center',
                                fontFamily: 'Star Cine',
                                textAlign: 'center',
                                padding: '2em 0',
                                cursor: 'pointer',
                                color: CONFIG.RARITIES[crew.max_rarity].color,
                                gap:'1em'
                                }}>
                                <div style={{fontSize: '2em', lineHeight: '2em'}}>
                                    {crew.name}
                                </div>
                                <Rating size="huge" maxRating={crew.max_rarity} rating={crew.max_rarity} icon="star" />
                                <div style={{
                                    border: '1px solid ' + CONFIG.RARITIES[crew.max_rarity].color,
                                    borderRadius: '4em',
                                    padding: '1em',
                                    gap: isMobile ? '0.5em' : '1em',
                                    margin: isMobile ? '1em' : undefined,
                                    display: 'inline-flex',
                                    justifySelf: 'center',
                                    justifyContent: 'center',
                                    flexDirection:'row',
                                    flexWrap: isMobile ? 'wrap' : undefined,
                                    background: CONFIG.RARITIES[crew.max_rarity].rgb.replace("1)", "0.25)")
                                    }}>
                                    {crew.skill_order.map((sko) => {
                                        return (<div key={`${crew.symbol}_sko_${sko}`} style={{padding:'1em 0'}}>
                                            <CrewStat skill_name={sko} data={crew[sko]} scale={1} />
                                        </div>)
                                    })}
                                </div>
                                <div style={{fontSize: '1.5em'}}>
                                    {crew.preview ? t('global.pending_release') : crew.date_added?.toLocaleDateString()}
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

    function toggleBigShow(value?: CrewMember) {
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




export default ReleasesPage;