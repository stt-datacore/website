import CONFIG from '../components/CONFIG';
import { CrewMember } from '../model/crew';
import { AvatarIcon } from '../model/game-elements';
import { PlayerCrew } from '../model/player';

export interface DropDownItem {
	key: string;
	value: string;
	image: AvatarIcon;
	text: string;
	title?: string;
}

export function getCoolStats(crew: PlayerCrew | CrewMember, simple: boolean, showMore: boolean = true): string {
	let stats = [] as string[];

	const rankType = rank => {
		return rank.startsWith('V_') ? 'Voyage' : rank.startsWith('G_') ? 'Gauntlet' : 'Base';
	};
	
	const skillName = short => {
		let fskill = CONFIG.SKILLS_SHORT.find(c => c.short === short);
		return fskill ? CONFIG.SKILLS[fskill.name] : null;
	} 

	for (let rank in crew.ranks) {
		if (simple) {
			if (rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 40) {
					stats.push(`${rank.slice(2)} #${crew.ranks[rank]}`);
				}
			}
		} else {
			if (rank.startsWith('V_') || rank.startsWith('G_') || rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= 9) {
					stats.push(`${rankType(rank)} #${crew.ranks[rank]} ${rank.slice(2).replace('_', ' / ')}`);
				}
			}
			if (rank === 'voyTriplet') {
				if (crew.ranks[rank] && (crew.ranks.voyTriplet?.rank ?? 0) <= 9)
					stats.push(`Voyage #${crew.ranks.voyTriplet?.rank} ${crew.ranks.voyTriplet?.name}`);
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

export function simplejson2csv<T>(data: T[], fields: ExportField[], delimeter = ',') {
	const escape = (val: string) => '"' + String(val).replace(/"/g, '""') + '"';

	let csv = fields.map(f => escape(f.label)).join(delimeter);
	for (let row of data) {
		let rowData = [] as string[];
		for (let field of fields) {
			try {
				rowData.push(escape(field.value(row)));
			} catch (er) {
				console.error(er);
				console.log(row);
			}
		}

		csv += '\r\n' + rowData.join(delimeter);
	}

	return csv;
}
