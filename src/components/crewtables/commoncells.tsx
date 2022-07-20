import React from 'react';
import { Table, Label } from 'semantic-ui-react';

import CONFIG from '../../components/CONFIG';

import { formatTierLabel } from '../../utils/crewutils';

import allTraits from '../../../static/structured/translation_en.json';

type CrewCellProps = {
	crew: any;
};

export const CrewTraitMatchesCell = (props: CrewCellProps) => {
	const { crew } = props;
	return (
		<Table.Cell textAlign='center'>
			{crew.traits_matched.sort((a, b) => allTraits.trait_names[a].localeCompare(allTraits.trait_names[b])).map((trait, idx) => (
				<Label key={idx} color='brown'>
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
				<b>{formatTierLabel(crew.bigbook_tier)}</b>
			</Table.Cell>
			<Table.Cell textAlign='center'>
				<b>{crew.cab_ov}</b><br />
				<small>{rarityLabels[parseInt(crew.max_rarity)-1]} #{crew.cab_ov_rank}</small>
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
				{crew.action.cooldown >= 0 && <><b>{crew.action.cooldown}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.duration && <><b>{crew.action.duration}</b>s</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.limit && <><b>{crew.action.limit}</b></>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability.type !== '' && <>{CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', crew.action.ability.amount)}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.ability.type !== '' && <>{CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</>}
			</Table.Cell>
			<Table.Cell textAlign='center'>
				{crew.action.charge_phases && <>{formatChargePhases(crew)}</>}
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

	// Adapted from function of same name in crewutils.ts
	function formatChargePhases(crew): string {
		let totalTime = 0;
		let result = [];
		crew.action.charge_phases.forEach(phase => {
			totalTime += phase.charge_time;
			let ps = `After ${totalTime}s `;

			if (crew.action.ability?.type !== '') {
				ps += CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', phase.ability_amount);
			} else {
				ps += `+${phase.bonus_amount - crew.action.bonus_amount} ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}`;
			}

			if (phase.cooldown) {
				ps += ` (+${phase.cooldown - crew.action.cooldown}s Cooldown)`;
			}
			result.push(ps);
		});

		return result.join('; ');
	}
};
