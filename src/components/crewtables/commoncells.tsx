import React from 'react';
import { Table, Label } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';

import { formatTierLabel } from '../../utils/crewutils';

import allTraits from '../../../static/structured/translation_en.json';
import { PlayerCrew } from '../../model/player';
import { CrewMember } from '../../model/crew';
import * as moment from  'moment';

type CrewCellProps = {
	crew: PlayerCrew | CrewMember;
};

export const CrewTraitMatchesCell = (props: any) => {
	const { crew, traitCounts } = props;
	const colorize = (trait: string) => {
		let background = 'grey', color = 'white';
		if (traitCounts[trait] === 1) {
			background = '#fdd26a';
			color = 'black';
		}
		else if (traitCounts[trait] === 2) {
			background = '#aa2deb';
		}
		else if (traitCounts[trait] === 3) {
			background = '#5aaaff';
		}
		else if (traitCounts[trait] === 4) {
			background = '#50aa3c';
		}
		else if (traitCounts[trait] === 5) {
			background = '#9b9b9b';
		}
		return { background, color };
	};
	const traitList = props.traitList ?? crew.traits_matched;
	return (
		<Table.Cell textAlign='center'>
			{traitList.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
				<Label key={idx} style={traitCounts ? colorize(trait) : undefined}>
					{allTraits.trait_names[trait]}
				</Label>
			)).reduce((prev, curr) => [prev, ' ', curr], [])}
		</Table.Cell>
	);
};

export const CrewBaseCells = (props: CrewCellProps) => {
	const { crew } = props;
	const rarityLabels = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary'];

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<b>{formatTierLabel(crew)}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>{crew.cab_ov}</b><br />
				<small>{rarityLabels[crew.max_rarity-1]} #{crew.cab_ov_rank}</small>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>#{crew.ranks.voyRank}</b><br />
				{crew.ranks.voyTriplet && <small>Triplet #{crew.ranks.voyTriplet.rank}</small>}
			</Table.Cell>
			{CONFIG.SKILLS_SHORT.map(skill =>
				crew[skill.name].core > 0 ? (
					<Table.Cell key={skill.name} textAlign='center'>
						<b>{crew[skill.name].core}</b>
						<br />
						+({crew[skill.name].min}-{crew[skill.name].max})
					</Table.Cell>
				) : (
					<Table.Cell key={skill.name} />
				)
			)}
			<Table.Cell textAlign='center'>
				{moment(crew.date_added).format("MMMM Do YYYY")}
			</Table.Cell>
		</React.Fragment>
	);
};

export const CrewShipCells = (props: CrewCellProps) => {
	const { crew } = props;

	return (
		<React.Fragment>
			<Table.Cell textAlign='center'>
				<b>{CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.bonus_amount && <>+<b>{crew.action.bonus_amount}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.penalty && <><b>{CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type]}</b> -<b>{crew.action.penalty.amount}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.initial_cooldown >= 0 && <><b>{crew.action.initial_cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.cooldown >= 0 && <><b>{crew.action.cycle_time}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.cooldown >= 0 && <><b>{crew.action.cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.duration && <><b>{crew.action.duration}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.limit && <><b>{crew.action.limit}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability && <>{crew.action.ability_text}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability && <>{CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</> || <>None</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.charge_phases && <>{crew.action.charge_text}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.accuracy && <>+<b>{crew.ship_battle.accuracy}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.crit_bonus && <>+<b>{crew.ship_battle.crit_bonus}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.crit_chance && <>+<b>{crew.ship_battle.crit_chance}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.ship_battle.evasion && <>+<b>{crew.ship_battle.evasion}</b></>}
			</Table.Cell>
		</React.Fragment>
	);
};