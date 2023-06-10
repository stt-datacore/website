import React, { Component } from 'react';
import { Table, Icon, Pagination, Dropdown } from 'semantic-ui-react';

import { findPotentialCrew, mergeShips } from '../utils/shiputils';
import { IConfigSortData, IResultSortDataBy, sortDataBy } from '../utils/datasort';
import { Ship, Schematics, Ability, ShipBonus } from '../model/ship';
import { PlayerCrew, PlayerData } from '../model/player';
import CONFIG from './CONFIG';
import { ShipHoverStat, ShipTarget } from './hovering/shiphoverstat';
import { CrewMember } from '../model/crew';
import { ShipPresenter } from './item_presenters/ship_presenter';

type ShipProfileProps = {
	playerData: PlayerData;
    ship?: string;
    allCrew: (PlayerCrew | CrewMember)[];
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
	constructor(props: ShipProfileProps) {
		super(props);

		this.state = {
			data: [],
			originals: []
		};
	}

	componentDidMount() {
		fetch('/structured/ship_schematics.json')
			.then(response => response.json())
			.then((ship_schematics: Schematics[]) => {
				let scsave = ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: sc.ship.level + 1 })) as Ship))
				let data = mergeShips(ship_schematics, this.props.playerData.player.character.ships);
				this.setState({ data, originals: scsave });
            });
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
        if (!ship_key || !data) {
            window.location.href = '/playertools?tool=ships';
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

                <ShipPresenter hover={false} ship={ship} storeName='shipProfile' />
            </div>
			</>);
	}
}

export default ShipProfile;
