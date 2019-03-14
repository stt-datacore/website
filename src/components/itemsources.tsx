import React, { Component } from 'react';

import { graphql } from 'gatsby';

import MissionCost from './missioncost';

type ItemSourcesProps = {
    item_sources: any;
};

class ItemSources extends Component<ItemSourcesProps> {
	render() {
		let disputeMissions = this.props.item_sources.filter(e => e.type === 0);
		let shipBattles = this.props.item_sources.filter(e => e.type === 2);
		let factions = this.props.item_sources.filter(e => e.type === 1);

		let res = [];
		if (disputeMissions.length > 0) {
			res.push(
				<p key={'disputeMissions'}>
					<b>Missions: </b>
					{disputeMissions
						.map((entry, idx) => <MissionCost key={idx} mission={entry.id || {name: entry.name}} chance_grade={entry.chance_grade} mastery={entry.mastery} />)
						.reduce((prev, curr) => [prev, ', ', curr])}
				</p>
			);
		}

		if (shipBattles.length > 0) {
			res.push(
				<p key={'shipBattles'}>
					<b>Ship battles: </b>
					{shipBattles
						.map((entry, idx) => <MissionCost key={idx} mission={entry.id || {name: entry.name}} chance_grade={entry.chance_grade} mastery={entry.mastery} />)
						.reduce((prev, curr) => [prev, ', ', curr])}
				</p>
			);
		}

		if (factions.length > 0) {
			res.push(
				<p key={'factions'}>
					<b>Faction missions: </b>
					{factions.map((entry, idx) => `${entry.name} (${entry.chance_grade}/5)`).join(', ')}
				</p>
			);
		}

		return res;
	}
}

export default ItemSources;

export const query = graphql`
	fragment ItemSourcesFragment on ItemsJson {
		item_sources {
			type
			id {
				...MissionsFragment
			}
			name
			energy_quotient
			chance_grade
			place
			mission
			dispute
			mastery
			challenge_id
			challenge_skill
			challenge_difficulty
		}
	}
`;
