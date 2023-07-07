import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown, Message } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship, Schematics, Ability, ShipBonus } from '../model/ship';
import { PlayerCrew, PlayerData } from '../model/player';
import CONFIG from './CONFIG';
import { ShipHoverStat, ShipTarget } from './hovering/shiphoverstat';
import { CrewMember } from '../model/crew';
import { ShipPresenter } from './item_presenters/ship_presenter';
import { MergedContext } from '../context/mergedcontext';
import { navigate } from 'gatsby';

type ShipProfileProps = {
    ship?: string;
};

type ShipProfileState = {
	data: Ship[];
	originals: Ship[];
	activeShip?: Ship | null;
};

const pagingOptions = [
	{ key: '0', value: '10', text: '10' },
	{ key: '1', value: '25', text: '25' },
	{ key: '2', value: '50', text: '50' },
	{ key: '3', value: '100', text: '100' }
];

class ShipProfile extends Component<ShipProfileProps, ShipProfileState> {
	static contextType = MergedContext;
	context!: React.ContextType<typeof MergedContext>;

	constructor(props: ShipProfileProps) {
		super(props);

		this.state = {
			data: [],
			originals: []
		};
	}

	componentDidMount() {
		this.setState({ data: this.context.playerShips ?? [], originals: this.context.allShips ?? []});
	}

	render() {
    	const { data } = this.state;
        let ship_key: string | undefined = this.props.ship;

        if (!ship_key) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('ship')) {
                ship_key = urlParams.get('ship') ?? undefined;
            }
        }
		if (window.location.href.includes("ship")) {
			if (!ship_key || !data) {
				navigate('/playertools?tool=ships');
			}		
		}
        const ship = data.find(d => d.symbol === ship_key);
        if (!ship) return <></>

		return (<>
            <div style={{
                display: "flex",				
				width: "100%",
                fontSize: "12pt",
                flexDirection: "column",
                justifyContent: "center",
				alignItems: "center"
            }}>
				<Message icon warning>
					<Icon name="exclamation triangle" />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
							This section is under development and not fully functional yet.
						</Message.Content>
					</Message>

                <ShipPresenter hover={false} ship={ship} storeName='shipProfile' />

				<h3>Battle Stations</h3>
				<div style={{
					display: "flex",
					flexDirection: "row",
					justifyContent: "center",
					alignItems: "center",
					padding: 0
				}}>
					{ship.battle_stations?.map((bs, idx) => (
						<div key={idx} 
							className="ui segment button" 
							style={{
								margin: "2em",
								display: "flex",
								flexDirection: "row",
								width: "128px", 
								height: "128px", 
								padding: "1em", 
								justifyContent: "center", 
								alignItems: "center"}}>
							<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${bs.skill}.png`} style={{ height: "64px"}} />
						</div>
					))}
				</div>
            </div>
			</>);
	}
}

export default ShipProfile;
