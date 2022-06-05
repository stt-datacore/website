// Voyage calculation inspired by TemporalAgent7 and IAmPicard before that
//  https://github.com/stt-datacore/website
//  https://github.com/iamtosk/StarTrekTimelinesSpreadsheet

const forDataCore = (input, output, chewable) => {
	const SKILLS = [
		'command_skill',
		'science_skill',
		'security_skill',
		'engineering_skill',
		'diplomacy_skill',
		'medicine_skill'
	];

	// Config is for showing progress (optional)
	const config = {
		progressCallback: false,
		debugCallback: false//(message) => console.log(message)
	};

	// Voyage data is required
	const voyage = {
		skills: input.voyage_description.skills,
		crew_slots: input.voyage_description.crew_slots,
		ship_trait: input.voyage_description.ship_trait
	};

	// DataCore has already filtered roster by this point
	const filter = false;

	// Options modify the calculation algorithm (optional)
	const options = {
		estimatorPriority: input.estimatorPriority ?? 'estimate',
		luckFactor: input.luckFactor ?? false,
		favorSpecialists: input.favorSpecialists ?? false
	};

	const datacoreEstimator = (lineup) => {
		let ps, ss, others = [];
		for (let iSkill = 0; iSkill < SKILLS.length; iSkill++) {
			let aggregate = lineup.skills[SKILLS[iSkill]];
			if (SKILLS[iSkill] == voyage.skills.primary_skill)
				ps = aggregate;
			else if (SKILLS[iSkill] == voyage.skills.secondary_skill)
				ss = aggregate;
			else
				others.push(aggregate);
		}
		const config = {
			ps, ss, others,
			'startAm': input.bestShip.score + lineup.antimatter,
			'prof': lineup.proficiency,
			noExtends: false // Set to true to show estimate with no refills
		};
		return new Promise((resolve, reject) => {
			const estimate = chewable(config, () => false);
			// Add antimatter prop here to allow for post-sorting by AM
			estimate.antimatter = input.bestShip.score + lineup.antimatter;
			resolve({ estimate, 'key': lineup.key });
		});
	};

	// Assemble a few lineups that match input
	const voyagers = new Voyagers(input.roster, config);
	voyagers.assemble(voyage, filter, options)
		.then((lineups) => {
			// Now estimate all the lineups within the threshold
			const estimator = new VoyagersEstimates(voyage, input.bestShip.score, lineups, config);
			estimator.estimate(datacoreEstimator, options.estimatorPriority)
				.then((estimates) => {
					// Finally pass all lineups and estimates back to DataCore and figure out which is "best" there
					const result = { lineups, estimates };
					output(JSON.parse(JSON.stringify(result)), false);
				});
		})
		.catch((error) => {
			throw(error);
		});
};

// Generate lots of unique lineups of potential voyagers
class Voyagers {
	constructor(crew, config = {}) {
		this.crew = crew;	// Required: { name, traits, skills }
		this.config = config;
	}

	sendProgress(message) {
		if (this.config.debugCallback)
			this.config.debugCallback(message);
		if (this.config.progressCallback)
			this.config.progressCallback(message);
	}

	// Prime roster by primary_ and secondary_skills
	// Determine primeFactor from your best voyage lineup without boosts
	// Do 5 vectors scaling primeFactor by a range of deltas:
	//	Do X attempts:
	//		Get scores of primed roster, adjusted by boosts
	//		Do 12 slots:
	//			Assign crew with best score to lineup
	//		Adjust boosts to balance lineup
	// Return all unique lineups
	assemble(voyage, filter = false, options = {}) {
		this.uniques = [];

		this.sendProgress("Studying crew...");
		let primedRoster = this.getPrimedRoster(voyage, filter, options);
		this.sendProgress("Considering "+primedRoster.length+" crew for this voyage...");

		let self = this;
		return new Promise((resolve, reject) => {
			let boosts = { 'primary': 1, 'secondary': 1, 'other': 1 };
			const control = self.getBoostedLineup(primedRoster, boosts);
			const controlFactor = self.getPrimeFactor(control.score);

			const deltas = [0, 0.05, -0.05, 0.1, -0.1, 0.25, -0.25];
			const promises = deltas.map((delta, index) => {
				let primeFactor = controlFactor+delta;
				if (options.customBoosts) {
					boosts = options.customBoosts;
				}
				else {
					boosts = {
						'primary': control.score/10*primeFactor/control.skills[voyage.skills.primary_skill].voyage,
						'secondary': control.score/10*primeFactor/control.skills[voyage.skills.secondary_skill].voyage,
						'other': 1
					};
				}
				return self.doVector(index+1, voyage, primedRoster, boosts, primeFactor);
			});
			Promise.all(promises).then((vectorIds) => {
				self.sendProgress(self.uniques.length + " potential lineups assembled!");
				let lineups = self.uniques.map((unique) => {
					let lineup = unique.lineup;
					lineup.vectors = unique.vectors;
					return lineup;
				});
				resolve(lineups);
			})
			.catch((error) => {
				reject(error);
			});
		});
	}

