interface CalcChoice {
	slotId: number;
	choice: CrewData;
}

interface CrewData {
	id: number;
	traits: string[];
	skills: { [sk: string]: SkillData; };
}

interface SkillData {
	core: number;
	range_min: number;
	range_max: number;
}

interface VoyageDescriptionDTO {
	crew_slots: {
		skill: string;
		trait: string;
	}[];
	skills: { primary_skill: string; secondary_skill: string; };
}

interface CalcInput {
	vd: VoyageDescriptionDTO;
	roster: CrewData[];
	shipAM: number;
}

interface CalcOutput {
	ids: number[];
	hoursLeft: number;
}

const SKILLS_SHORT: { [index: string]: string } = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

const VoyPADD = {
	start: (options: CalcInput, postResult: (result: CalcOutput, inProgress: boolean) => void) => {
		calculateVoyage(
			options,
			(choices: CalcChoice[], hoursLeft: number) => postResult({ ids: getChoiceIds(choices), hoursLeft }, true),
			(choices: CalcChoice[], hoursLeft: number) => postResult({ ids: getChoiceIds(choices), hoursLeft }, false)
		);
	}
};

function toSkillValues(sels: CalcChoice[], vdesc: VoyageDescriptionDTO) : {[sk:string]:number} {
	let svs : {[sk:string]:number} = {};
	sels.forEach(ch => Object.keys(ch.choice.skills).forEach(sk => {
		if (!svs[sk]) { svs[sk] = 0; }
		svs[sk] += getVoySkill(ch.choice, sk);	// svs[sk] += ch.choice.skills[sk].voy;
	}));
	return svs;
}

function getVoySkill(c: CrewData, sk: string): number {
	if (!c.skills[sk]) return 0;
	return c.skills[sk].core + Math.floor((c.skills[sk].range_min + c.skills[sk].range_max) / 2);
}

function getVoyScore(c: CrewData): number {
	let vs: number = 0;
	Object.keys(c.skills).forEach(sk => {
		vs += getVoySkill(c, sk);
	});
	return vs;
}

function getChoiceIds(choices: CalcChoice[]): number[] {
	return choices.sort((a, b) => a.slotId - b.slotId).map(c => c.choice.id);
}

const LOG_CALCULATE = false;
const ANTIMATTER_FOR_SKILL_MATCH = 25;

