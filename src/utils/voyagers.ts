/*
    Star Trek Timelines Assimilate This (STTAT)
    Copyright (c) 2021 USS John Jay

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*jshint esversion: 6 */

// Voyage calculation inspired by TemporalAgent7 and IAmPicard before that
//  https://github.com/stt-datacore/website
//  https://github.com/iamtosk/StarTrekTimelinesSpreadsheet

export class Voyagers {
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
	// Do X vectors w/ different starting boosts:
	//	Do 10 attempts:
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
			const searchVectors = options.searchVectors ? options.searchVectors : 2;

			let origins = [];
			if (options.initBoosts)
				origins.push(options.initBoosts);
			else
				origins.push({ 'primary': 3.5, 'secondary': 2.5, 'other': 1 });
			if (searchVectors > 1) origins.push({ 'primary': 1.0, 'secondary': 1.0, 'other': 1 });
			if (searchVectors > 2) origins.push({ 'primary': 2.0, 'secondary': 2.0, 'other': 1 });
			if (searchVectors > 3) origins.push({ 'primary': 3.0, 'secondary': 3.0, 'other': 1 });

			const promises = origins.map((boosts, index) =>
				self.doVector(index+1, voyage, primedRoster, boosts)
			);
			Promise.all(promises).then((vectorIds) => {
				self.sendProgress(self.uniques.length + " potential lineups assembled!");
				let lineups = self.uniques.map((unique) => unique.lineup);
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

	doVector(vectorId, voyage, primedRoster, boosts) {
		const maxAttempts = 10;
		let self = this;
		let debug = this.config.debugCallback;
		return new Promise((resolve, reject) => {
			let iAttempts = 0;

			let sequence = Promise.resolve();
			for (let i = 0; i < maxAttempts; i++) {
				sequence = sequence.then(() => {
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							let lineup = self.getBoostedLineup(primedRoster, boosts);
							if (lineup)
								resolve(lineup);
							else
								reject("You don't have enough crew for this voyage!");
						}, 0);
					});
				})
				.then((lineup) => {
					// Proximity is how close a lineup is to hitting its target scores, lower is better
					//	We'll use promixity to narrow the lineups for which to calculate estimates
					let deviations = self.getDeviations(
											lineup.score,
											lineup.skills[voyage.skills.primary_skill],
											lineup.skills[voyage.skills.secondary_skill]
										);
					let proximity = Math.abs(deviations.primary)+Math.abs(deviations.secondary);
					lineup.vector = {
						'id': vectorId,
						'attempt': iAttempts+1,
						'boosts': boosts,
						'deviations': deviations,
						'proximity': proximity
					};

					// Only keep track of unique lineups, but use lineup with higher AM if available
					let existing = self.uniques.find((unique) => unique.uniqueId == lineup.key);
					if (existing) {
						// Proximity might be better on existing lineup (is this necessary?)
						//if (proximity > existing.bestProximity)
						//	lineup.proximity = existing.bestProximity;
						if (lineup.antimatter > existing.bestAntimatter) {
							existing.bestAntimatter = lineup.antimatter;
							existing.lineup = lineup;
						}
					}
					else {
						let lineupIndex = self.uniques.length+1;
						self.sendProgress("Found "+lineupIndex+" potential lineups so far...");
						if (debug) {
							let sLineup = "";
							for (let i = 0; i < lineup.crew.length; i++) {
								if (sLineup != "") sLineup += ", ";
								sLineup += lineup.crew[i].name + " (" + lineup.crew[i].score.toFixed(1) + ")";
							}
							debug("Lineup #"+lineupIndex+": "+sLineup);
							debug("Boosts: "+boosts.primary.toFixed(2)+"+"+boosts.secondary.toFixed(2)+"+"+boosts.other.toFixed(2));
							debug("Scores: "+lineup.skills.command_skill+", "+lineup.skills.diplomacy_skill+", " +
									lineup.skills.security_skill+", "+lineup.skills.engineering_skill+", " +
									lineup.skills.science_skill+", "+lineup.skills.medicine_skill);
							debug("Prime Deviations: "+deviations.primary.toFixed(2)+", "+deviations.secondary.toFixed(2));
						}
						self.uniques.push({
							'uniqueId': lineup.key,
							'bestAntimatter': lineup.antimatter,
							'bestProximity': proximity,
							lineup
						});
					}

					if (iAttempts+1 < maxAttempts) {
						// Finetune by smaller increments as attempts increase
						let finetuneRatio = 1/(iAttempts+1);
						if (finetuneRatio < 0.1) finetuneRatio = 0.1;
						boosts = self.adjustBoosts(boosts, deviations, finetuneRatio);
					}

					iAttempts++;

					// We're done with this vector
					if (!boosts || iAttempts == maxAttempts)
						resolve(vectorId);
				});
			}
			sequence.catch((error) => {
				reject(error);
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

	// Determine how far off targets are based on total scores of a given lineup
	getDeviations(totalScore, primaryScore, secondaryScore) {
		let baseTarget = totalScore/10;

		// These base target values were determined from simulation results
		let primaryFactor = 3.5;	// Default factors match initial boosts
		if (baseTarget >= 5800)
			primaryFactor = 2.25;
		else if (baseTarget >= 4000)
			primaryFactor = 2.5;
		else if (baseTarget >= 3000)
			primaryFactor = 2.75;
		else if (baseTarget >= 2400)
			primaryFactor = 3;
		else if (baseTarget >= 2200)
			primaryFactor = 3.25;

		// Secondary target should be as close to primary target as possible,
		//	except when primary factor is higher than default secondary factor
		//	 (Maybe? Need to do more simulations to confirm secondary factor ceiling)
		let secondaryFactor = primaryFactor > 2.5 ? 2.5 : primaryFactor;

		let primaryTarget = primaryFactor*baseTarget;
		let primaryDeviation = (primaryScore-primaryTarget)/baseTarget;

		let secondaryTarget = secondaryFactor*baseTarget;
		let secondaryDeviation = (secondaryScore-secondaryTarget)/baseTarget;

		return {
			'primary': primaryDeviation,
			'secondary': secondaryDeviation
		};
	}

	// Reweight boosts to balance skill scores
	adjustBoosts(boosts, deviations, finetuneRatio) {
		let primaryAdjustment = deviations.primary*finetuneRatio*-1;
		let secondaryAdjustment = deviations.secondary*finetuneRatio*-1;

		// Primary, secondary boost adjustments should be enough that other adjustments not needed
		let newBoosts = {
			'primary': boosts.primary+primaryAdjustment > 0 ? boosts.primary+primaryAdjustment : 0,
			'secondary': boosts.secondary+secondaryAdjustment > 0 ? boosts.secondary+secondaryAdjustment : 0,
			'other': boosts.other
		};

		// No adjustments made, so stop trying to optimize
		if (primaryAdjustment == 0 && secondaryAdjustment == 0)
			return false;

		return newBoosts;
	}
}

export class VoyagersLineup {
	constructor(assignments, assemblyLog = "") {
		const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
							'engineering_skill', 'science_skill', 'medicine_skill'];

		let crew = [];
		let traitsMatched = [];
		let skillScores = {
			'command_skill': 0, 'diplomacy_skill': 0, 'security_skill': 0,
			'engineering_skill': 0, 'science_skill': 0, 'medicine_skill': 0
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
				skillScores[SKILL_IDS[iSkill]] += dSkillScore;
				dTotalScore += dSkillScore;
				dTotalProficiency += dProficiency;
			}
		}

		let lineupKey = "";
		for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
			let dSkillScore = Math.floor(skillScores[SKILL_IDS[iSkill]]);
			lineupKey += dSkillScore+',';
			skillScores[SKILL_IDS[iSkill]] = dSkillScore;
		}

		this._key = lineupKey;
		this._crew = crew;
		this._traits = traitsMatched;
		this._skills = skillScores;
		this._score = dTotalScore;
		this._proficiency = parseInt(dTotalProficiency/dTotalScore*100);
		this._antimatter = iBonusTraits*25;
		this._log = assemblyLog;
	}

