import React, { Component } from 'react';
import { Message } from 'semantic-ui-react';

import VaultCrew from './vaultcrew';

type ProfileCrewMobileProps = {
	playerData: any;
};

type ProfileCrewMobileState = {
	column: any;
	direction: 'descending' | 'ascending' | null;
	searchFilter: string;
	data: any[];
};

class ProfileCrewMobile extends Component<ProfileCrewMobileProps, ProfileCrewMobileState> {
	constructor(props: ProfileCrewMobileProps) {
		super(props);

		this.state = {
			column: null,
			direction: null,
			searchFilter: '',
			data: this.props.playerData.player.character.crew
		};
	}

	componentDidMount() {
		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				this.props.playerData.player.character.crew.forEach(crew => {
					crew.equipment_slots.forEach(es => {
						let itemEntry = items.find(i => i.symbol === es.symbol);
						if (itemEntry) {
							es.imageUrl = itemEntry.imageUrl;
						}
					});
				});
			});
	}

	// TODO: share this code with index.tsx
	_handleSort(clickedColumn, isSkill) {
		const { column, direction } = this.state;
		let { data } = this.state;

		if (column !== clickedColumn) {
			const compare = (a, b) => (a > b ? 1 : b > a ? -1 : 0);

			let sortedData;
			if (isSkill) {
				sortedData = data.sort(
					(a, b) =>
						(a.base_skills[clickedColumn] ? a.base_skills[clickedColumn].core : 0) -
						(b.base_skills[clickedColumn] ? b.base_skills[clickedColumn].core : 0)
				);
			} else {
				sortedData = data.sort((a, b) => compare(a[clickedColumn], b[clickedColumn]));
			}

			this.setState({
				column: clickedColumn,
				direction: 'ascending',
				data: sortedData
			});
		} else {
			this.setState({
				direction: direction === 'ascending' ? 'descending' : 'ascending',
				data: data.reverse()
			});
		}
	}

	render() {
		const { column, direction } = this.state;
		let { data } = this.state;

		return (
			<div>
				<Message warning>
					<Message.Header>Under construction!</Message.Header>
					<p>This section is under construction; coming soon!</p>
				</Message>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2em' }}>
					{data.map((crew, idx) => (
						<VaultCrew key={idx} crew={crew} size={1} />
					))}
				</div>
			</div>
		);
	}
}

export default ProfileCrewMobile;
