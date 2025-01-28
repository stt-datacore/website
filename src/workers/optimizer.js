/*
 * Created by Joseph Peck "github.com/Eccentricware"
 * Adapted for use on datacore by "github.com/AlexCPU" and Josh Andrews "github.com/joshurtree"
 *
 * Works out which crew should be cited or leveled in order to best improve voyages.
 */
const SKILLS = ['command', 'diplomacy', 'engineering', 'medicine', 'science', 'security'];
const toObject = (names, templateFunc) => Object.fromEntries(names.map(n => [n, templateFunc()]));
const emptyArrayMap = keys => toObject(keys, () => []);
const skillPairings = SKILLS.reduce((pairs, s1) => pairs.concat(SKILLS.map(s2 => s1 + '/' + s2)), []);

/**
 *
 * @param {string[]} skills
 * @param {string} name
 * @returns
 */
const createSkillPool = (skills, name) => {
    const skillSet = skills.join('/');
    return {
        signature: name ? name : skillSet,
        seats: skills.length * 2,
        assignedCrew: [],
        full: false,
        superSets: SKILLS.filter(s => !skills.includes(s))
            .map(s => skills.concat(s))
            .map(skills => SKILLS.filter(s => skills.includes(s)).join('/'))
            .map(skillSet => skillSet === SKILLS.join('/') ? 'voyageCrew' : skillSet),
        subSets: skills.map(s1 => skills.filter(s2 => s1 !== s2).join('/'))
            .filter(skillSet => skillSet.length > 0)

    };
};

const createSkillPools = () => {
    /**
     *
     * @param {string[]} skills
     * @param {number} n
     * @returns
     */
    const genCombinations = (skills, n) => {
        if (n === 1)
            return skills.map(item => [item]);

        return skills.reduce((combos, item, i) =>
            combos.concat(genCombinations(skills.slice(i + 1), n - 1).map(c => [item, ...c])), []);
    };
    const pools = [5, 4, 3, 2, 1].reduce((pools, n) => pools.concat(genCombinations(SKILLS, n)), [])
        .map(pool => createSkillPool(pool));
    return pools;
};

const assignmentTemplate = () => ({
    /** @type {import('../model/crew.js').CrewMember[]} */
    crew: [],
    seatAssignments: emptyArrayMap(SKILLS.map(s => s + '_skill')),
    assignmentErrors: [],
    skillTotals: emptyArrayMap(SKILLS.map(s => s + '_skill')),
    totalEV: 0
});