	set vector(aVector) {
		this._vector = aVector;
	}

	get vector() {
		return this._vector;
	}

	get key() {
		return this._key;
	}

	get crew() {
		return this._crew;
	}

	get traits() {
		return this._traits;
	}

	get skills() {
		return this._skills;
	}

	get score() {
		return this._score;
	}

	get proficiency() {
		return this._proficiency;
	}

	get antimatter() {
		return this._antimatter;
	}

	get log() {
		return this._log;
	}
}

export class VoyagersAnalyzer {
	constructor(voyage, ship, lineups) {
		this.voyage = voyage;
		this.ship = ship;
		this.lineups = lineups;
	}

	analyze(calculator, sorter) {
		let self = this;
		return new Promise((resolve, reject) => {
			// Estimating lineup runtimes is the bottleneck
			//	Best lineups usually have low proximities relative to others, so we can reasonably limit estimates here
			const maxEstimates = Math.min(5, self.lineups.length);
			let lineups = self.lineups.sort((a, b) => a.vector.proximity - b.vector.proximity).slice(0, maxEstimates);

			const estimator = new VoyagersEstimator(calculator);
			const promises = lineups.map((lineup) =>
				estimator.estimate(lineup, self.voyage.skills.primary_skill, self.voyage.skills.secondary_skill, self.ship.antimatter)
			);
			Promise.all(promises).then((estimates) => {
				let sorted = estimates.sort(sorter);
				let best = lineups.find((lineup) => lineup.key == sorted[0].lineupKey);
				let estimate = sorted[0].estimate.refills[0];
				let log = {
					'UniqueCount': self.lineups.length,
					'Vector': best.vector.id,
					'Attempt': best.vector.attempt,
					'PromixityIndex': self.lineups.filter((lineup) => lineup.vector.proximity < best.vector.proximity).length,
					'BestEstimate': (estimate.result*3+estimate.safeResult)/4,
					'Chewable': estimate.result,
					'SaferResult': estimate.saferResult
				};
				resolve([best, sorted[0].estimate, log]);
			})
			.catch((error) => {
				reject(error);
			});
		});
	}
}

export class VoyagersEstimator {
	constructor(calculator) {
		this.calculator = calculator;
	}

	estimate(lineup, primarySkill, secondarySkill, shipAntimatter) {
		let self = this;
		return new Promise((resolve, reject) => {
			const SKILL_IDS = ['command_skill', 'diplomacy_skill', 'security_skill',
								'engineering_skill', 'science_skill', 'medicine_skill'];

			let ps, ss, os = 0, others = [];
			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				if (SKILL_IDS[iSkill] == primarySkill)
					ps = lineup.skills[SKILL_IDS[iSkill]];
				else if (SKILL_IDS[iSkill] == secondarySkill)
					ss = lineup.skills[SKILL_IDS[iSkill]];
				else {
					os += lineup.skills[SKILL_IDS[iSkill]];
					others.push(lineup.skills[SKILL_IDS[iSkill]]);
				}
			}

			let config = {
				'startAm': shipAntimatter + lineup.antimatter,
				'ps': ps,
				'ss': ss,
				'os': os,
				'others': others,
				'prof': lineup.proficiency
			};

			setTimeout(() => {
				let estimatedLineup = {
					'lineupKey': lineup.key ? lineup.key : "",
					'estimate': self.calculator(config)
				};
				resolve(estimatedLineup);
			});
		});
	}
}