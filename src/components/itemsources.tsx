import React, { PureComponent } from 'react';

import MissionCost from './missioncost';
import { EquipmentItemSource } from '../model/equipment';
import { Link } from 'gatsby';
import CONFIG from './CONFIG';

type ItemSourcesProps = {
	item_sources: EquipmentItemSource[];
	brief?: boolean;
	refItem?: string;
};

class ItemSources extends PureComponent<ItemSourcesProps> {
	render() {
		let disputeMissions = this.props.item_sources.filter(e => e.type === 0);
		let shipBattles = this.props.item_sources.filter(e => e.type === 2);
		let factions = this.props.item_sources.filter(e => e.type === 1);
		let cadets = this.props.item_sources.filter(e => e.type === 4);
		const { brief, refItem } = this.props;

		let res = [] as JSX.Element[];
		if (disputeMissions.length > 0) {
			res.push(
				<p key={'disputeMissions'}>
					<b>Missions: </b>
					{disputeMissions
						.slice(0, brief ? 1 : undefined)
						.map((entry, idx) => (
							<MissionCost
								key={idx}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={entry.name}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}, {curr}</>)}
					{refItem && brief && disputeMissions.length > 1 && <>, <Link to={`/item_info?symbol=${refItem}`}>and {disputeMissions.length - 1} more ...</Link></>}	
					{!refItem && brief && disputeMissions.length > 1 && <>, and {disputeMissions.length - 1} more ...</>}
				</p>
			);
		}

		if (shipBattles.length > 0) {
			res.push(
				<p key={'shipBattles'}>
					<b>Ship battles: </b>
					{shipBattles
						.slice(0, brief ? 1 : undefined)
						.map((entry, idx) => (
							<MissionCost
								key={idx}
								mission_symbol={entry.mission_symbol}
								cost={entry.cost ?? 0}
								avg_cost={entry.avg_cost}
								name={entry.name}
								chance_grade={entry.chance_grade}
								mastery={entry.mastery ?? 0}
							/>
						))
						.reduce((prev, curr) => <>{prev}, {curr}</>)}
					{refItem && brief && shipBattles.length > 1 && <>, <Link to={`/item_info?symbol=${refItem}`}>and {shipBattles.length - 1} more ...</Link></>}	
					{!refItem && brief && shipBattles.length > 1 && <>, and {shipBattles.length - 1} more ...</>}
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

		if (cadets.length > 0) {
			res.push(
				<p key={'cadets'}>
					<b>Cadet challenges: </b>
					{cadets.map((entry, idx) => `${entry.cadet_mission}: ${entry.name} (${entry.mastery !== undefined ? CONFIG.MASTERY_LEVELS[entry.mastery].name : ""})`).join(', ')}
				</p>
			);
		}

		return res;
	}
}

export default ItemSources;