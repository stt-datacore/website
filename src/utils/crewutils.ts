import { simplejson2csv } from './misc';

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
	];

	return simplejson2csv(crew, fields);
}
