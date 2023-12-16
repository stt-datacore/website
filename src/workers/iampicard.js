
class Log {
    constructor(level) {
        this.level = level;
    }
    log(message, level = 1) {
        if (this.level >= level) {
            console.log(message);
        }
    }
}

const resize_array = (array, length, fill_with) => array.concat(Array.from({length}, () => fill_with)).slice(0, length);


const SKILL_COUNT = 6;
const SLOT_COUNT = SKILL_COUNT*2;
const FROZEN_BIT = SLOT_COUNT;
const ACTIVE_BIT = SLOT_COUNT + 1;
const FFFE_BIT = SLOT_COUNT + 2;
const BITMASK_SIZE = SLOT_COUNT + 3;

const SKILLS = ["Command", "Science", "Security", "Engineering", "Diplomacy", "Medicine"];
const ANTIMATTER_FOR_SKILL_MATCH = 25;
const MIN_SCAN_DEPTH = 2;
const MAX_SCAN_DEPTH = 10;
const ticksPerCycle = 28;
const secondsPerTick = 20;
const cycleSeconds = ticksPerCycle * secondsPerTick;
const cyclesPerHour = 60 * 60 / cycleSeconds;
const hazPerCycle = 6;
const activityPerCycle = 18;
const dilemmasPerHour = 0.5;
const hazPerHour = hazPerCycle * cyclesPerHour - dilemmasPerHour;
const hazSkillPerHour = 1260;
const hazAmPass = 5;
const hazAmFail = 30;
const activityAmPerHour = activityPerCycle * cyclesPerHour;
const minPerHour = 60;
const psChance = 0.35;
const ssChance = 0.25;
const osChance = 0.1;
const dilPerMin = 5;

