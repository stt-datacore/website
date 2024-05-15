import React, { Component } from 'react';
import DataPageLayout from '../components/page/datapagelayout';
import { GlobalContext } from '../context/globalcontext';
import { Grid } from 'semantic-ui-react';
import ItemDisplay from '../components/itemdisplay';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { Link, navigate } from 'gatsby';
import { ShipHoverStat, ShipTarget } from '../components/hovering/shiphoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';
import CONFIG from '../components/CONFIG';

const HomePage = () => {

    return (
        <DataPageLayout demands={['gauntlets']}>
            <HomePageComponent />
        </DataPageLayout>    
    )
}



export interface HomePageProps {

}

interface HomePageState {

}

class HomePageComponent extends Component<HomePageProps, HomePageState> {
    static contextType = GlobalContext;
    context!: React.ContextType<typeof GlobalContext>;
    
    constructor(props: HomePageProps) {
        super(props);

        this.state = {

        };

    }

    render() {

        const { playerData } = this.context.player;
        const { translation: allTraits, gauntlets, items, crew, ships } = this.context.core;

        const exclusive = crew.find(f => f.symbol === gauntlets[0].jackpot_crew);
        let crs = [ ... crew].sort((a, b) => b.date_added.getTime() - a.date_added.getTime())[0];
        const featured = crs;
        
        const ship = ships[ships.length - 1];
        const equip = items.find(f => f.symbol === 'arabian_nights_holoprogram_quality5_equip');

        let todayGauntlet = gauntlets[0];
        let gauntletStr = `${todayGauntlet.contest_data?.traits.map(t => allTraits.trait_names[t]).join("/")}/${CONFIG.SKILLS_SHORT.find(f => f.name === todayGauntlet.contest_data?.featured_skill ?? "")?.short}`
        
        const cardStyle = {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            margin: "1em",
            padding: "1em",            
        } as React.CSSProperties;

        return (<div>
            <Grid>
                <Grid.Row>
                    <div style={{display: "flex", flexDirection: "row", margin: "2em", justifyContent: "center", alignItems: 'center'}}>
                        <img src='/media/logo.png' style={{margin: "0 1em 0 0"}} />
                        <h1 style={{margin: 0}}>datacore.app</h1>
                    </div>
                </Grid.Row>
                <Grid.Row columns={3}>
                    <Grid.Column>
                        <div className='ui segment' style={cardStyle}>
                            <div style={{display: 'flex', flexDirection: 'row', alignItems: "center", justifyContent: "center"}}>
                                {exclusive && <ItemDisplay
                                    style={{margin:"1em"}}
                                    size={64}
                                    rarity={exclusive.max_rarity}
                                    maxRarity={exclusive.max_rarity}
                                    src={`${process.env.GATSBY_ASSETS_URL}${exclusive.imageUrlPortrait}`}
                                    targetGroup='homepage'
                                    allCrew={crew}
                                    allItems={items}
                                    playerData={playerData}
                                    itemSymbol={exclusive.symbol}
                                    />}
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <h1><Link to='/gauntlets'>Gauntlets</Link></h1>
                                    <div style={{textAlign: "left"}}>
                                        
                                        <h3>Today's Gauntlet</h3>
                                        <span>{gauntletStr}</span>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>                    
                    </Grid.Column>
                    <Grid.Column>
                        <div className='ui segment' style={cardStyle}>
                            <div style={{display: 'flex', flexDirection: 'row', alignItems: "center"}}>
                                {featured && <ItemDisplay
                                    style={{marginRight:"1em"}}
                                    size={64}
                                    rarity={featured.max_rarity}
                                    maxRarity={featured.max_rarity}
                                    src={`${process.env.GATSBY_ASSETS_URL}${featured.imageUrlPortrait}`}
                                    targetGroup='homepage'
                                    allCrew={crew}
                                    allItems={items}
                                    playerData={playerData}
                                    itemSymbol={featured.symbol}
                                    />}
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <h1><Link to='/'>Crew</Link></h1>
                                    <div style={{textAlign: "left"}}>
                                         
                                        <h3>Newest Crew</h3>
                                        <span style={{cursor: "pointer", fontWeight: "bold", textDecoration: "underline"}} onClick={(e) => navigate('/crew/'+featured.symbol)}>
                                        {featured.name}
                                        </span>
                                        
                                    </div>
                                    
                                </div>
                            </div>
                        </div>                    
                    </Grid.Column>
                    <Grid.Column>
                        <div className='ui segment' style={{...cardStyle}}>
                            <div style={{display: 'flex', flexDirection: 'row', alignItems: "center"}}>
                                {ship && 
                                
                                <ShipTarget inputItem={ship} targetGroup='homepage_ships'>
                                    <ItemDisplay
                                        style={{marginRight:"1em"}}
                                        size={64}
                                        rarity={ship.rarity}
                                        maxRarity={ship.rarity}
                                        src={`${process.env.GATSBY_ASSETS_URL}${ship.icon?.file.slice(1).replace('/', '_')}.png`}
                                        targetGroup='homepage_ships'
                                        allCrew={crew}
                                        allItems={items}
                                        playerData={playerData}
                                        itemSymbol={ship.symbol}
                                        />
                                </ShipTarget>}
                                <div style={{display: 'flex', flexDirection: 'column'}}>
                                    <h1><Link to='/ships'>Ships</Link></h1>
                                    <div style={{textAlign: "left"}}>
                                         
                                        <h3>Newest Ship</h3>
                                        <span style={{cursor: "pointer", fontWeight: "bold", textDecoration: "underline"}} onClick={(e) => navigate('/crew/'+featured.symbol)}>
                                        {ship?.name}
                                        </span>
                                        
                                    </div>
                                    
                                </div>
                            </div>
                        </div>                    
                    </Grid.Column>
                </Grid.Row>
                
            </Grid>

            <CrewHoverStat targetGroup='homepage' />
            <ShipHoverStat targetGroup='homepage_ships' />
            <ItemHoverStat targetGroup='homepage_items' />
        </div>)

    }



}

export default HomePage;



