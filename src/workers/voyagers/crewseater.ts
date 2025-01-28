import { IPrimedCrew, ISlottableCrew, IVoyagerScore } from './model';
import { VoyagersLineup } from './lineup';

export const seatCrew = (primedCrew: IPrimedCrew[], voyagerScoresMaster: IVoyagerScore[], debug: boolean = false): VoyagersLineup | false => {
	let assemblyLog: string = '';	// Only use for debugging in development

	const assignments: (ISlottableCrew | undefined)[] = Array.from({ length: 12 }, () => undefined);
	let iAssigned: number = 0;

	const skipped: number[] = [];

	const voyagerScores: IVoyagerScore[] = voyagerScoresMaster.slice();
	while (voyagerScores.length > 0 && iAssigned < 12) {
		const testScore: IVoyagerScore | undefined = voyagerScores.shift();
		if (!testScore) continue;

		// Volunteer is already assigned, log other matching slots as alts
		const repeat: ISlottableCrew | undefined = assignments.find(assignee => assignee?.id === testScore.id);
		if (repeat) {
			assemblyLog += `\n~ ${repeat.name} (${testScore.score}) is already assigned to slot ${repeat.slot} (${repeat.score}) ~`;
			continue;
		}

		const testScoreCrew: IPrimedCrew | undefined = primedCrew.find(primed => primed.id === testScore.id);
		if (!testScoreCrew) continue;

		const volunteer: ISlottableCrew = {
			...testScoreCrew,
			score: testScore.score,
			slot: -1,
			isIdeal: false
		};

		if (tryToAssign(assignments, volunteer, testScore.isIdeal, testScore.isIdeal)) {
			iAssigned++;
		}
		else {
			const bRepeatSkip: boolean = skipped.indexOf(volunteer.id) >= 0;
			skipped.push(volunteer.id);
			if (bRepeatSkip || !testScore.isIdeal)
				assemblyLog += `\n!! Skipping ${volunteer.name} (${volunteer.score}) forever !!`;
			else
				assemblyLog += `\n! Skipping ${volunteer.name} (${volunteer.score}) for now !`;
		}
	}

	if (iAssigned === 12)
		return new VoyagersLineup(assignments as ISlottableCrew[], debug ? assemblyLog : '');

	return false;

	// 1 all: open ideal slot
	// 2A ideal:
	//	2A1 canNotDisplace: can current assignee move without displacing an ideal?
	//	2A2 canDisplace: can current assignee move displacing exactly 1 ideal?
	// 2B non-ideal:
	// 	2B1 any open viable slot
	// 	2B2 canNotDisplace: can current assignee move without displacing an ideal?
	// 3 all: skip volunteer
	function tryToAssign(assignments: (ISlottableCrew | undefined)[], seeker: ISlottableCrew, bIdealOnly: boolean, bCanDisplace: boolean, tested: number[] = []): boolean {
		let sDebugPrefix: string = '';
		for (let i = 0; i < tested.length; i++) {
			sDebugPrefix += '-';
		}
		sDebugPrefix += ' ';

		// Identify state of all viable slots
		const open_ideal: number[] = [], open_viable: number[] = [];
		const occupied_ideal: number[] = [], occupied_viable: number[] = [];
		for (let i = 0; i < 12; i++) {
			if (!seeker.viable_slots[i]) continue;
			if (assignments[i]) {
				occupied_viable.push(i);
				if (seeker.trait_slots[i]) occupied_ideal.push(i);
			}
			else {
				open_viable.push(i);
				if (seeker.trait_slots[i]) open_ideal.push(i);
			}
		}

		// 1) Seat in ideal open slot
		if (open_ideal.length > 0) {
			doAssign(assignments, seeker, open_ideal[0], sDebugPrefix);
			return true;
		}

		// 2A)
		if (bIdealOnly) {
			// 2A1) Seat in occupied slot only if everyone moves around willingly
			let idealsTested: number[] = [...tested];
			for (let i = 0; i < occupied_ideal.length; i++) {
				const slot: number = occupied_ideal[i];
				// Ignore slots we've already inquired about by this seeker and descendant seekers
				if (idealsTested.indexOf(slot) >= 0) continue;
				idealsTested.push(slot);
				const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
				assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) would be ideal in slot ${slot}. Is ${assignee.name} (${assignee.score}) willing and able to move?`;
				if (tryToAssign(assignments, assignee, true, false, idealsTested)) {
					doAssign(assignments, seeker, slot, sDebugPrefix);
					return true;
				}
			}
			// 2A2) Seat in occupied slot only if exactly 1 other is able to move from ideal slot
			idealsTested = [...tested];
			for (let i = 0; i < occupied_ideal.length; i++) {
				const slot: number = occupied_ideal[i];
				// Ignore slots we've already inquired about by this seeker and descendant seekers
				if (idealsTested.indexOf(slot) >= 0) continue;
				idealsTested.push(slot);
				const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
				assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) insists on being in slot ${slot}. Is ${assignee.name} (${assignee.score}) able to move?`;
				if (tryToAssign(assignments, assignee, false, true, idealsTested)) {
					doAssign(assignments, seeker, slot, sDebugPrefix);
					return true;
				}
			}
		}

		// 2B)
		if (!bIdealOnly) {
			// 2B1) Seat in open slot
			if (open_viable.length > 0) {
				doAssign(assignments, seeker, open_viable[0], sDebugPrefix);
				return true;
			}

			// 2B2) Seat in occupied slot only if everyone moves around willingly
			const viablesTested: number[] = [...tested];
			for (let i = 0; i < occupied_viable.length; i++) {
				const slot: number = occupied_viable[i];
				// Ignore slots we've already inquired about by this seeker and descendant seekers
				if (viablesTested.indexOf(slot) >= 0) continue;
				viablesTested.push(slot);
				const assignee: ISlottableCrew = assignments[slot] as ISlottableCrew;
				if (!seeker.trait_slots[slot] && assignee.trait_slots[slot] && !bCanDisplace)
					continue;
				assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) is inquiring about slot ${slot}. Is ${assignee.name} (${assignee.score}) willing and able to move?`;
				if (tryToAssign(assignments, assignee, false, false, viablesTested)) {
					doAssign(assignments, seeker, slot, sDebugPrefix);
					return true;
				}
			}
		}

		// 3) Can't seat
		assemblyLog += `\n${sDebugPrefix}${seeker.name} (${seeker.score}) will not take a new assignment`;
		return false;
	}

	function doAssign(assignments: (ISlottableCrew | undefined)[], seeker: ISlottableCrew, slot: number, sPrefix: string = ''): void {
		const sIdeal: string = seeker.trait_slots[slot] ? 'ideal ' : '';
		const sOpen: string = assignments[slot] === undefined ? 'open ': '';
		assemblyLog += `\n${sPrefix}${seeker.name} (${seeker.score}) accepts ${sIdeal}assignment in ${sOpen}slot ${slot}`;
		assignments[slot] = {
			...seeker,
			slot,
			isIdeal: seeker.trait_slots[slot] === 1
		};
	}
};