const Optimizer = {
    saveFile: {},
    rosterLibrary: {},
    rosterArray: [],
    skills: SKILLS,
    skillPairingsArray: SKILLS.reduce((pairs, s1) => pairs.concat(SKILLS.filter(s2 => s1 !== s2)
        .map(s2 => [s1, s2])
        .map(s => s.join('/'))), []),
    voyageSkillRankings: {
        currentRarity: emptyArrayMap(skillPairings),
        fullyCited: emptyArrayMap(skillPairings),
    },
    voyageSkillPools: Object.fromEntries([createSkillPool(SKILLS, 'voyageCrew')].concat(createSkillPools())
        .map(pool => [pool.signature, pool])),
    topVoyageCrews: {
        currentBest: toObject(skillPairings, assignmentTemplate),
        rarityBest: toObject(skillPairings, assignmentTemplate),
        citedBest: toObject(skillPairings, assignmentTemplate)
    },
    topCrewToTrain: {},
    topCrewToCite: {},
    rankedCrewToTrain: [],
    rankedCrewToCite: [],
    bestPossibleCrew: {
        gauntlet: toObject(skillPairings, () => ({
            name: "",
            gauntletPairingEV: 0
        })),
        voyages: toObject(skillPairings, () => ({
            name: "",
            voyagePairingEV: 0
        }))
    },
    findBestRankings(dataCoreCrew) {
        dataCoreCrew.forEach((crew, i) => {
            //Finding best crew possible
            let skills = ["command_skill", "diplomacy_skill", "engineering_skill", "security_skill", "medicine_skill", "science_skill"];
            skills.forEach(primarySkill => {
                skills.forEach(secondarySkill => {
                    if (primarySkill !== secondarySkill) {
                        let primarySkillSliced = primarySkill.slice(0, primarySkill.indexOf('_'));
                        let secondarySkillSliced = secondarySkill.slice(0, secondarySkill.indexOf('_'));
                        let skillPairingKeyArray = [primarySkillSliced, secondarySkillSliced];
                        let voyagePairingKey = `${skillPairingKeyArray[0]}/${skillPairingKeyArray[1]}`;
                        skillPairingKeyArray.sort();
                        let gauntletPairingKey = `${skillPairingKeyArray[0]}/${skillPairingKeyArray[1]}`;
                        let voyagePairingEV = 0;
                        let gauntletPairingEV = 0
                        for (var skill in crew.base_skills) {
                            if (skill === primarySkill) {
                                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max) / 2) * 0.35;
                                gauntletPairingEV += (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max) / 2
                            } else if (skill === secondarySkill) {
                                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max) / 2) * 0.25;
                                gauntletPairingEV += (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max) / 2
                            } else {
                                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max) / 2) * 0.1;
                            }
                        }
                        if (voyagePairingEV > Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV) {
                            Optimizer.bestPossibleCrew.voyages[voyagePairingKey].name = crew.name;
                            Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV = voyagePairingEV;
                        }
                        if (gauntletPairingEV > Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV) {
                            Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].name = crew.name;
                            Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV = gauntletPairingEV;
                        }
                    }
                });
            });
        });
    },
    /**
     *
     * @param {import('../model/player.js').PlayerData} saveData
     * @param {import('../model/crew.js').CrewMember[]} dataCoreCrew
     */
    assessCrewRoster(saveData, dataCoreCrew) {
        //Gathers all ids to check against for the full roster extraction
        // saveData = saveData;
        let activeCrewIDArray = [];
        let activeCrewProgressLibrary = {};
        let frozenCrewIDArray = [];
        //Adding active crew's IDs to activeCrewIDArray
        saveData.player.character.crew.forEach(crew => {
            if (!activeCrewIDArray.includes(crew.archetype_id)) {
                activeCrewIDArray.push(crew.archetype_id);
                activeCrewProgressLibrary[crew.archetype_id] = {
                    rarity: crew.rarity,
                    level: crew.level,
                    equipment: crew.equipment
                }
            }
        });

        //Adding frozen crew's IDs to frozenCrewIDArray
        saveData.player.character.stored_immortals.forEach(crew => {
            if (!frozenCrewIDArray.includes(crew.id)) {
                frozenCrewIDArray.push(crew.id);
            }
        });
        saveData.player.character.c_stored_immortals?.forEach(crew => {
            if (!frozenCrewIDArray.includes(crew)) {
                frozenCrewIDArray.push(crew);
            }
        });

        //Populates relevant data for acquired crew
        //Data processed differently if immortalized or not
        dataCoreCrew.forEach(crew => {

            //Processing frozen crew
            if (frozenCrewIDArray.includes(crew.archetype_id)) {
                let skillData = {};
                crew.skill_data.forEach(rarity => {
                    skillData[rarity.rarity] = rarity;
                });
                skillData[crew.max_rarity] = {};
                skillData[crew.max_rarity].base_skills = crew.base_skills;
                let crewStats = {
                    id: crew.archetype_id,
                    name: crew.name,
                    shortName: crew.short_name,
                    rarity: crew.max_rarity,
                    maxRarity: crew.max_rarity,
                    immortalityStatus: {
                        fullyEquipped: true,
                        fullyLeveled: true,
                        fullyFused: true,
                        immortalized: true
                    },
                    chronsInvested: true,
                    frozen: true,
                    skillData: skillData,
                    collections: crew.collections,
                }
                Optimizer.rosterLibrary[crew.name] = crewStats;
                Optimizer.rosterArray.push(crewStats);
            } else if (activeCrewIDArray.includes(crew.archetype_id)) {
                let crewProgress = activeCrewProgressLibrary[crew.archetype_id];

                let skillData = {};
                crew.skill_data.forEach(rarity => {
                    skillData[rarity.rarity] = rarity;
                });
                skillData[crew.max_rarity] = {};
                skillData[crew.max_rarity].base_skills = crew.base_skills;

                let fullyLeveled = false;
                let fullyEquipped = false;
                let fullyFused = false;
                let chronsInvested = false;
                let immortalized = false;

                if (crewProgress.level === 100) {
                    fullyLeveled = true;
                }

                if ((crewProgress?.level >= 99) && (!crewProgress.equipment || crewProgress.equipment?.length === 4)) {
                    fullyEquipped = true;
                }
                // if (!crewProgress.equipment) {
                //   console.log("Equipment is missing for this crew");
                //   console.log(crew)
                //   console.log(crewProgress)
                // }
                if (crewProgress.rarity === crew.max_rarity) {
                    fullyFused = true;
                }

                if (fullyLeveled && fullyEquipped) {
                    chronsInvested = true;
                }

                if (fullyEquipped && fullyLeveled && fullyFused) {
                    immortalized = true;
                }

                let crewStats = {
                    id: crew.archetype_id,
                    name: crew.name,
                    shortName: crew.short_name,
                    rarity: crewProgress.rarity,
                    maxRarity: crew.max_rarity,
                    immortalityStatus: {
                        fullyEquipped: fullyEquipped,
                        fullyLeveled: fullyLeveled,
                        fullyFused: fullyFused,
                        immortalized: immortalized
                    },
                    chronsInvested: chronsInvested,
                    frozen: false,
                    skillData: skillData,
                    collections: crew.collections,
                }
                Optimizer.rosterLibrary[crew.name] = crewStats;
                Optimizer.rosterArray.push(crewStats);
            }
        });

        Optimizer.rosterArray.forEach(crew => {
            crew.skillSet = {
                skillArray: [],
                signature: ''
            };
            for (var skill in crew.skillData[1].base_skills) {
                if (!crew.skillSet.skillArray.includes(skill) && skill !== "rarity") {
                    crew.skillSet.skillArray.push(skill);
                }
            }
            crew.skillSet.skillArray.sort();

            for (let skillIndex = 0; skillIndex < crew.skillSet.skillArray.length; skillIndex++) {
                crew.skillSet.signature += crew.skillSet.skillArray[skillIndex].slice(0, crew.skillSet.skillArray[skillIndex].indexOf('_'));
                if (skillIndex !== crew.skillSet.skillArray.length - 1) {
                    crew.skillSet.signature += "/";
                }
            }
            let voyageSkills = ["command_skill", "diplomacy_skill", "engineering_skill", "security_skill", "medicine_skill", "science_skill"];
            for (let rarity in crew.skillData) {
                let rarityLevel = crew.skillData[rarity];
                for (let skill in rarityLevel.base_skills) {
                    let assessedSkill = rarityLevel.base_skills[skill];
                    crew.skillData[rarity].base_skills[skill].ev = assessedSkill.core + (assessedSkill.range_min + assessedSkill.range_max) / 2;
                }
                rarityLevel.voyageMetrics = {};
                voyageSkills.forEach(primarySkill => {
                    voyageSkills.forEach(secondarySkill => {
                        if (primarySkill !== secondarySkill) {
                            let skillPairing = `${primarySkill.slice(0, primarySkill.indexOf('_'))}/${secondarySkill.slice(0, secondarySkill.indexOf('_'))}`;
                            let voyageComboRating = 0;
                            for (var skill in rarityLevel.base_skills) {
                                let assessedSkill = rarityLevel.base_skills[skill];
                                if (skill === primarySkill) {
                                    voyageComboRating += assessedSkill.ev * 0.35;
                                } else if (skill === secondarySkill) {
                                    voyageComboRating += assessedSkill.ev * 0.25;
                                } else {
                                    voyageComboRating += assessedSkill.ev * 0.1;
                                }
                                crew.skillData[rarity].voyageMetrics[skillPairing] = voyageComboRating;
                            }
                        }
                    });
                });
                let expectedVoyage = 0;
                for (var skillPairing in crew.skillData[rarity].voyageMetrics) {
                    expectedVoyage += crew.skillData[rarity].voyageMetrics[skillPairing];
                }
                crew.skillData[rarity].voyageMetrics.expectedVoyage = expectedVoyage / 30;
            }


        });

        console.log("Crew Library:");
        console.log(Optimizer.rosterLibrary);
        console.log("Crew Array:");
        console.log(Optimizer.rosterArray);
    },
    populateSortingArray(sortingArray) {
        sortingArray = [];
        Optimizer.rosterArray.forEach(crew => {
            sortingArray.push(crew.name);
        });
    },
    sortVoyageRankings() {
        Optimizer.skillPairingsArray.forEach(pairing => {
            //Voyage Ranking For Current Rarity Levels
            let sortingArray = [];
            Optimizer.rosterArray.forEach(crew => {
                sortingArray.push(crew.name);
            });
            while (sortingArray.length > 0) {
                let nextRankedName = '';
                let nextRankedEV = 0;
                let nextRankedIndex = 0;
                for (let crewName of sortingArray) {
                    if (Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[pairing] > nextRankedEV) {
                        nextRankedName = crewName;
                        nextRankedEV = Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[pairing];
                        nextRankedIndex = sortingArray.indexOf(crewName);
                    }
                }
                Optimizer.voyageSkillRankings.currentRarity[pairing].push(nextRankedName);
                sortingArray.splice(nextRankedIndex, 1);
            }
            //Voyage Ranking for fully cited crew
            sortingArray = [];
            Optimizer.rosterArray.forEach(crew => {
                sortingArray.push(crew.name);
            });
            while (sortingArray.length > 0) {
                let nextRankedName = '';
                let nextRankedEV = 0;
                let nextRankedIndex = 0;
                sortingArray.forEach(crewName => {
                    if (Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[pairing] > nextRankedEV) {
                        nextRankedName = crewName;
                        nextRankedEV = Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[pairing];
                        nextRankedIndex = sortingArray.indexOf(crewName);
                    }
                });
                Optimizer.voyageSkillRankings.fullyCited[pairing].push(nextRankedName);
                sortingArray.splice(nextRankedIndex, 1);
            }
        });
    },
    resetVoyageSkillPools() {
        for (var skillPool in Optimizer.voyageSkillPools) {
            Optimizer.voyageSkillPools[skillPool].assignedCrew = [];
            Optimizer.voyageSkillPools[skillPool].full = false;
        }
    },
    assignCrewToPools(pool, crewName) {
        if (!pool.assignedCrew.includes(crewName)) {
            pool.assignedCrew.push(crewName);
            if (pool.assignedCrew.length > pool.seats) {
                // Wow this if branch is purely troubleshooting?
                // Might refactor this later but leaving it for now

                // console.log(`Assigning ${crewName} to pool:`);
                // console.log(pool);
                // console.log(`Error! Pool has too many crew! Length is ${pool.assignedCrew.length} and seats is ${pool.seats}`);
            } else if (pool.assignedCrew.length === pool.seats) {
                pool.full = true;
                Optimizer.fillSubSets(pool);
            }
            if (pool.superSets.length > 0) {
                pool.superSets.forEach(superSet => {
                    Optimizer.assignCrewToPools(Optimizer.voyageSkillPools[superSet], crewName);
                });
            }
        }
    },
    fillSubSets(pool) {
        pool.subSets.forEach(subSet => {
            if (!Optimizer.voyageSkillPools[subSet].full) {
                Optimizer.voyageSkillPools[subSet].full = true;
                Optimizer.fillSubSets(Optimizer.voyageSkillPools[subSet]);
            }
        });
    },
    assessPoolVacancies(pool) {
        if (pool.full) {
            pool.subSets.forEach(subSetSignature => {
                Optimizer.voyageSkillPools[subSetSignature].full = true;
            });
            if (pool.subSets.length > 0) {
                pool.subSets.forEach(subSetSignature => {
                    Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools[subSetSignature]);
                });
            }
        }
    },
    findCrewSeating() {
        let seatedCrew = [];
        let assignedSeats = {
            command_skill: [],
            diplomacy_skill: [],
            engineering_skill: [],
            medicine_skill: [],
            science_skill: [],
            security_skill: []
        };
        //Loop to identify the relevant skill counts of the crew for seating
        while (seatedCrew.length < 12) {
            let crewNotSeated = [];
            let skillPools = {}
            // let skillPairing = "Victory/Win";
            skillPools.voyageCrew.assignedCrew.forEach(crewName => {
                if (!seatedCrew.includes(crewName)) {
                    crewNotSeated.push(crewName);
                }
            });
            let crewWith1RelevantSkill = [];
            let crewWith2RelevantSkills = [];
            let crewWith3RelevantSkills = [];
            let leastSkillsPerCrew = [];
            let crewWithRelevantSkillsLibrary = {};
            let relevantSkillCounts = {};
            crewNotSeated.forEach(crewName => {
                let relevantSkills = [];
                Optimizer.rosterLibrary[crewName].skillSet.skillArray.forEach(skill => {
                    if (assignedSeats[skill].length < 2) {
                        relevantSkills.push(skill);
                    }
                });
                if (relevantSkills.length === 1) {
                    crewWith1RelevantSkill.push(crewName);
                } else if (relevantSkills.length === 2) {
                    crewWith2RelevantSkills.push(crewName);
                } else if (relevantSkills.length === 3) {
                    crewWith3RelevantSkills.push(crewName);
                }
                crewWithRelevantSkillsLibrary[crewName] = relevantSkills;
            });
            //Populate the relevant skill counts
            crewWith1RelevantSkill.forEach(crewName => {
                crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
                    if (relevantSkillCounts[skill]) {
                        relevantSkillCounts[skill].push(crewName);
                    } else {
                        relevantSkillCounts[skill] = [crewName];
                    }
                });
            });
            crewWith2RelevantSkills.forEach(crewName => {
                crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
                    if (relevantSkillCounts[skill]) {
                        relevantSkillCounts[skill].push(crewName);
                    } else {
                        relevantSkillCounts[skill] = [crewName];
                    }
                });
            });
            crewWith3RelevantSkills.forEach(crewName => {
                crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
                    if (relevantSkillCounts[skill]) {
                        relevantSkillCounts[skill].push(crewName);
                    } else {
                        relevantSkillCounts[skill] = [crewName];
                    }
                });
            });
            if (crewWith1RelevantSkill.length > 0) {
                leastSkillsPerCrew = crewWith1RelevantSkill;
            } else if (crewWith2RelevantSkills.length > 0) {
                leastSkillsPerCrew = crewWith2RelevantSkills;
            } else if (crewWith3RelevantSkills.length > 0) {
                leastSkillsPerCrew = crewWith3RelevantSkills;
            } else {
                console.log("You broke something somewhere");
            }

            //copy-paste migration from static relevant idenity counts
            let leastKnownSkill = 'indecisive';
            let leastKnownSkillCount = 13;
            let nextCrewSeated = ''
            for (var skill in relevantSkillCounts) {
                if (relevantSkillCounts[skill].length < leastKnownSkillCount && leastSkillsPerCrew.includes(relevantSkillCounts[skill][0])) {
                    leastKnownSkill = skill;
                    leastKnownSkillCount = relevantSkillCounts[skill].length;
                }
            }
            nextCrewSeated = relevantSkillCounts[leastKnownSkill][0];
            seatedCrew.push(nextCrewSeated);
            assignedSeats[leastKnownSkill].push(nextCrewSeated);
        };
    },
    //Focusing on the crew at their current rarity which need no more chroniton investment
    findCurrentBestCrew() {
        //The loop uses skillPairing to assess each voyage combination
        Optimizer.skillPairingsArray.forEach(skillPairing => {
            //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
            ////May want to consider reducing the scope of that pool into the find best crew crew for X function
            Optimizer.resetVoyageSkillPools();
            //Abbreviating reference
            let skillPools = Optimizer.voyageSkillPools;
            //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
            ///and if there is room left for them in their skill signature
            let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];

            //Rank index is used to track where we are moving down the rank array
            let rankIndex = 0;

            //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
            while (!skillPools.voyageCrew.full && rankIndex < rankArray.length) {
                let crewName = rankArray[rankIndex];
                let crew = Optimizer.rosterLibrary[crewName];
                //If there is room in the immediate seats available and if they're already invested
                if (!skillPools[crew.skillSet.signature].full && crew.chronsInvested) {
                    Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                    rankIndex++;
                } else if (!crew.chronsInvested) {
                    rankIndex++;
                } else if (skillPools[crew.skillSet.signature].full) {
                    rankIndex++;
                }
            }

            //Saving the best crew of the combination for the loop into their permanent library
            skillPools.voyageCrew.assignedCrew.forEach(crewName => {
                //Crew roster unseated
                Optimizer.topVoyageCrews.currentBest[skillPairing].crew.push(crewName);
                for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills) {
                    Optimizer.topVoyageCrews.currentBest[skillPairing].skillTotals[skill] +=
                        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills[skill].ev;
                };
                Optimizer.topVoyageCrews.currentBest[skillPairing].totalEV +=
                    Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
            });
        });
    },
    findBestForRarity() {
        //The loop uses skillPairing to assess each voyage combination
        Optimizer.skillPairingsArray.forEach(skillPairing => {
            //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
            ////May want to consider reducing the scope of that pool into the find best crew crew for X function
            Optimizer.resetVoyageSkillPools();
            //Abbreviating reference
            let skillPools = Optimizer.voyageSkillPools;
            //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
            ///and if there is room left for them in their skill signature
            let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
            //Rank index is used to track where we are moving down the rank array
            let rankIndex = 0;
            //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
            while (!skillPools.voyageCrew.full) {
                let crewName = rankArray[rankIndex];
                let crew = Optimizer.rosterLibrary[crewName];
                //If there is room in the immediate seats available and if they're already invested
                if (!skillPools[crew.skillSet.signature].full) {
                    Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                    rankIndex++;
                } else if (skillPools[crew.skillSet.signature].full) {
                    rankIndex++;
                }
            }

            //Saving the best crew of the combination for the loop into their permanent library
            skillPools.voyageCrew.assignedCrew.forEach(crewName => {
                //Crew roster unseated
                Optimizer.topVoyageCrews.rarityBest[skillPairing].crew.push(crewName);
                for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills) {
                    Optimizer.topVoyageCrews.rarityBest[skillPairing].skillTotals[skill] +=
                        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills[skill].ev;
                };
                Optimizer.topVoyageCrews.rarityBest[skillPairing].totalEV +=
                    Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
            });
        });
    },
    findCrewToTrain() {
        Optimizer.skillPairingsArray.forEach(skillPairing => {
            Optimizer.topVoyageCrews.rarityBest[skillPairing].crew.forEach(leveledCrew => {
                if (!Optimizer.topVoyageCrews.currentBest[skillPairing].crew.includes(leveledCrew)) {
                    if (Optimizer.topCrewToTrain[leveledCrew]) {
                        Optimizer.topCrewToTrain[leveledCrew].voyagesImproved.push(skillPairing);
                    } else {
                        Optimizer.topCrewToTrain[leveledCrew] = {
                            voyagesImproved: [skillPairing],
                            currentRarity: Optimizer.rosterLibrary[leveledCrew].rarity,
                            maxRarity: Optimizer.rosterLibrary[leveledCrew].maxRarity,
                            totalEVAdded: 0
                        }
                    }
                };
            });
        });
    },
    findEVContributionOfCrewToTrain() {
        //The loop uses skillPairing to assess each voyage combination
        for (var traineeName in Optimizer.topCrewToTrain) {
            for (let skillPairing of Optimizer.topCrewToTrain[traineeName].voyagesImproved) {
                //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
                ////May want to consider reducing the scope of that pool into the find best crew crew for X function
                Optimizer.resetVoyageSkillPools();
                //Abbreviating reference
                let skillPools = Optimizer.voyageSkillPools;
                //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
                ///and if there is room left for them in their skill signature
                let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
                //Rank index is used to track where we are moving down the rank array
                let rankIndex = 0;
                //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
                while (!skillPools.voyageCrew.full && rankIndex < rankArray.length) {
                    let crewName = rankArray[rankIndex];
                    let crew = Optimizer.rosterLibrary[crewName];
                    //If there is room in the immediate seats available and if they're already invested
                    if (!skillPools[crew.skillSet.signature].full) {
                        if (crew.chronsInvested || crew.name === traineeName) {
                            Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                            rankIndex++;
                        } else {
                            rankIndex++;
                        }
                    } else if (skillPools[crew.skillSet.signature].full) {
                        rankIndex++;
                    } else {
                        console.log("We're still stuck in an infinite while loop?!");
                    }
                }



                //Saving the best crew of the combination for the loop into their permanent library
                let voyageEVWithTrainee = 0;
                skillPools.voyageCrew.assignedCrew.forEach(crewName => {
                    //Crew roster unseated
                    voyageEVWithTrainee += Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
                });
                Optimizer.topCrewToTrain[traineeName].totalEVAdded += voyageEVWithTrainee - Optimizer.topVoyageCrews.currentBest[skillPairing].totalEV;
            }
        }
    },
    sortCrewToTrain() {
        let sortingArray = [];
        for (let crewName in Optimizer.topCrewToTrain) {
            sortingArray.push(crewName);
        }
        while (sortingArray.length > 0) {
            let highestContribingTrainee = '';
            let highestContributedEV = 0;
            let highestContributedVoyages = '';
            sortingArray.forEach(crewName => {
                if (Optimizer.topCrewToTrain[crewName].totalEVAdded > highestContributedEV) {
                    highestContribingTrainee = crewName;
                    highestContributedEV = Optimizer.topCrewToTrain[crewName].totalEVAdded
                    highestContributedVoyages = Optimizer.topCrewToTrain[crewName].voyagesImproved
                }
            });
            if (highestContribingTrainee in Optimizer.rosterLibrary) {
                Optimizer.rankedCrewToTrain.push({
                    name: highestContribingTrainee,
                    addedEV: highestContributedEV,
                    currentRarity: Optimizer.rosterLibrary[highestContribingTrainee].rarity,
                    maxRarity: Optimizer.rosterLibrary[highestContribingTrainee].maxRarity,
                    voyagesImproved: highestContributedVoyages,
                });
            } else {
                console.log(`Error! Can't find crew: '${highestContribingTrainee}' in the roster`);
            }
            sortingArray.splice(sortingArray.indexOf(highestContribingTrainee), 1);
        }
    },
    findBestCitedCrew() {
        //The loop uses skillPairing to assess each voyage combination
        Optimizer.skillPairingsArray.forEach(skillPairing => {
            //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
            ////May want to consider reducing the scope of that pool into the find best crew crew for X function
            Optimizer.resetVoyageSkillPools();
            //Abbreviating reference
            let skillPools = Optimizer.voyageSkillPools;
            //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
            ///and if there is room left for them in their skill signature
            let rankArray = Optimizer.voyageSkillRankings.fullyCited[skillPairing];
            //Rank index is used to track where we are moving down the rank array
            let rankIndex = 0;
            //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
            while (!skillPools.voyageCrew.full) {
                let crewName = rankArray[rankIndex];
                let crew = Optimizer.rosterLibrary[crewName];
                //If there is room in the immediate seats available and if they're already invested
                if (!skillPools[crew.skillSet.signature].full) {
                    Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                    rankIndex++;
                } else if (skillPools[crew.skillSet.signature].full) {
                    rankIndex++;
                }
            }

            //Saving the best crew of the combination for the loop into their permanent library
            skillPools.voyageCrew.assignedCrew.forEach(crewName => {
                //Crew roster unseated
                Optimizer.topVoyageCrews.citedBest[skillPairing].crew.push(crewName);
                for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].base_skills) {
                    Optimizer.topVoyageCrews.citedBest[skillPairing].skillTotals[skill] +=
                        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].base_skills[skill].ev;
                };
                Optimizer.topVoyageCrews.citedBest[skillPairing].totalEV +=
                    Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[skillPairing];
            });
        });
    },
    findCrewToCite() {
        Optimizer.skillPairingsArray.forEach(skillPairing => {
            Optimizer.topVoyageCrews.citedBest[skillPairing].crew.forEach(citedCrew => {
                if (!Optimizer.rosterLibrary[citedCrew].immortalityStatus.fullyFused) {
                    if (Optimizer.topCrewToCite[citedCrew]) {
                        Optimizer.topCrewToCite[citedCrew].voyagesImproved.push(skillPairing);
                    } else {
                        Optimizer.topCrewToCite[citedCrew] = {
                            voyagesImproved: [skillPairing],
                            totalEVContribution: 0,
                            citationsUntilRelevancy: 0,
                            totalEVPerCitation: 0,
                            totalEVNextCitation: 0,
                            totalEVFullyCited: 0,
                            totalEVRemaining: 0,
                            skills: Optimizer.rosterLibrary[citedCrew].skillsRanked
                        }
                    }
                };
            });
        });
    },
    createCandidateRarityRankingArray(candidateName, candidateRarityLevel, skillPairing) {
        let candidate = Optimizer.rosterLibrary[candidateName];
        let currentRarityRankingArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
        let currentRarityWithCandidateRankingArray = [];
        let currentRarityIndex = 0;
        let candidatePlaced = false;
        while (currentRarityIndex < currentRarityRankingArray.length) {
            let crew = Optimizer.rosterLibrary[currentRarityRankingArray[currentRarityIndex]];
            if (candidateName === crew.name && candidatePlaced) {
                // currentRarityWithCandidateRankingArray.push(candidateName);
                currentRarityIndex++;
            } else
                if (candidate.skillData[candidateRarityLevel].voyageMetrics[skillPairing] > crew.skillData[crew.rarity].voyageMetrics[skillPairing] && !candidatePlaced) {
                    currentRarityWithCandidateRankingArray.push(candidateName);
                    candidatePlaced = true;
                } else {
                    currentRarityWithCandidateRankingArray.push(crew.name);
                    currentRarityIndex++;
                }
        }
        return currentRarityWithCandidateRankingArray;
    },
    findBestCrewWithRarityDependentCandidate(rankArray, candidateName) {
        Optimizer.resetVoyageSkillPools();
        let skillPools = Optimizer.voyageSkillPools;
        let rankIndex = 0;
        while (!skillPools.voyageCrew.full && rankIndex < rankArray.length) {
            let crewName = rankArray[rankIndex];
            let crew = Optimizer.rosterLibrary[crewName];
            //If there is room in the immediate seats available and if they're already invested
            if (!skillPools[crew.skillSet.signature].full) {
                if (crew.chronsInvested || crew.name === candidateName) {
                    Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                    rankIndex++;
                } else {
                    rankIndex++;
                }
            } else if (skillPools[crew.skillSet.signature].full) {
                rankIndex++;
            } else {
                console.log("We're still stuck in an infinite while loop?!");
            }
        }
        let voyageCrew = skillPools.voyageCrew.assignedCrew;
        return voyageCrew;
    },
    findEVofVoyageCrewWithRarityDependentCandidate(voyageCrew, skillPairing, candidateName, rarityLevel) {
        let candidate = Optimizer.rosterLibrary[candidateName];
        let totalVoyageEV = 0;
        voyageCrew.forEach(crewName => {
            let crew = Optimizer.rosterLibrary[crewName];
            if (crewName === candidateName) {
                totalVoyageEV += candidate.skillData[rarityLevel].voyageMetrics[skillPairing];
            } else {
                totalVoyageEV += crew.skillData[crew.rarity].voyageMetrics[skillPairing];
            }
        });
        return totalVoyageEV;
    },
    findEVContributionOfCrewToCite() {
        for (var citationCandidateName in Optimizer.topCrewToCite) {
            let candidate = Optimizer.rosterLibrary[citationCandidateName];
            Optimizer.topCrewToCite[candidate.name].voyagesImproved.forEach(skillPairing => {
                //We need to compare the candidate as if they were leveled at current rarity and compare against leveled candidate at max rarity
                //If we calculate a partially fused unleveled candidate against their potential at max rarity, we will get artificially high EV/citation numbers

                //Also around here I intend to eventually do a loop through each individual remaining rarity level to process how many citations until relevance, and the EV ot the NEXT citation

                //To get the EV of the crew with candidate at current rarity. It is possible that a candidate which is relevant at max rarity will not get picked at their current rarity
                //This will correctly reduce their EV/citation, reflecting a true increase of potential while fully cited while also properly suggesting that they might not be the best next choice

                // Philsophy change. Compare EV of current crew with candidate FF
                //Find EV of current crew, to get candidate's total contribution
                let voyageRankingsWithoutCandidate = Optimizer.createRankingArrayWithoutCandidate(candidate.name, skillPairing);
                let bestCrewWithoutCandidate = Optimizer.findBestCrewWithoutCandidate(voyageRankingsWithoutCandidate, candidate.name);
                let voyageEVWithoutCandidate = Optimizer.findEVofVoyageCrewWithoutCandidate(bestCrewWithoutCandidate, skillPairing);

                let voyageRankingWithCandidateAtCurrentRarity = Optimizer.createCandidateRarityRankingArray(candidate.name, candidate.rarity, skillPairing);
                let voyageCrewWithCandidateAtCurrentRarity = Optimizer.findBestCrewWithRarityDependentCandidate(voyageRankingWithCandidateAtCurrentRarity, candidate.name);
                let voyageEVWithCandidateAtCurrentRarity = Optimizer.findEVofVoyageCrewWithRarityDependentCandidate(voyageCrewWithCandidateAtCurrentRarity, skillPairing, candidate.name, candidate.rarity);

                //Get the EV of crew with candidate at max rarity
                let voyageRankingWithCandidateAtMaxRarity = Optimizer.createCandidateRarityRankingArray(candidate.name, candidate.maxRarity, skillPairing);
                let voyageCrewWithCandidateAtMaxRarity = Optimizer.findBestCrewWithRarityDependentCandidate(voyageRankingWithCandidateAtMaxRarity, candidate.name);
                let voyageEVWithCandidateAtMaxRarity = Optimizer.findEVofVoyageCrewWithRarityDependentCandidate(voyageCrewWithCandidateAtMaxRarity, skillPairing, candidate.name, candidate.maxRarity);

                Optimizer.topCrewToCite[candidate.name].totalEVContribution +=
                    voyageEVWithCandidateAtMaxRarity - voyageEVWithoutCandidate;
                Optimizer.topCrewToCite[candidate.name].totalEVRemaining +=
                    voyageEVWithCandidateAtMaxRarity - voyageEVWithCandidateAtCurrentRarity;
                Optimizer.topCrewToCite[candidate.name].totalEVPerCitation +=
                    (voyageEVWithCandidateAtMaxRarity - voyageEVWithCandidateAtCurrentRarity) / (candidate.maxRarity - candidate.rarity);
            });
        }
    },
    sortCrewToCite() {
        let sortingArray = [];
        for (let crewName in Optimizer.topCrewToCite) {
            sortingArray.push(crewName);
        }
        while (sortingArray.length > 0) {
            let highestContributingTrainee = '';
            let highestContributedEV = 0;
            sortingArray.forEach(crewName => {
                if (Optimizer.topCrewToCite[crewName].totalEVContribution > highestContributedEV) {
                    highestContributingTrainee = crewName;
                    highestContributedEV = Optimizer.topCrewToCite[crewName].totalEVContribution
                }
            });
            Optimizer.rankedCrewToCite.push({
                name: highestContributingTrainee,
                totalEVContribution: Optimizer.topCrewToCite[highestContributingTrainee].totalEVContribution,
                totalEVRemaining: Optimizer.topCrewToCite[highestContributingTrainee].totalEVRemaining,
                evPerCitation: Optimizer.topCrewToCite[highestContributingTrainee].totalEVPerCitation,
                voyagesImproved: Optimizer.topCrewToCite[highestContributingTrainee].voyagesImproved,
                skills: Optimizer.topCrewToCite[highestContributingTrainee].skills
            });
            sortingArray.splice(sortingArray.indexOf(highestContributingTrainee), 1);
        }
    },
    createRankingArrayWithoutCandidate(candidateName, skillPairing) {
        // let candidate = Optimizer.rosterLibrary[candidateName];
        let currentRarityRankingArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
        let currentRarityWithoutCandidateRankingArray = [];
        currentRarityRankingArray.forEach(crewName => {
            if (crewName !== candidateName) {
                currentRarityWithoutCandidateRankingArray.push(crewName);
            }
        });
        return currentRarityWithoutCandidateRankingArray;
    },
    findBestCrewWithoutCandidate(rankArray) {
        Optimizer.resetVoyageSkillPools();
        let skillPools = Optimizer.voyageSkillPools;
        let rankIndex = 0;
        while (!skillPools.voyageCrew.full && rankIndex < rankArray.length) {
            let crewName = rankArray[rankIndex];
            let crew = Optimizer.rosterLibrary[crewName];
            //If there is room in the immediate seats available and if they're already invested
            if (!skillPools[crew.skillSet.signature].full) {
                if (crew.chronsInvested) {
                    Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
                    rankIndex++;
                } else {
                    rankIndex++;
                }
            } else if (skillPools[crew.skillSet.signature].full) {
                rankIndex++;
            } else {
                console.log("We're still stuck in an infinite while loop?!");
            }
        }
        let voyageCrew = skillPools.voyageCrew.assignedCrew;
        return voyageCrew;
    },
    findEVofVoyageCrewWithoutCandidate(voyageCrew, skillPairing) {
        let totalVoyageEV = 0;
        voyageCrew.forEach(crewName => {
            let crew = Optimizer.rosterLibrary[crewName];
            totalVoyageEV += crew.skillData[crew.rarity].voyageMetrics[skillPairing];
        });
        return totalVoyageEV;
    },
};

export default Optimizer;