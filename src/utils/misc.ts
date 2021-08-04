export function getCoolStats(crew: any, simple: boolean, showMore: boolean = true, roster = false): string {
	let stats = [];

	const rankType = rank => {
		let retVal = rank.startsWith('V_') ? 'Voyage' : rank.startsWith('G_') ? 'Gauntlet' : 'Base';
		retVal += roster ? ' in roster' : '';
		return retVal;
	};
	const skillName = short => CONFIG.SKILLS[CONFIG.SKILLS_SHORT.find(c => c.short === short).name];
	const rankHandler = rank => roster
		? roster.filter(c => c.ranks[rank] && crew.ranks[rank] < c.ranks[rank]).length + 1
		: crew.ranks[rank];
	const tripletHandler = (rank) => roster
		? roster.filter(c => c.ranks['rank'] &&
												 c.ranks[rank].name == crew.ranks[rank].name &&
												 crew.ranks[rank].rank < c.ranks[rank].rank).length + 1
		: crew.ranks[rank].rank;


	for (let rank in crew.ranks) {
		if (simple) {
			if (rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 40) {
					stats.push(`${rank.substr(2)} #${crew.ranks[rank]}`);
				}
			}
		} else {
			if (rank.startsWith('V_') || rank.startsWith('G_') || rank.startsWith('B_')) {
				if (crew.ranks[rank] && rankHandler(rank) <= 9) {
					stats.push(`${rankType(rank)} #${rankHandler(rank)} ${rank.substr(2).replace('_', ' / ')}`);
				}
			}
			if (rank === 'voyTriplet') {
				if (crew.ranks[rank] && tripletHandler(rank) <= 9) {
					stats.push(`Voyage #${tripletHandler(rank)} ${crew.ranks[rank].name}`);
				}
			}
		}
	}

	if (simple) {
		stats.push(`Voyages #${crew.ranks.voyRank}`);
		return stats.join(' | ');
	} else {
		if (stats.length === 0) {
			return showMore ? 'More stats...': '';
		} else {
			return stats.join(', ') + (showMore ? ', more stats...' : '');
		}
	}
}

export interface ExportField {
	label: string;
	value: (row: any) => any;
}

export function simplejson2csv(data: any[], fields: ExportField[]) {
	const escape = val => '"' + String(val).replace(/"/g, '""') + '"';

	let csv = fields.map(f => escape(f.label)).join(',');
	for (let row of data) {
		let rowData = [];
		for (let field of fields) {
			try {
				rowData.push(escape(field.value(row)));
			} catch (er) {
				console.error(er);
				console.log(row);
			}
		}

		csv += '\r\n' + rowData.join(',');
	}

	return csv;
}
