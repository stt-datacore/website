import { simplejson2csv } from './misc';

import CONFIG from '../components/CONFIG';

function formatChargePhases(crew): string {
	let totalTime = 0;
	let result = [];
	crew.action.charge_phases.forEach(phase => {
		totalTime += phase.charge_time;
		let ps = `After ${totalTime}s `;

		if (crew.action.ability) {
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

export function exportCrew(crew): string {
	let fields = [
		{
			label: 'Name',
			value: (row: any) => row.name
		},
		{
			label: 'Have',
			value: (row: any) => row.have
		},
		{
			label: 'Short name',
			value: (row: any) => row.short_name
		},
		{
			label: 'Max rarity',
			value: (row: any) => row.max_rarity
		},
		{
			label: 'Rarity',
			value: (row: any) => row.rarity
		},
		{
			label: 'Level',
			value: (row: any) => row.level
        },
        {
			label: 'Immortal',
			value: (row: any) => row.immortal
		},
		{
			label: 'Equipment',
			value: (row: any) => row.equipment.join(' ')
		},
		{
			label: 'Tier',
			value: (row: any) => row.tier
		},
		{
			label: 'In portal',
			value: (row: any) => (row.in_portal === undefined) ? 'N/A' : row.in_portal
		},
		{
			label: 'Collections',
			value: (row: any) => row.collections.join(', ')
		},
		{
			label: 'Voyage rank',
			value: (row: any) => row.voyRank
		},
		{
			label: 'Gauntlet rank',
			value: (row: any) => row.gauntletRank
		},
		{
			label: 'Command core',
			value: (row: any) => row.command_skill.core
		},
		{
			label: 'Command min',
			value: (row: any) => row.command_skill.min
		},
		{
			label: 'Command max',
			value: (row: any) => row.command_skill.max
		},
		{
			label: 'Diplomacy core',
			value: (row: any) => row.diplomacy_skill.core
		},
		{
			label: 'Diplomacy min',
			value: (row: any) => row.diplomacy_skill.min
		},
		{
			label: 'Diplomacy max',
			value: (row: any) => row.diplomacy_skill.max
		},
		{
			label: 'Engineering core',
			value: (row: any) => row.engineering_skill.core
		},
		{
			label: 'Engineering min',
			value: (row: any) => row.engineering_skill.min
		},
		{
			label: 'Engineering max',
			value: (row: any) => row.engineering_skill.max
		},
		{
			label: 'Medicine core',
			value: (row: any) => row.medicine_skill.core
		},
		{
			label: 'Medicine min',
			value: (row: any) => row.medicine_skill.min
		},
		{
			label: 'Medicine max',
			value: (row: any) => row.medicine_skill.max
		},
		{
			label: 'Science core',
			value: (row: any) => row.science_skill.core
		},
		{
			label: 'Science min',
			value: (row: any) => row.science_skill.min
		},
		{
			label: 'Science max',
			value: (row: any) => row.science_skill.max
		},
		{
			label: 'Security core',
			value: (row: any) => row.security_skill.core
		},
		{
			label: 'Security min',
			value: (row: any) => row.security_skill.min
		},
		{
			label: 'Security max',
			value: (row: any) => row.security_skill.max
        },
        {
			label: 'Traits',
			value: (row: any) => row.traits_named.concat(row.traits_hidden)
		},
		{
			label: 'Action name',
			value: (row: any) => row.action.name
		},
		{
			label: 'Boosts',
			value: (row: any) => CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.bonus_type]
		},
		{
			label: 'Amount',
			value: (row: any) => row.action.bonus_amount
		},
		{
			label: 'Initialize',
			value: (row: any) => row.action.initial_cooldown
		},
		{
			label: 'Duration',
			value: (row: any) => row.action.duration
		},
		{
			label: 'Cooldown',
			value: (row: any) => row.action.cooldown
		},
		{
			label: 'Bonus Ability',
			value: (row: any) => row.action.ability ? CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[row.action.ability.type].replace('%VAL%', row.action.ability.amount) : ''
		},
		{
			label: 'Trigger',
			value: (row: any) => row.action.ability ? CONFIG.CREW_SHIP_BATTLE_TRIGGER[row.action.ability.condition] : ''
		},
		{
			label: 'Uses per Battle',
			value: (row: any) => row.action.limit || ''
		},
		{
			label: 'Handicap Type',
			value: (row: any) => row.action.penalty ? CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.penalty.type] : ''
		},
		{
			label: 'Handicap Amount',
			value: (row: any) => row.action.penalty ? row.action.penalty.amount : ''
		},
		{
			label: 'Accuracy',
			value: (row: any) => row.ship_battle.accuracy || ''
		},
		{
			label: 'Crit Bonus',
			value: (row: any) => row.ship_battle.crit_bonus || ''
		},
		{
			label: 'Crit Rating',
			value: (row: any) => row.ship_battle.crit_chance || ''
		},
		{
			label: 'Evasion',
			value: (row: any) => row.ship_battle.evasion || ''
		},
		{
			label: 'Charge Phases',
			value: (row: any) => row.action.charge_phases ? formatChargePhases(row) : ''
		},
	];

	return simplejson2csv(crew, fields);
}
