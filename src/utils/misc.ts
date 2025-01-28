import CONFIG from '../components/CONFIG';
import { CrewMember } from '../model/crew';
import { AvatarIcon } from '../model/game-elements';
import { PlayerCrew, TranslateMethod } from '../model/player';
import { shortToSkill, skillToShort } from './crewutils';

export type RankMode = "voyages" | "duration" | "voydur" | "maxdur" | "voymaxdur";

export interface DropDownItem {
	key: string;
	value: string;
	image: AvatarIcon;
	text: string;
	title?: string;
	content?: JSX.Element;
}

export function translateSkills(string: string, separator: string = '/'): string {
	let skills = string.split(separator);
	let output: string[] = [];
	for (let skill of skills) {
		let a = shortToSkill(skill, true);
		if (a) {
			let b = skillToShort(a);
			if (b) {
				output.push(b);
			}
		}
	}
	return output.join(separator);
}

export function getCoolStats(t: TranslateMethod, crew: PlayerCrew | CrewMember, simple: boolean, showMore: boolean = true, bThreshold = 40, gThreshold = 9, vThreshold = 9): string {
	let stats = [] as string[];

	const rankType = rank => {
		return rank.startsWith('V_') ? t('base.voyage') : rank.startsWith('G_') ? t('base.gauntlet') : t('global.base');
	};

	for (let rank in crew.ranks) {
		if (simple) {
			if (rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= bThreshold) {
					stats.push(`${translateSkills(rank.slice(2))} #${crew.ranks[rank]}`);
				}
			}
		} else {
			if (rank.startsWith('V_') || rank.startsWith('G_') || rank.startsWith('B_')) {
				if (crew.ranks[rank] && crew.ranks[rank] <= gThreshold) {
					stats.push(`${rankType(rank)} #${crew.ranks[rank]} ${translateSkills(rank.slice(2).replace('_', ' / '), " / ")}`);
				}
			}
			if (rank === 'voyTriplet') {
				if (crew.ranks[rank] && (crew.ranks.voyTriplet?.rank ?? 0) <= vThreshold)
					stats.push(`${t('base.voyage')} #${crew.ranks.voyTriplet?.rank} ${crew.ranks.voyTriplet?.name ? translateSkills(crew.ranks.voyTriplet?.name, ' / ') : ''}`);
			}
		}
	}

	if (simple) {
		stats.push(`${t('base.voyages')} #${crew.ranks.voyRank}`);
		return stats.join(' | ');
	} else {
		if (stats.length === 0) {
			return showMore ? t('cool_stats.show_detailed_ellipses') : '';
		} else {
			return stats.join(', ') + (showMore ? `, ${t('cool_stats.more_stats_ellipses')}` : '');
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


/**
 * Creates a formatted title (appelation) from the given text.
 * @param text The text to convert into a title
 * @returns
 */
export function appelate(text: string) {
	let curr: string = "";
	let cpos = 0;

	const match = new RegExp(/[A-Za-z0-9']/);

	for (let ch of text) {
		if (match.test(ch)) {
			if (cpos++ === 0) {
				curr += ch.toUpperCase();
			}
			else {
				curr += ch.toLowerCase();
			}
		}
		else {
			cpos = 0;
			curr += ch == '_' ? " " : ch;
		}
	}

	return curr;
}

export const getImageName = (reward) => {
	let img = reward.icon?.file.replace(/\//g, '_');
	if (img.slice(0, 1) === '_') img = img.slice(1); else img = '/atlas/' + img;
	if (img.slice(-4) !== '.png') img += '.png';
	return img;
};



/** Check if the device, itself, (not the resolution) is a mobile device */
export const mobileCheck = function () {
	if (typeof navigator === 'undefined' || typeof navigator.userAgent === 'undefined') return false;
	let check = false;
	(function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || window["opera"]);
	return check || iOS();
};

export function iOS() {
	if (typeof navigator === 'undefined' || typeof navigator.userAgent === 'undefined') return false;
	return [
		'iPad Simulator',
		'iPhone Simulator',
		'iPod Simulator',
		'iPad',
		'iPhone',
		'iPod'
	].includes(navigator.platform)
		// iPad on iOS 13 detection
		|| (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}


export function makeAllCombos<T>(source: T[], maxResults?: number, current?: T[][], index?: number, maxArrLen?: number): T[][] {
	current ??= [];
	index ??= 0;
	maxResults ??= 5000;

	let i = 0;
	let c = current.length;
	let newc = [...current];

	newc.push([source[index]]);

	for (i = 0; i < c; i++) {
		if (maxArrLen && current[i].length + 1 > maxArrLen) continue;
		newc.push([...current[i], source[index]]);
	}

	current = newc;
	if (Number.isFinite(maxResults) && current.length >= maxResults) return current;

	if (index < source.length - 1) {
		current = makeAllCombos(source, maxResults, current, index + 1, maxArrLen);
	}

	return current;
}

export function arrayIntersect<T>(arr1: T[], arr2: T[]): T[] {
	let newarr = [] as T[];
	for (let elem of arr2) {
		if (!newarr.includes(elem)) {
			newarr.push(elem);
		}
	}
	for (let elem of arr1) {
		if (!newarr.includes(elem)) {
			newarr.push(elem);
		}
	}

	return newarr.filter(a => arr1.includes(a) && arr2.includes(a));
}


export function arrayUnion<T>(arr1: T[], arr2: T[]): T[] {
	let newarr = [...arr1];
	for (let elem of arr2) {
		if (!newarr.includes(elem)) {
			newarr.push(elem);
		}
	}
	return newarr;
}

export function arraysUnion<T>(arr: T[][]) {
	let newarr = [...arr[0]];

	let c = arr.length;
	for (let i = 1; i < c; i++) {
		newarr = arrayUnion(newarr, arr[i]);
	}

	return newarr;
}

export function printShortDistance(d?: Date, n?: number, nothousand?: boolean) {
    let now = new Date();

	if (d) {
		n ??= d.getTime() - now.getTime();
	}
    if (!n) return "";
    let days = n / (24 * 60 * 60 * (nothousand ? 1 : 1000));
    let hours = days;

    days = Math.floor(days);

    hours = hours - days;
    hours *= 24;

    if (days) {
        hours = Math.floor(hours);
        return `${days} d ${hours} h`;
    }
    else {
        let min = (hours - Math.floor(hours)) * 60;
        hours = Math.floor(hours);
        min = Math.floor(min);

        if (hours >= 1) {
            return `${hours} h ${min} m`;
        }
        else {
            return `${min} m`;
        }
    }

}


export function printLastActive(n: number) {

    let days = n / (24 * 60 * 60 * 1000);
    let hours = days;

    days = Math.floor(days);

    hours = hours - days;
    hours *= 24;

    if (days) {
        hours = Math.floor(hours);
        return `${days} d ${hours} h`;
    }
    else {
        let min = (hours - Math.floor(hours)) * 60;
        hours = Math.floor(hours);
        min = Math.floor(min);

        if (hours >= 1) {
            return `${hours} h ${min} m`;
        }
        else {
            return `${min} m`;
        }
    }

}

export function formatRunTime(seconds: number, t: TranslateMethod) {
	let hours = 0, minutes = 0, days = 0;
	seconds = Math.floor(seconds * 100) / 100;
	const two = (x: string | number) => {
		x = x.toString()
		if (x.split(".")[0].length === 1) return "0" + x;
		return x;
	}

	if (seconds >= 60) {
		minutes = Math.floor(seconds / 60);
		seconds -= (minutes * 60);
	}
	if (minutes >= 60) {
		hours = Math.floor(minutes / 60);
		minutes -= (hours * 60);
	}
	if (hours >= 24) {
		days = Math.floor(hours / 24);
		hours -= (days * 24);
	}
	if (!days) {
		if (!hours) {
			return `${two(minutes)}:${two(seconds)}`
		}
		return `${two(hours)}:${two(minutes)}:${two(seconds)}`
	}
	return `${two(days)}:${two(hours)}:${two(minutes)}:${two(seconds)}`
}