class Result {
    constructor(crew = [], config = {}, score = 0) {
        this.crew = crew;
        this.config = config;
        this.score = score
    }
}
class VoyageCalculator {
    constructor(jsonInput, callback, transwarp, debugLevel) {
        this.progressUpdate = (newBest) => {
            if (newBest.score > this.realbest.score) {
                this.realbest = newBest;
                callback(newBest);
            }
        };
        this.realbest = { score : 0};
        this.transwarp = transwarp;
        this.log = new Log(debugLevel);
        this.abort = false;
        this.binaryConfig = jsonInput;
        this.estimateBinaryConfig = {
            elapsedTimeHours: 0,
            elapsedTimeMinutes: 0,
            remainingAntiMatter: 0,
            slotCrewIds: new Array(5).fill(0)
        };
        this.roster = [];
        this.slotRosters = Array.from({length: SLOT_COUNT }, () => (new Array()));
        this.sortedSlotRosters = Array.from({length: SLOT_COUNT }, () => (new Array()));
        this.best = {
            considered: new Array(SLOT_COUNT).fill(null),
            score: 0,
            result: undefined,
            config: undefined
        };
        this.binaryConfig = jsonInput;
        this.considered = Array.from({length: 20}, () => new Array(12)); 

        for (const crew of jsonInput["crew"]) {
            const traitBitMask = crew["traitBitMask"];
            const bitMask = traitBitMask;
            const c = {
                id: crew["id"],
                name: crew["name"],
                ff100: (bitMask & FFFE_BIT) !== 0,
                max_rarity: crew["max_rarity"],
                traitIds: bitMask,
                skillMaxProfs: new Array(SKILL_COUNT),
                skillMinProfs: new Array(SKILL_COUNT),
                skills: new Array(SKILL_COUNT),
                considered: new Array(10).fill(false)
            };
            const skillData = crew["skillData"];
            for (let i = 0; i < 6; i++) 
                c.skills[i] = {core: skillData[i * 3], range_min: skillData[i * 3 + 1], range_max: skillData[i * 3 + 2]};
            
            c.slotCrew = new Array(12);
            this.log.log(c.name + " " + c.skills[0] + " " + c.skills[1] + " " + c.skills[2] + " " + c.skills[3] + " " + c.skills[4] + " " + c.skills[5] + " ", 1);
            this.roster.push(c);
        }
        
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            const slotRoster = this.slotRosters[iSlot];

            for (let iCrew = 0; iCrew < this.roster.length; iCrew++) {
                const crew = Object.assign({}, this.roster[iCrew]);
                crew.score = this.computeScore(crew, this.binaryConfig.slotSkills[iSlot], iSlot);
                this.log.log(`${crew.name} (${SKILLS[this.binaryConfig.slotSkills[iSlot]]}): ${crew.score}`, 1);
                if (crew.score > 0) {
                    crew.original = this.roster[iCrew];
                    crew.slot = iSlot;
                    crew.original.slotCrew[iSlot] = crew;
                    slotRoster.push(crew);
                }
                //this.sortedSlotRosters[iSlot].push(crew);
            }
            this.sortedSlotRosters[iSlot] = slotRoster.sort((left, right) => right.score - left.score);
        }
    }

    abort() {
        this.abort = true
    }

    skillScore(crew, skill) {
        return crew.skills[skill].core + (crew.skills[skill].range_min + crew.skills[skill].range_max)/2;
    }

    computeScore(crew, skill, traitSlot) {
        if (crew.skills[skill].core === 0)
            return 0;
        let score = 0;
        for (let iSkill = 0; iSkill < SKILL_COUNT; iSkill++) {
            let skillScore = this.skillScore(crew, skill);

            if (iSkill === this.binaryConfig.primarySkill) {
                skillScore = Math.round(skillScore * this.binaryConfig.skillPrimaryMultiplier);
            }
            else if (iSkill === this.binaryConfig.secondarySkill) {
                skillScore = Math.round(skillScore * this.binaryConfig.skillSecondaryMultiplier);
            }
            else if (iSkill === skill) {
                skillScore = Math.round(skillScore * this.binaryConfig.skillMatchingMultiplier);
            }
            score += skillScore;
        }
        if (crew.traitIds & traitSlot) {
            score += this.binaryConfig.traitScoreBoost;
        }

        return score;
    }

    GetAlternateCrew(level) {
        const altCrew = new Array(SLOT_COUNT).fill(null);
        for (let slot = 0; slot < 5; slot++) {
            altCrew[slot] = null;
            let currentLevel = 0;
            for (const crew of this.sortedSlotRosters[slot]) {
                let best = false;
                if (crew.max_rarity === 0) {
                    break;
                }
                for (let bestslot = 0; bestslot < 5; bestslot++) {
                    if (this.best.considered[slot].id === crew.id) {
                        best = true;
                        break;
                    }
                }
                if (!best && (currentLevel++ === level)) {
                    altCrew[slot] = crew;
                    break;
                }
            }
        }
        return altCrew;
    }

    calculate() {
        /*
        const elapsedHours = this.estimateBinaryConfig.elapsedTimeHours + this.estimateBinaryConfig.elapsedTimeMinutes / 60.0;
        if (elapsedHours > 0) {
            const assignments = new Array(SLOT_COUNT).fill(null);
            for (let s = 0; s < SLOT_COUNT; s++) {
                const cid = this.estimateBinaryConfig.slotCrewIds[s];
                this.log.log("  slot " + s + " crewid: " + cid);
                for (const c of this.roster) {
                    if (c.id === cid) {
                        assignments[s] = c;
                        this.log.log(" - " + c.name);
                    }
                }
                this.log.log("");
            }
            const vt = this.calculateDuration(assignments, false);
            this.best.considered = assignments;
            this.best.score = vt - elapsedHours;
            this.log.log("final result: " + vt + " - est time remaining:" + this.best.score);
            this.progressUpdate(this.best.considered, this.best.score);
            return;
        }*/

        for (let iteration = 1;; ++iteration) {
            this.log.log("iteration " + iteration, 1);
            const prevBest = this.best;
            this.resetRosters();
            this.updateSlotRosterScores();
            this.findBest();
            this.log.log("Best: " + this.best.score, 1);
            this.log.log("Previous: " + prevBest.score, 1);
            if (this.best.score > prevBest.score) {
                this.progressUpdate(this.best);
                continue;
            }
            else {
                const newBest = this.realbest;
                this.log.log("final result: " + newBest.score, 1);
                this.log.log("stopping after " + iteration + " iterations", 1);
                break;
            }
        }

        return this.realbest;
    }

    resetRosters() {
        for (const crew of this.roster) {
            crew.considered.fill(false);
        }
    }

    updateSlotRosterScores() {
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            const slotRoster = this.slotRosters[iSlot];
            for (const crew of slotRoster) {
                if (crew.score === 0)
                    continue;
                if (this.best.considered.includes(crew)) {
                    crew.score = Number.MAX_SAFE_INTEGER;
                    continue;
                }

                const newConsidered = this.best.considered.slice();
                newConsidered[iSlot] = crew;
                const result = this.calculateDuration(newConsidered);
                crew.score = Math.round(result.score * 60 * 60);
            }
            this.sortedSlotRosters[iSlot] = slotRoster.sort((left, right) => right.score - left.score);
        }
    }

    findBest() {
        const slotCrewScores = [];
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            for (const crew of this.sortedSlotRosters[iSlot]) {
                slotCrewScores.push(crew.score);
            }
        }
        slotCrewScores.sort((a, b) => b - a);
        const minScore = slotCrewScores[Math.max(slotCrewScores.length - 1, this.binaryConfig.searchDepth * 5)];
        let minDepth = MIN_SCAN_DEPTH;
        let deepSlot = 0;
        let maxDepth = 0;

        this.log.log("minScore: " + minScore, 1);
        this.log.log("primary: " + SkillName(this.binaryConfig.primarySkill), 1);
        this.log.log("secondary: " + SkillName(this.binaryConfig.secondarySkill), 1);

        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            this.log.log(SkillName(this.binaryConfig.slotSkills[iSlot]), 2);
            let iCrew;
            for (iCrew = 0; iCrew < this.sortedSlotRosters[iSlot].length; iCrew++) {
                const crew = this.sortedSlotRosters[iSlot][iCrew];
                this.log.log(`${crew.name} - ${crew.score}`, 2);
                if (iCrew >= minDepth && crew.score < minScore) {
                    break;
                }
            }
            this.log.log("", 2);
            if (iCrew > maxDepth) {
                deepSlot = iSlot;
                maxDepth = iCrew;
            }
        }
        for (let iMinDepth = minDepth; iMinDepth < MAX_SCAN_DEPTH; iMinDepth++) {
            this.log.log("depth " + iMinDepth, 5);
            if (maxDepth < iMinDepth)
                maxDepth = iMinDepth;
            resize_array(this.considered, maxDepth, new Array(SLOT_COUNT));
            this.roster.forEach(crew => resize_array(crew.considered, maxDepth, false));
            this.fillInitSlot(minScore, iMinDepth, deepSlot);
            if (this.best.score > 0)
                break;
        }
    }

    fillInitSlot(minScore, minDepth, seedSlot) {
        const rosters = this.sortedSlotRosters
            .map(roster => roster.filter((crew, i) => i < minDepth))
            //.reduce((ros, roster, i) => i == seedSlot ? [roster].concat(ros) : ros.concat([roster]), []);
        const slotMap = Array.from({length: 12}, (_, i) => i == seedSlot ? 0 : i );

        for (let iCrew = 0; iCrew < rosters[0].length; iCrew++) {
            const thread = iCrew;
            const crew = rosters[seedSlot][iCrew];
            this.considered[thread][seedSlot] = crew;
            crew.original.considered[thread] = true;
            this.fillSlot(1, rosters, thread, slotMap);
            crew.original.considered[thread] = false;              
        }
    }

    fillSlot(iSlot, rosters, thread, slotMap) {
        const slot = slotMap[iSlot];

        for (let iCrew = 0; iCrew < rosters[slot].length; iCrew++) {
            const crew = rosters[slot][iCrew];

            if (crew.original.considered[thread]) 
                continue;

            this.considered[thread][slot] = crew;
            
            crew.original.considered[thread] = true;
            if (slot < SLOT_COUNT - 1) {
                this.fillSlot(iSlot + 1, rosters, thread, slotMap); 
            } else {
                const crewToConsider = this.considered[thread].slice();
                const best = this.calculateDuration(crewToConsider);
                this.log.log(this.considered[thread], 4);
                this.log.log(best.score, 4);
                if (best.score > this.best.score) {
                    this.log.log("new best found: " + best.score, 1);
                    
                    for (let i = 0; i < crewToConsider.length; i++) {
                        for (let j = i + 1; j < crewToConsider.length; j++) {
                            if (crewToConsider[i].original === crewToConsider[j].original) {
                                this.log.log("ERROR - DUPE CREW IN RESULT", 1);
                            }
                        }
                    }
                    this.best = best;
                    this.progressUpdate(this.refine(this.best));
                    //this.calculateDuration(crewToConsider, true);
                }
            }
            crew.original.considered[thread] = false;
        }
    }

    refine() {
        let refinementFound = false;
        let best = this.best;
        this.log.log("refining", 1);
        for (const crew of this.roster) {
            crew.considered.fill(false);
        }
        let considered = this.best.considered;
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            considered[iSlot].original.considered[0] = true;
        }
        const fUpdateBest = (newBest) => {
            refinementFound = true;
            this.log.log("new best found: " + newBest.score, 1);
            for (let i = 0; i < considered.length; i++) {
                for (let j = i + 1; j < considered.length; j++) {
                    if (considered[i].original === considered[j].original) {
                        this.log.log("ERROR - DUPE CREW IN RESULT", 1);
                    }
                }
            }
            best = newBest;
            //this.progressUpdate(this.best);
            //this.calculateDuration(this.best.considered, this.debug);
        };

        for (;;) {
            refinementFound = false;
            for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
                for (const crew of this.sortedSlotRosters[iSlot]) {
                    if (crew.original.considered[0])
                        continue;
                    const prevCrew = considered[iSlot];
                    considered[iSlot] = crew;
                    const newBest = this.calculateDuration(considered);
                    if (newBest.score <= best.score) {
                        considered[iSlot] = prevCrew;
                        continue;
                    }
                    fUpdateBest(newBest);
                    prevCrew.original.considered[0] = false;
                    crew.original.considered[0] = true;
                }
                for (let jSlot = 0; jSlot < SLOT_COUNT; jSlot++) {
                    if (jSlot === iSlot || considered[iSlot].original.slotCrew[jSlot] === undefined || considered[jSlot].original.slotCrew[iSlot] === undefined)
                        continue;
                    if (considered[iSlot].score + considered[jSlot].score
                        < considered[iSlot].original.slotCrew[jSlot].score
                            + considered[jSlot].original.slotCrew[iSlot].score) {
                        const prevI = considered[iSlot];
                        considered[iSlot] = considered[jSlot].original.slotCrew[iSlot];
                        considered[jSlot] = prevI.original.slotCrew[jSlot];
                        fUpdateBest(this.calculateDuration(considered, this.debug));
                    }
                }
            }
            if (!refinementFound)
                break;
        }
        this.log.log("Refining end", 1);
        console.log("Refined best found: " + best.score);
        return best;
    }

    generateEstConfig(complement) {
        let config = {
            startAm: this.binaryConfig.shipAM,
            numExtends: this.binaryConfig.extendsTarget,
            vfast: true,
            others: []
        };
        const skills = Array.from({length: SKILL_COUNT}, () => ({core: 0, range_min: 0, range_max: 0}));

        let totalSkill = 0;
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            if (!complement[iSlot])
                continue;
            const crew = complement[iSlot];

            for (let iSkill = 0; iSkill < SKILL_COUNT; iSkill++) {
                skills[iSkill].core += crew.skills[iSkill].core
                skills[iSkill].range_min += crew.skills[iSkill].range_min;
                skills[iSkill].range_max += crew.skills[iSkill].range_max; 
            }
            if (crew.traitIds & crew.slot) {
                config.startAm += ANTIMATTER_FOR_SKILL_MATCH;
            }
        }

        this.log.log(config.startAm, 6);
        skills.forEach(skill => this.log.log(skill, 6));
        config.aggregates = Object.fromEntries(skills.map((v, i) => ([SKILLS[i].toLowerCase()+"_skill", v])));

        for (let iSkill = 0; iSkill < 6; iSkill++) {
            if (iSkill === this.binaryConfig.primarySkill) {
                config.ps = skills[iSkill];
                this.log.log("pri: " +  skills[iSkill].core, 6);
            }
            else if (iSkill === this.binaryConfig.secondarySkill) {
                config.ss = skills[iSkill];
                this.log.log("sec: " + skills[iSkill].core, 6);
            } else {
                config.others.push(skills[iSkill]);
                this.log.log("other: " + skills[iSkill].core, 6);
            }
        }
        
        return config;
    }

    calculateDuration(considered, debug = false) {
        const config = this.generateEstConfig(considered, debug);
        const result = this.transwarp(config);

        return {
            considered,
            config,
            result,
            score: result.refills[config.numExtends].result
        };
    }
}

function SkillName(skillId) {
    return skillId <= 5 ? SKILLS[skillId] : ""
}

function calculate(input, callback, transwarp, logLevel)
{   
    const voyageCalculator = new VoyageCalculator(input, callback, transwarp, logLevel ?? 0);
    return voyageCalculator.calculate();
}

module.exports.calculate = calculate;