	getPrimedRoster(voyage, filter, options) {
		const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
							'engineering_skill', 'science_skill', 'medicine_skill'];

		let skills = voyage.skills;
		let traits = [];
		for (let i = 0; i < voyage.crew_slots.length; i++) {
			traits.push(voyage.crew_slots[i].trait);
		}

		let iLuckFactor = options.luckFactor ? 0 : 1;

		let primedRoster = [];
		for (let i = 0; i < this.crew.length; i++) {
			// Don't consider crew that match user filters
			if (filter && filter(this.crew[i]))
				continue;

			let dPrimaryScore = 0, dSecondaryScore = 0, dOtherScore = 0;
			let rViableSkills = [0, 0, 0, 0, 0, 0];
			let rViableSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			let rTraitSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			let crewId = this.crew[i].id ? this.crew[i].id : i;
			let crewSkills = this.crew[i].skills ? JSON.parse(JSON.stringify(this.crew[i].skills)) : {};

			let bGeneralist = true;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				let skillId = SKILL_IDS[iSkill];
				if (!crewSkills[skillId]) continue;
				rViableSkills[iSkill] = 1;
				rViableSlots[iSkill*2] = 1;
				rViableSlots[(iSkill*2)+1] = 1;
				let dProficiency = crewSkills[skillId].range_min +
									(crewSkills[skillId].range_max-crewSkills[skillId].range_min)/2;
				let dSkillScore = crewSkills[skillId].core+iLuckFactor*dProficiency;
				if (skillId == skills.primary_skill)
					dPrimaryScore = dSkillScore;
				else if (skillId == skills.secondary_skill)
					dSecondaryScore = dSkillScore;
				else
					dOtherScore += dSkillScore;
				if (this.crew[i].traits.indexOf(traits[iSkill*2]) >= 0)
					rTraitSlots[iSkill*2] = 1;
				if (this.crew[i].traits.indexOf(traits[(iSkill*2)+1]) >= 0)
					rTraitSlots[(iSkill*2)+1] = 1;
				if (skillId == "engineering_skill" || skillId == "science_skill" || skillId == "medicine_skill")
					bGeneralist = false;
			}
			if (options.favorSpecialists && bGeneralist)
				dOtherScore -= dOtherScore/10;