// Compute "best" crew for the voyage
// Uses a basic simulated annealing metaheuristic approach:
//   select first unused for each slot (decent good selection)
//   permutate slightly
//   keep better result; keep worse result if it passes a threshhold (to jump to another local maximum)
function calculateVoyage(
	options: CalcInput,
	progressCallback: (choices: CalcChoice[], hoursLeft: number) => void,
	doneCallback: (choices: CalcChoice[], hoursLeft: number) => void) : void
{
	const bestCrew : CrewData[][] = [];
	options.vd.crew_slots.forEach((slot, sid) => {
		let best = bestCrew[sid];
		if (!best) {
			best = [];
			bestCrew[sid] = best;
		}
		options.roster.forEach(c => {
			let vs = getVoySkill(c, slot.skill);	// let vs = c.skills[slot.skill].voy;
			if (vs > 0) {
				best.push(c);
			}
		});
		// Sort by total voy skill (desc)
		best.sort((a,b) => getVoyScore(b) - getVoyScore(a));	// best.sort((a,b) => b.voyage_score - a.voyage_score);
	});

	// Initial configuration
	let current = selectRandom(undefined);
	let next: CalcChoice[] = [];
	let iteration = 0;
	let alpha = 0.999;
	let temperature = 400.0;
	let epsilon = 0.001;
	let currentNrg = nrgToMax(current);
	// Not necessary, but keeps from blowing up indefinitely if the math goes wrong
	const maxIter = 100000;

	let best = current;
	let bestNrg = currentNrg;

	//console.log("Initial energy: " + currentNrg);
	progressCallback(current, currentNrg / 60);

	//while the temperature did not reach epsilon
	while (temperature > epsilon && iteration < maxIter) {
		iteration++;
		// report every 400 iterations
		if (iteration % 400 == 0) {
			// console.log(currentNrg);
			progressCallback(current, currentNrg / 60);
		}

		next = selectRandom(current);
		let nextNrg = nrgToMax(next);
		if (nextNrg == currentNrg) {
			continue;
		}
		if (nextNrg > currentNrg) {
			if (LOG_CALCULATE) {
				console.log("Better energy: " + nextNrg + " > " + currentNrg);
			}
			current = next;
			currentNrg = nextNrg;

			best = current;
			bestNrg = currentNrg;
		}
		else {
			const proba = Math.random();
			//if the new nrg is worse accept
			//it but with a probability level
			//if the probability is less than
			//E to the power -delta/temperature.
			//otherwise the old value is kept
			const delta = nextNrg - currentNrg;
			const threshold = Math.exp(delta / temperature);
			if (proba < threshold) {
				if (LOG_CALCULATE) {
					console.log("Override better energy: " + nextNrg + " < " + currentNrg + " @ " + proba + " " + threshold);
				}
				current = next;
				currentNrg = nextNrg;
			}
		}
		//cooling process on every iteration
		temperature *= alpha;
	}

	if (LOG_CALCULATE) {
		console.log("Best energy: " + currentNrg + " iters:" + iteration);
	}
	doneCallback(best, bestNrg / 60);
	//return current;

	// Energy function for annealing.
	// Voyage estimated running time (in hours)
	function nrgToMax(sels: CalcChoice[]): number {
		const vd = options.vd;
		let am = options.shipAM;
		const svs = toSkillValues(sels, vd);
		sels.forEach((ch, sid) => {
			const t = vd.crew_slots[sid].trait;
			if (ch.choice.traits.includes(t)) {	// if (ch.choice.rawTraits.includes(t)) {
				am += ANTIMATTER_FOR_SKILL_MATCH;
			}
		});
		const dur = estimateVoyageDuration(vd.skills.primary_skill, vd.skills.secondary_skill, svs, 0, am, false);
		return dur;
	}

	function selectRandom(selsCurrent?: CalcChoice[]): CalcChoice[] {
		let sels: CalcChoice[] = [];
		let usedCrew: Set<number> = new Set<number>();

		//TODO: allow user override of crew-slot choices here
		// options.userChoices.forEach(ch => {
		// 	let userChosen = userChoices.find(uc => uc.calc.shuttle.id === calc.shuttle.id)?.chosen ?? [];
		// 	userChosen.forEach(uc => {
		// 		const c = uc.item;
		// 		if (c) {
		// 			let crid = cid(c.crew)
		// 			if (crid) {
		// 				usedCrew.add(crid);
		// 			}
		// 		}
		// 	});
		// });

		// function shuffle(array: any[]) {
		// 	for (let i = array.length - 1; i > 0; i--) {
		// 		const j = Math.floor(Math.random() * (i + 1));
		// 		[array[i], array[j]] = [array[j], array[i]];
		// 	}
		// }
		// let calcs = shuttleCalcs.slice();
		// shuffle(calcs);

		options.vd.crew_slots.forEach((cs, sid) => {
			let choice : CrewData | undefined = undefined;
			//TODO: allow user override of crew-slot choice
			// const userSel = userChoices.find(uc => uc.calc.shuttle.id === calc.shuttle.id);
			// let userChosen = userSel?.chosen ?? [];
			// let userChoice = userChosen.find(uc => uc.slotIndex === si);
			// if (userChoice?.item) {
			// 	choice = userChoice.item;
			// }
			// else
			{
				if (selsCurrent) {
					const bestOpts = bestCrew[sid].filter(c => !usedCrew.has(c.id));
					// Weight the random selection toward the front of the list
					for (let i = 0; i < bestOpts.length; ++i) {
						const r = Math.random();
						// Select if the random value is below the curve in the higher probability range
						const gap = .5; // 50% chance of select starting with first index - others may be better due to total voy still or trait match
						const pass = r < gap;
						if (pass) {
							choice = bestOpts[i];
							break;
						}
						//console.log("skipped option " + i + " " + r + " " + ci + "," + si)
					}
					//console.log("selecting random option " + ci + "," + si)
					// Grab random selection of crew
				}
			}

			// could not find a best select or need to initialize, pull first best option
			if (!choice) {
				choice = bestCrew[sid].filter(c => !usedCrew.has(c.id)).shift();

				if (!choice) {
					// look anywhere for a choice
					choice = options.roster.filter(c => !usedCrew.has(c.id)).shift();
				}

				if (!choice) {
					//TODO: ensure at least 12 crew are provided to calculation
					// failed to find anyone
					throw new Error('Failed finding enough crew in supplied roster');
				}
			}

			usedCrew.add(choice.id);

			let chosen: CalcChoice = {
				slotId: sid,
				choice: choice
			};

			sels.push(chosen);
		});

		return sels;
	}
}

