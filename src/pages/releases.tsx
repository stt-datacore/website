import React from "react"
import { GlobalContext } from "../context/globalcontext";
import { CrewMember } from "../model/crew";
import { CrewPresenter } from "../components/item_presenters/crew_presenter";
import { Button, Grid, Icon } from "semantic-ui-react";
import DataPageLayout from "../components/page/datapagelayout";
import { ClassicPresenter } from "../components/item_presenters/classic_presenter";
import { DEFAULT_MOBILE_WIDTH } from "../components/hovering/hoverstat";
import CONFIG from "../components/CONFIG";

export interface ReleasesProps {
    itemsPerPage?: number;
    crew?: CrewMember[];
}

const ReleasesPage = () => {


    return (<DataPageLayout pageTitle="Releases">
        <Releases />
    </DataPageLayout>)

}

const Releases = (props: ReleasesProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { series } = globalContext.core;
    const crew = props.crew || globalContext.core.crew;
    const itemsPerPage = props.itemsPerPage || 10;
    const [currentPage, setCurrentPage] = React.useState(1);
    crew.sort((a, b) => b.date_added.getTime() - a.date_added.getTime())
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
    }, [currentPage]);

    return (<div>
        <div className="tall-feathered-border" style={{
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
                <Button
                    icon
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= numPages}
                    style={{background: 'transparent'}}>
                    <Icon name='forward' size='large' />
                </Button>
            </div>
        </div>
    </div>)

    function drawCrew(crew: CrewMember, reverse?: boolean) {

        let s = '';
        for(let t of crew.traits_hidden) {
            if (t in series) {
                s = t;
                break;
            }
        }

        const mainContainerStyle = {
                border: '2px solid ' + CONFIG.CREW_SHIP_BATTLE_BONUS_COLORS[crew.action.bonus_type],
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
        return (
            <div style={mainContainerStyle}>
                <div style={bgImageStyle}>
                    <img  style={{width:'90%'}} src={`${process.env.VITE_DATACORE_URL}media/series/${s}.png`}
                        />
                </div>
                <Grid columns={2} style={{gridArea: 'x'}}>
                    {!!reverse && (<>
                        <Grid.Column>
                            <div style={{
                                padding: '5em'
                            }}>
                                <img style={{height: '48em'}} src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlFullBody}`} />
                            </div>
                        </Grid.Column>
                        <Grid.Column>
                            <div style={{
                                padding: '5em'
                            }}>
                                <ClassicPresenter
                                    crew={crew}
                                    />
                            </div>
                        </Grid.Column>
                    </>)}
                    {!reverse && (<>
                        <Grid.Column>
                            <div style={{
                                padding: '5em'
                            }}>
                                <ClassicPresenter
                                    crew={crew}
                                    />
                            </div>
                        </Grid.Column>
                        <Grid.Column>
                            <div style={{
                                padding: '5em'
                            }}>
                                <img style={{height: '48em'}} src={`${process.env.VITE_ASSETS_URL}${crew.imageUrlFullBody}`} />
                            </div>
                        </Grid.Column>
                    </>)}
                </Grid>
            </div>
        )
    }




}




export default ReleasesPage;