			let crewman = {
				'id': crewId,
				'name': this.crew[i].name,
				'skills': crewSkills,
				'primary_score': dPrimaryScore,
				'secondary_score': dSecondaryScore,
				'other_score': dOtherScore,
				'viable_slots': rViableSlots,
				'trait_slots': rTraitSlots
			};
			primedRoster.push(crewman);
		}
		return primedRoster;
	}

	// These base target values were determined from simulations using Joshurtree's revised Chewable
	getPrimeFactor(totalScore) {
		let baseTarget = totalScore/10;
		let primeFactor = 3.5;
		if (baseTarget >= 9100)
			primeFactor = 2.0;
		else if (baseTarget >= 6200)
			primeFactor = 2.25;
		else if (baseTarget >= 4100)
			primeFactor = 2.5;
		else if (baseTarget >= 3200)
			primeFactor = 2.75;
		else if (baseTarget >= 2500)
			primeFactor = 3;
		else if (baseTarget >= 2000)
			primeFactor = 3.25;
		return primeFactor;
	}

	doVector(vectorId, voyage, primedRoster, boosts, primeFactor) {
		// Number of attempts and desired lineups should scale to roster size
		const minAttempts = 10;
		const maxAttempts = Math.max(Math.floor(primedRoster.length/4), minAttempts); // 25% of roster length
		const minUniques = Math.max(Math.floor(maxAttempts/4), 5); // 25% of maxAttempts

		let self = this;
		let debug = this.config.debugCallback;
		return new Promise((resolveVector, rejectVector) => {
			let doneWithVector = false;
			let sequence = Promise.resolve();
			let iAttempts = 0, iUniques = 0;
			for (let i = 0; i < maxAttempts; i++) {
				sequence = sequence.then(() => {
					if (doneWithVector) return;
					return new Promise((resolveLineup, rejectLineup) => {
						setTimeout(() => {
							iAttempts++;
							let lineup = self.getBoostedLineup(primedRoster, boosts);
							if (lineup)
								resolveLineup(lineup);
							else
								rejectLineup("You don't have enough crew for this voyage!");

							// Stop looking for lineups if vector has generated enough uniques or reached max attempts
							if ((iAttempts >= minAttempts && iUniques >= minUniques) || iAttempts == maxAttempts) {
								resolveVector(vectorId);
								doneWithVector = true;
							}
						}, 0);
					});
				})
				.then((lineup) => {
					if (doneWithVector) return;

					let baseTarget = lineup.score/10;
					let primeTarget = baseTarget*primeFactor;

					// Deltas compare actual primeFactors to expected primeFactor
					let deltas = {
						'primary': (lineup.skills[voyage.skills.primary_skill].voyage-primeTarget)/baseTarget,
						'secondary': (lineup.skills[voyage.skills.secondary_skill].voyage-primeTarget)/baseTarget
					};
					// Other delta is primaryDelta+secondaryDelta*-1

					let vector = {
						'id': vectorId,
						'attempt': iAttempts,
						'boosts': boosts,
						'primeFactor': primeFactor,
						'deltas': deltas
					};

					// Only track unique lineups, but also track all vectors that generate them
					let existing = self.uniques.find((unique) => unique.uniqueId == lineup.key);
					if (existing) {
						existing.vectors.push(vector);
						// Use lineup order with higher AM if available
						if (lineup.antimatter > existing.bestAntimatter) {
							existing.bestAntimatter = lineup.antimatter;
							existing.lineup = lineup;
						}
					}
					else {
						this.sendProgress("Found "+(self.uniques.length+1)+" potential lineups so far...");
						if (debug) {
							let sLineup = "";
							for (let i = 0; i < lineup.crew.length; i++) {
								if (sLineup != "") sLineup += ", ";
								sLineup += lineup.crew[i].name + " (" + lineup.crew[i].score.toFixed(1) + ")";
							}
							debug(
								"===== Vector "+vector.id+"-"+vector.attempt+" =====" +
								"\n* Lineup: "+sLineup +
								"\n* Total Score: "+lineup.score +
								"\n* Skills: "+lineup.skills.command_skill.voyage+", "+lineup.skills.diplomacy_skill.voyage+", " +
									lineup.skills.security_skill.voyage+", "+lineup.skills.engineering_skill.voyage+", " +
									lineup.skills.science_skill.voyage+", "+lineup.skills.medicine_skill.voyage +
								"\n* Boosts: "+boosts.primary.toFixed(2)+"+"+boosts.secondary.toFixed(2)+"+"+boosts.other.toFixed(2) +
								"\n* Prime Factor: "+primeFactor +
								"\n* Deltas: "+deltas.primary.toFixed(2)+", "+deltas.secondary.toFixed(2)
							);
						}
						self.uniques.push({
							'uniqueId': lineup.key,
							'bestAntimatter': lineup.antimatter,
							'vectors': [vector],
							lineup
						});
						iUniques++;
					}

					// Use deltas to reweight boosts for next attempt
					//	Finetune by smaller increments as attempts increase with a min adjust of 0.05
					let finetuneRatio = Math.max(1/iAttempts, 0.05);
					let primaryAdjustment = deltas.primary*finetuneRatio*-1;
					let secondaryAdjustment = deltas.secondary*finetuneRatio*-1;
					// Primary, secondary boost adjustments should be enough that adjustment to other not needed

					const limitBoost = (boost) => {
						if (boost < 0.5) return 0.5;
						if (boost > 3.5) return 3.5;
						return boost;
					};
					boosts = {
						'primary': limitBoost(boosts.primary+primaryAdjustment),
						'secondary': limitBoost(boosts.secondary+secondaryAdjustment),
						'other': boosts.other
					};
				});
			}
			sequence.catch((error) => {
				rejectVector(error);
			});
		});
	}

	// 1 all: open ideal slot
	// 2A ideal:
	//	2A1 canNotDisplace: can current assignee move without displacing an ideal?
	//	2A2 canDisplace: can current assignee move displacing exactly 1 ideal?
	// 2B non-ideal:
	// 	2B1 any open viable slot
	// 	2B2 canNotDisplace: can current assignee move without displacing an ideal?
	// 3 all: skip volunteer
	getBoostedLineup(primedRoster, boosts) {
		function tryToAssign(assignments, seeker, bIdealOnly, bCanDisplace, tested = []) {
			let sDebugPrefix = "";
			for (let i = 0; i < tested.length; i++) {
				sDebugPrefix += "-";
			}
			sDebugPrefix += " ";

			// Identify state of all viable slots
			let open_ideal = [], open_viable = [], occupied_ideal = [], occupied_viable = [];
			for (let i = 0; i < 12; i++) {
				if (!seeker.viable_slots[i]) continue;
				if (assignments[i].id != "") {
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
				let idealsTested = [...tested];
				for (let i = 0; i < occupied_ideal.length; i++) {
					let slot = occupied_ideal[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (idealsTested.indexOf(slot) >= 0) continue;
					idealsTested.push(slot);
					let assignee = assignments[slot];
					assemblyLog += "\n" + sDebugPrefix + seeker.name + " (" + seeker.score + ") would be ideal in slot " + slot  + ". Is " + assignee.name + " (" + assignee.score + ") willing and able to move?";
					if (tryToAssign(assignments, assignee, true, false, idealsTested)) {
						doAssign(assignments, seeker, slot, sDebugPrefix);
						return true;
					}
				}
				// 2A2) Seat in occupied slot only if exactly 1 other is able to move from ideal slot
				idealsTested = [...tested];
				for (let i = 0; i < occupied_ideal.length; i++) {
					let slot = occupied_ideal[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (idealsTested.indexOf(slot) >= 0) continue;
					idealsTested.push(slot);
					let assignee = assignments[slot];
					assemblyLog += "\n" + sDebugPrefix + seeker.name + " (" + seeker.score + ") insists on being in slot " + slot  + ". Is " + assignee.name + " (" + assignee.score + ") able to move?";
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
				let viablesTested = [...tested];
				for (let i = 0; i < occupied_viable.length; i++) {
					let slot = occupied_viable[i];
					// Ignore slots we've already inquired about by this seeker and descendant seekers
					if (viablesTested.indexOf(slot) >= 0) continue;
					viablesTested.push(slot);
					let assignee = assignments[slot];
					if (!seeker.trait_slots[slot] && assignee.trait_slots[slot] && !bCanDisplace)
						continue;
					assemblyLog += "\n" + sDebugPrefix + seeker.name + " (" + seeker.score + ") is inquiring about slot " + slot  + ". Is " + assignee.name + " (" + assignee.score + ") willing and able to move?";
					if (tryToAssign(assignments, assignee, false, false, viablesTested)) {
						doAssign(assignments, seeker, slot, sDebugPrefix);
						return true;
					}
				}
			}

			// 3) Can't seat
			assemblyLog += "\n" + sDebugPrefix + seeker.name + " (" + seeker.score + ") will not take a new assignment";
			return false;
		}

		function doAssign(assignments, seeker, iAssignment, sPrefix = "") {
			let sIdeal = seeker.trait_slots[iAssignment] ? "ideal " : "";
			let sOpen = assignments[iAssignment].id == "" ? "open ": "";
			assemblyLog += "\n" + sPrefix + seeker.name + " (" + seeker.score + ") accepts " + sIdeal + "assignment in " + sOpen + "slot " + iAssignment;
			assignments[iAssignment] = seeker;
			assignments[iAssignment].assignment = iAssignment;
			assignments[iAssignment].isIdeal = seeker.trait_slots[iAssignment];
		}

		let assemblyLog = "";	// Only use for debugging in development

		const trait_boost = 200;

		let boostedScores = [];
		for (let i = 0; i < primedRoster.length; i++) {
			let baseScore = primedRoster[i].primary_score*boosts.primary +
							primedRoster[i].secondary_score*boosts.secondary +
							primedRoster[i].other_score*boosts.other;
			let bestScore = baseScore + trait_boost;
			let baseSlots = [], bestSlots = [];
			for (let j = 0; j < 12; j++) {
				if (!primedRoster[i].viable_slots[j]) continue;
				baseSlots.push(j);
				if (primedRoster[i].trait_slots[j]) bestSlots.push(j);
			}
			if (bestSlots.length > 0)
				boostedScores.push({ score: bestScore, id: primedRoster[i].id, isIdeal: true });
			if (baseSlots.length > bestSlots.length)
				boostedScores.push({ score: baseScore, id: primedRoster[i].id, isIdeal: false });
		}
		boostedScores.sort((a, b) => b.score - a.score);

		let assignments = Array.from({length:12},()=> ({'id': ''}));
		let iAssigned = 0;

		let skipped = [];

		while (boostedScores.length > 0 && iAssigned < 12) {
			let testScore = boostedScores.shift();

			// Volunteer is already assigned, list other matching slots as alts
			let repeat = assignments.find(assignee => assignee.id == testScore.id);
			if (repeat) {
				assemblyLog += "\n~ " + repeat.name + " (" + testScore.score + ") is already assigned to slot " + repeat.assignment + " (" + repeat.score + ") ~";
				continue;
			}

			let volunteer = primedRoster.find(primed => primed.id == testScore.id);
			volunteer.score = testScore.score;

			if (tryToAssign(assignments, volunteer, testScore.isIdeal, testScore.isIdeal)) {
				iAssigned++;
			}
			else {
				let bRepeatSkip = skipped.indexOf(volunteer.id) >= 0;
				skipped.push(volunteer.id);
				if (bRepeatSkip || !testScore.isIdeal)
					assemblyLog += "\n!! Skipping " + volunteer.name + " (" + volunteer.score + ") forever !!";
				else
					assemblyLog += "\n! Skipping " + volunteer.name + " (" + volunteer.score + ") for now !";
			}
		}

		if (iAssigned == 12)
			return new VoyagersLineup(assignments);

		return false;
	}
}

class VoyagersLineup {
	constructor(assignments, assemblyLog = "") {
		const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
							'engineering_skill', 'science_skill', 'medicine_skill'];

		let crew = [];
		let traitsMatched = [];
		let skillScores = {
			command_skill: { skill: 'command_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			diplomacy_skill: { skill: 'diplomacy_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			security_skill: { skill: 'security_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			engineering_skill: { skill: 'engineering_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			science_skill: { skill: 'science_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 },
			medicine_skill: { skill: 'medicine_skill', core: 0, range_min: 0, range_max: 0, voyage: 0 }
		};
		let dTotalScore = 0, dTotalProficiency = 0;
		let iBonusTraits = 0;

		for (let i = 0; i < assignments.length; i++) {
			crew.push({
				'id': assignments[i].id,
				'name': assignments[i].name,
				'score': assignments[i].score
			});
			traitsMatched.push(assignments[i].isIdeal ? 1 : 0);
			if (assignments[i].isIdeal) iBonusTraits++;
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				if (!assignments[i].skills[SKILL_IDS[iSkill]]) continue;
				let skill = assignments[i].skills[SKILL_IDS[iSkill]];
				let dProficiency = skill.range_min+(skill.range_max-skill.range_min)/2;
				let dSkillScore = skill.core+dProficiency;
				skillScores[SKILL_IDS[iSkill]].voyage += dSkillScore;
				skillScores[SKILL_IDS[iSkill]].core += skill.core;
				skillScores[SKILL_IDS[iSkill]].range_min += skill.range_min;
				skillScores[SKILL_IDS[iSkill]].range_max += skill.range_max;
				dTotalScore += dSkillScore;
				dTotalProficiency += dProficiency;
			}
		}

		let lineupKey = "";
		for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
			let dSkillScore = skillScores[SKILL_IDS[iSkill]].voyage;
			lineupKey += Math.floor(dSkillScore)+',';
		}

		this.key = lineupKey;
		this.crew = crew;
		this.traits = traitsMatched;
		this.skills = skillScores;
		this.score = dTotalScore;
		this.proficiency = parseInt(dTotalProficiency/dTotalScore*100);
		this.antimatter = iBonusTraits*25;
		this.log = assemblyLog;
	}
}

// Generate estimates of the best lineups
class VoyagersEstimates {
	constructor(voyage, shipAntimatter, lineups, config = {}) {
		this.voyage = voyage;
		this.shipAntimatter = shipAntimatter;
		this.lineups = lineups;
		this.config = config;
	}

	sendProgress(message) {
		if (this.config.debugCallback)
			this.config.debugCallback(message);
		if (this.config.progressCallback)
			this.config.progressCallback(message);
	}

	estimate(estimator, priority = 'estimate') {
		let self = this;
		return new Promise((resolve, reject) => {
			self.lineups.forEach(lineup => {
				lineup.vector = self.getBestVector(lineup);
				lineup.projection = self.getProjection(lineup);
				lineup.weights = self.getWeights(lineup);
			});

			// Lineups with below average tick counts are 99% useless
			const avgTicks = self.lineups.reduce((prev, curr) => prev + curr.projection.ticks, 0)/self.lineups.length;
			let considered = self.lineups.filter(lineup => lineup.projection.ticks > avgTicks);
			self.sendProgress('Narrowing by average tick count ('+avgTicks.toFixed(2)+')...');

			let minimumCount = priority === 'speed' ? 1 : 5;

			if (priority !== 'thorough' && considered.length > minimumCount) {
				const queued = [];

				// Always estimate the lineups with best tick counts, regardless of priority
				considered.sort((a, b) => b.projection.ticks - a.projection.ticks);
				for (let i = 0; i < minimumCount; i++) {
					queued.push(considered[i].key);
				}

				if (priority === 'guaranteed' || priority === 'speed') {
					considered.sort((a, b) => b.weights.total - a.weights.total);
					for (let i = 0; i < minimumCount; i++) {
						if (!queued.includes(considered[i].key))
							queued.push(considered[i].key);
					}
				}
				else if (priority === 'moonshot' || priority === 'speed') {
					considered.sort((a, b) => b.weights.primes - a.weights.primes);
					for (let i = 0; i < minimumCount; i++) {
						if (!queued.includes(considered[i].key))
							queued.push(considered[i].key);
					}
				}

				if (queued.length > 0)
					considered = considered.filter(lineup => queued.includes(lineup.key));
			}

			self.sendProgress('Estimating '+considered.length+' lineups...');
			const promises = considered.map((lineup) =>
				estimator(lineup)
			);
			Promise.all(promises).then((estimates) => {
				resolve(estimates);
				self.sendProgress('Done estimating!');
				self._logEstimates(estimates);
			})
			.catch((error) => {
				reject(error);
			});
		});
	}

	getBestVector(lineup) {
		const baseTarget = lineup.score/10;
		const primaryScore = lineup.skills[this.voyage.skills.primary_skill].voyage;
		const secondaryScore = lineup.skills[this.voyage.skills.secondary_skill].voyage;

		let bestVector, bestProximity;
		lineup.vectors.forEach((vector) => {
			const primeTarget = baseTarget*vector.primeFactor;
			// Proximity is how close an actual lineup is to its prime targets (lower is better)
			const proximity = Math.abs(primaryScore+secondaryScore-(primeTarget*2));
			if (!bestProximity || proximity < bestProximity) {
				bestProximity = proximity;
				bestVector = {...vector, proximity};
			}
		});

		return bestVector;
	}

	getProjection(lineup) {
		const failpoints = Object.keys(lineup.skills).map(skill => {
			const time = ((0.0449*lineup.skills[skill].voyage)+34.399)*60;	// In seconds
			return {
				skill, time
			};
		}).sort((a, b) => a.time - b.time);

		let ticks = 0, amBalance = this.shipAntimatter + lineup.antimatter;
		let prevTickTime = 0, prevHazardTime = 0;
		let prevHazardSuccessRate = 1, prevFailPointSkillChance = 0;

		while (amBalance > 0 && failpoints.length > 0) {
			const failpoint = failpoints.shift();

			// 1 tick every 20 seconds
			const finalTickTime = failpoint.time - (failpoint.time % 20);
			const tickDiff = finalTickTime - prevTickTime;
			const interimTicks = tickDiff / 20;
			const amLossTicks = -1 * interimTicks;

			// 1 hazard every 80 seconds
			const finalHazardTime = failpoint.time - (failpoint.time % 80);
			const hazardDiff = finalHazardTime - prevHazardTime;
			const interimHazards = hazardDiff / 80;
			const hazardSuccessRate = prevHazardSuccessRate - prevFailPointSkillChance;
			const hazardFailureRate = 1 - hazardSuccessRate;
			const amGainHazards = interimHazards * hazardSuccessRate * 5;
			const amLossHazards = interimHazards * hazardFailureRate * -30;

			if (amBalance + amLossTicks + amGainHazards + amLossHazards < 0) {
				let testBalance = amBalance;
				let testTicks = ticks;
				let testTime = prevTickTime;
				while (testBalance > 0) {
					testTicks++;
					testTime += 20;
					testBalance--;
					if (testTime % 80 === 0) {
						testBalance += hazardSuccessRate * 5;
						testBalance += hazardFailureRate * -30;
					}
				}
				ticks = testTicks;
				amBalance = testBalance;
			}
			else {
				ticks += interimTicks;
				amBalance += amLossTicks + amGainHazards + amLossHazards;
			}

			prevTickTime = finalTickTime;
			prevHazardTime = finalHazardTime;
			prevHazardSuccessRate = hazardSuccessRate;
			if (failpoint.skill === this.voyage.skills.primary_skill)
				prevFailPointSkillChance = 0.35;
			else if (failpoint.skill === this.voyage.skills.secondary_skill)
				prevFailPointSkillChance = 0.25;
			else
				prevFailPointSkillChance = 0.1;
		}

		return {
			ticks, amBalance
		};
	}

	getWeights(lineup) {
		const weighScores = array => {
			const n = array.length;
			const mean = array.reduce((a, b) => a + b) / n;
			const stdev = Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
			return mean - stdev;
		};
		const primeScores = [], otherScores = [];
		Object.keys(lineup.skills).forEach(skill => {
			if (skill === this.voyage.skills.primary_skill || skill === this.voyage.skills.secondary_skill)
				primeScores.push(lineup.skills[skill].voyage);
			else
				otherScores.push(lineup.skills[skill].voyage);
		});
		const primes = weighScores(primeScores);
		const others = weighScores(otherScores);
		const total = primes + others;
		return {
			primes, others, total
		};
	}

	_logEstimates(estimates) {
		if (!this.config.debugCallback) return;
		const fields = [
			'id', 'estimate', 'safer', 'moonshot',
			'score', 'proficiency', 'antimatter',
			'primary', 'secondary',
			'prime factor', 'proximity', 'vectors',
			'ticks', 'amBalance'
		];
		let log = "===== Estimates =====";
		let csv = fields.join("\t");
		estimates.forEach(estimate => {
			const lineup = this.lineups.find(l => l.key == estimate.key);
			log += "\n* "+lineup.vector.id+"-"+lineup.vector.attempt+": " +
				estimate.estimate.refills[0].result.toFixed(3) +
				" "+lineup.vector.proximity.toFixed(3);
			const values = [
				lineup.vector.id+"-"+lineup.vector.attempt,
				estimate.estimate.refills[0].result.toFixed(3),
				estimate.estimate.refills[0].saferResult.toFixed(3),
				estimate.estimate.refills[0].moonshotResult.toFixed(3),
				lineup.score,
				lineup.proficiency,
				lineup.antimatter,
				lineup.skills[this.voyage.skills.primary_skill].voyage,
				lineup.skills[this.voyage.skills.secondary_skill].voyage,
				lineup.vector.primeFactor,
				lineup.vector.proximity.toFixed(3),
				lineup.vectors.length,
				lineup.projection.ticks,
				lineup.projection.amBalance
			];
			csv += "\n"+values.join("\t");
		});
		this.config.debugCallback(log);
		this.config.debugCallback(csv);
	}
}

module.exports.forDataCore = forDataCore;