// Estimates voyage duration based on skill value and first failure time
function estimateVoyageDuration(pri: string, sec: string, svs: {[sk:string]:number}, currVoyTimeMinutes: number, amStart: number, log: boolean) : number {
	const iph = 4; // indexes per hazard
	const currVoyTicks = currVoyTimeMinutes * 60 / 20; // conv to seconds and div by tick rate
	//console.log("   voy ticks: " + currVoyTicks);

	let chance: { [sk: string]: number } = {};
	let ffi : { [sk: string] : number } = {};
	let pass: { [sk: string]: number } = {};
	let passAdd: { [sk: string]: number } = {};
	let fail: { [sk: string]: number } = {};
	let failSubtract: { [sk: string]: number } = {};
	let ffiMax = 0;

	//const hazards = narr.narrative.filter(n => n.encounter_type === 'hazard' && n.skill_check?.skill);
	Object.keys(SKILLS_SHORT).forEach(sk => {
		if (log)
			console.log('Skill:' + sk);
		chance[sk] = .1;
		if (sk === pri) {
			chance[sk] = .35;
		}
		else if (sk === sec) {
			chance[sk] = .25;
		}
		if (log)
			console.log('  select chance: ' + chance[sk]);

		let sv = svs[sk];
		if (log)
			console.log('  value: ' + sv);
		if (!sv) {
			return;
		}

		ffi[sk] = sv * .15;
		if (log)
			console.log('  ffi(base): ' + ffi[sk] + ' @' + (ffi[sk] * 20 / 60 / 60));

		// This block is to estimate voyage time remaining, not from the start of a voyage
		if (currVoyTimeMinutes > 0) {
			ffi[sk] -= currVoyTicks;
			if (log)
				console.log('  ffi(remaining): ' + ffi[sk]);
			if (ffi[sk] < 0) {
				ffi[sk] = 0;
			}
		}
		if (log)
			console.log('  ffi: ' + ffi[sk]);

		pass[sk] = ffi[sk] * chance[sk] / iph;
		if (log)
			console.log('  passes: ' + pass[sk]);

		passAdd[sk] = pass[sk] * (5);
		if (log)
			console.log('  pass AM+: ' + passAdd[sk]);

		if (ffi[sk] > ffiMax) {
			ffiMax = ffi[sk];
		}
		//console.log('Skill:' + sk + ' select chance:' + chance[sk] + ' sv:' + sv + ' ffi:' + ffi[sk]);
	});

	Object.keys(SKILLS_SHORT).forEach(sk => {
		fail[sk] = (ffiMax - ffi[sk]) * chance[sk] / iph;
		failSubtract[sk] = fail[sk] * 30;
		if (log) {
			console.log('Skill:' + sk);
			console.log('  fails: ' + fail[sk]);
			console.log('  fail AM-: ' + failSubtract[sk]);
		}
	});

	let amBalance = amStart;
	if (log)
		console.log('AM: ' + amBalance + ' ffiMax:' + ffiMax);

	// subtract 1 AM per tick
	amBalance -= ffiMax;
	if (log)
		console.log('am minus ticks:' + amBalance);
	Object.keys(SKILLS_SHORT).forEach(sk => {
		amBalance += passAdd[sk];
		amBalance -= failSubtract[sk];
		if (log)
			console.log('am:' + amBalance + ' Skill:' + sk);// + ' pass:' + pass[sk] + ' fail:' + fail[sk]+ ' passAdd:' + passAdd[sk] + ' failSubtract:' + failSubtract[sk]);
	});

	if (log)
		console.log('ffiMax: ' + ffiMax + ' amBalance: ' + amBalance + ' am/21: ' + (amBalance/21));
	let fftMins = ffiMax * 20 / 60;

	if (log)
		console.log('fft(min): ' + fftMins + ' fft(hr): ' + (fftMins / 60));
	let vtMins = fftMins + (amBalance / 21) + currVoyTimeMinutes;

	return vtMins;
}

export default VoyPADD;
