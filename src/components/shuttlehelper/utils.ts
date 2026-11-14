import { IEventData, IRosterCrew } from '../../components/eventplanner/model';
import CONFIG from '../CONFIG';
import { Shuttle, ShuttleSeat, IShuttleBoost, ISeatAssignment } from './model';

// Skill bonus of shuttle boosts (e.g. command_bonus_3_shuttle_consumable), by rarity
export const SHUTTLE_BOOST_BONUSES: number[] = [50, 100, 150, 250, 450, 700];

export function getShuttleBoostSymbol(boost: IShuttleBoost): string {
	return `${boost.skill.replace('_skill', '')}_bonus_${boost.rarity}_shuttle_consumable`;
}

export function getSkillSetId(seat: ShuttleSeat): string {
	const skillA: string = seat.skillA;
	const skillB: string = seat.skillB;
	let skills: string[] = [skillA, skillB];
	if (skillA === '' || skillA === skillB)
		skills = [skillB];
	else if (skillB === '')
		skills = [skillA];
	return seat.operand+','+skills.sort((a, b)=>a.localeCompare(b));
}

export function getCrewSeatScore(crew: IRosterCrew, seat: ShuttleSeat, eventData?: IEventData, boost?: IShuttleBoost): number {
	const skillOperand = seat.operand;
	const primarySkill = seat.skillA;
	const secondarySkill = seat.skillB;

	let iHigherSkill = 0, iLowerSkill = 0;
	for (const skill in CONFIG.SKILLS) {
		if (skill !== primarySkill && skill !== secondarySkill) continue;

		if (crew[skill].core === 0) continue;

		let iMultiplier = 1;
		if (eventData) {
			if (eventData.featured.indexOf(crew.symbol) >= 0)
				iMultiplier = 3;
			else if (eventData.bonus.indexOf(crew.symbol) >= 0)
				iMultiplier = 2;
		}

		// Shuttle boost adds to seated crew's skill (only if crew has that skill), before event bonuses
		const iBoost = boost?.skill === skill ? SHUTTLE_BOOST_BONUSES[boost.rarity] : 0;
		const iSkillScore = (crew[skill].core + iBoost) * iMultiplier;

		if (iSkillScore > iHigherSkill) {
			iLowerSkill = iHigherSkill;
			iHigherSkill = iSkillScore;
		}
		else if (iSkillScore > iLowerSkill) {
			iLowerSkill = iSkillScore;
		}
	}

	return (skillOperand === 'OR') ?
		iHigherSkill :
		iHigherSkill + (iLowerSkill / 4);
}

export function findSeatedCrew(rosterCrew: IRosterCrew[], seated: ISeatAssignment): IRosterCrew | undefined {
	return rosterCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol)
		?? rosterCrew.find(crew => crew.symbol === seated.assignedSymbol);
}

export function getShuttleChance(shuttle: Shuttle, seatScores: number[], eventData?: IEventData): number {
	// Assume max shuttle difficulty for events (i.e. 2000 challenge rating)
	//	Otherwise use shuttle difficulty imported from player data
	const challengeRating = eventData ? 2000 : shuttle.challenge_rating;
	const dAvgSkill = seatScores.reduce((a, b) => (a + b), 0) / seatScores.length;
	const dChance = 1 / (1 + Math.pow(Math.E, 3.5 * (0.5 - dAvgSkill / challengeRating)));
	return dAvgSkill > 0 ? dChance : 0;
}
