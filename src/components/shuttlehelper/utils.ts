import { ShuttleSeat } from './model';

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
