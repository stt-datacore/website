export function getCoolStats(crew: any, simple: boolean): string {
	let stats = [];

	const rankType = rank => {
		return rank.startsWith('V_') ? 'Voyage' : rank.startsWith('G_') ? 'Gauntlet' : 'Base';
	};

	for (let rank in crew.ranks) {
		if (simple) {
			if (rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 40) {
					stats.push(`${rank.substr(2)} #${crew.ranks[rank]}`);
				}
			}
		} else {
			if (rank.startsWith('V_') || rank.startsWith('G_') || rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 9) {
					stats.push(`${rankType(rank)} #${crew.ranks[rank]} ${rank.substr(2).replace('_', ' / ')}`);
				}
			}
		}
	}

	if (simple) {
		stats.push(`Voyages #${crew.ranks.voyRank}`);
		return stats.join(' | ');
	} else {
		if (stats.length === 0) {
			return 'More stats...';
		} else {
			return stats.join(', ') + ', more stats...';
		}
	}
}

export function simplejson2csv(data, fields) {
    const escape = (val) => '"' + String(val).replace(/"/g, '""') + '"';

    let csv = fields.map(f => escape(f.label)).join(',');
    for(let row of data) {
        let rowData = [];
        for(let field of fields) {
            rowData.push(escape(field.value(row)));
        }

        csv += '\r\n' + rowData.join(',');
    }

    return csv;
}