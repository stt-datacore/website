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
		debugCallback: false,//(message) => console.log(message)
		noExtends: true,
		noBins: true
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
		estimatorThreshold: input.estimatorThreshold ?? 0,
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
			'prof': lineup.proficiency
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
			const estimator = new VoyagersEstimates(voyage, lineups, config);
			estimator.estimate(datacoreEstimator, options.estimatorThreshold)
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

			const deltas = [0, 0.1, -0.1, 0.25, -0.25];
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
	constructor(voyage, lineups, config = {}) {
		this.voyage = voyage;
		this.lineups = lineups;
		this.config = config;
	}

	sendProgress(message) {
		if (this.config.debugCallback)
			this.config.debugCallback(message);
		if (this.config.progressCallback)
			this.config.progressCallback(message);
	}

	estimate(estimator, proximityThreshold) {
		let self = this;
		return new Promise((resolve, reject) => {
			self.lineups.forEach((lineup) => {
				lineup.vector = self.getBestVector(lineup);
			});
			self.lineups.sort((a, b) => a.vector.proximity - b.vector.proximity);

			let considered;
			if (proximityThreshold > 0) {
				considered = self.lineups.filter((lineup) => lineup.vector.proximity < proximityThreshold);
			}
			// Auto threshold
			else {
				// Lineups with proximity under 1 are considered good initial candidates for estimates;
				//	Lineups above that proximity are 99% useless
				considered = self.lineups.filter((lineup) => lineup.vector.proximity < 1);
				if (considered.length > 0) {
					self.sendProgress(considered.length+' lineups identified as good initial candidates for estimation');
				}
				// If no good candidates, consider all lineups; this will likely be a bad recommendation
				else {
					considered = self.lineups;
					self.sendProgress('No good initial candidates found; this will likely be a bad recommendation');
				}

				// The more lineups attempted, the more confident we can be in aggregates
				//	With more confidence, we can lower the ideal estimate count
				const attempts = considered.reduce((prev, curr) => prev + curr.vectors.length, 0);
				const idealEstimateCount = attempts > 100 ? 3 : 5;

				// Narrow lineups by average proximity
				if (considered.length > idealEstimateCount) {
					const proximityAverage = considered.reduce((prev, curr) => prev + curr.vector.proximity, 0)/considered.length;
					considered = considered.filter((lineup) => lineup.vector.proximity < proximityAverage);
					self.sendProgress('Proximity threshold set to '+proximityAverage.toFixed(2)+'...');

					// Narrow lineups further using combination of proximity and deviation from average score
					if (considered.length > idealEstimateCount) {
						const scores = considered.map((lineup) => lineup.score);
						const scoreAverage = scores.reduce((prev, curr) => prev + curr, 0)/scores.length;
						considered.forEach((lineup) => {
							const proximityRank = considered.filter((l) => l.vector.proximity < lineup.vector.proximity).length+1;
							const deviationRank = considered.filter((l) =>
								Math.abs(scoreAverage-l.score) < Math.abs(scoreAverage-lineup.score)
							).length + 1;
							lineup.rank = proximityRank+deviationRank;
						});
						considered = considered.sort((a, b) => a.rank - b.rank);
						const idealRank = considered[idealEstimateCount-1].rank;
						considered = considered.filter((lineup) => lineup.rank <= idealRank);
						self.sendProgress('Rank threshold set to '+idealRank+'...');
					}
				}
			}

			// If no lineups left after filtering, use the lineup with best proximity
			if (considered.length == 0) considered = [self.lineups[0]];

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

		let bestVector, bestProximity = 100;
		lineup.vectors.forEach((vector) => {
			const primeTarget = baseTarget*vector.primeFactor;
			const otherTarget = (lineup.score-primeTarget-primeTarget)/4;
			const otherAverage = (lineup.score-primaryScore-secondaryScore)/4;
			const deviations = {
				'primary': this.getStandardDeviation([primaryScore, primeTarget]),
				'secondary': this.getStandardDeviation([secondaryScore, primeTarget]),
				'other': this.getStandardDeviation([otherAverage, otherTarget]),
				'prime': this.getStandardDeviation([primaryScore, secondaryScore])
			};
			// Proximity is how close an actual lineup is to its prime targets (lower is better)
			const proximity = (deviations.primary+deviations.secondary+deviations.prime)/baseTarget;
			if (proximity < bestProximity) {
				bestProximity = proximity;
				bestVector = {...vector, deviations, proximity};
			}
		});

		return bestVector;
	}

	getStandardDeviation(array) {
		const n = array.length;
		const mean = array.reduce((a, b) => a + b) / n;
		return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
	}

	_logEstimates(estimates) {
		if (!this.config.debugCallback) return;
		const fields = [
			'id', 'estimate', 'proximity', 'score', 'vector count', 'prime factor',
			'primary score', 'secondary score', 'primary delta', 'secondary delta',
			'primary deviation', 'secondary deviation', 'other deviation', 'prime deviation'
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
				lineup.vector.proximity.toFixed(3),
				lineup.score,
				lineup.vectors.length,
				lineup.vector.primeFactor,
				lineup.skills[this.voyage.skills.primary_skill].voyage,
				lineup.skills[this.voyage.skills.secondary_skill].voyage,
				lineup.vector.deltas.primary.toFixed(3),
				lineup.vector.deltas.secondary.toFixed(3),
				lineup.vector.deviations.primary.toFixed(3),
				lineup.vector.deviations.secondary.toFixed(3),
				lineup.vector.deviations.other.toFixed(3),
				lineup.vector.deviations.prime.toFixed(3)
			];
			csv += "\n"+values.join("\t");
		});
		this.config.debugCallback(log);
		this.config.debugCallback(csv);
	}
}

module.exports.forDataCore = forDataCore;
