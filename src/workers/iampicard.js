
class Log {
    constructor(enabled) {
        this.enabled = enabled;
    }
    log(message) {
        if (this.enabled) {
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
    constructor(jsonInput, callback, transwarp, debug) {
        this.progressUpdate = callback;
        this.transwarp = transwarp;
        this.debug = debug;
        this.log = new Log(this.debug);
        this.abort = false;
        this.binaryConfig = jsonInput;
        this.estimateBinaryConfig = {
            elapsedTimeHours: 0,
            elapsedTimeMinutes: 0,
            remainingAntiMatter: 0,
            slotCrewIds: new Array(5).fill(0)
        };
        this.roster = [];
        this.slotRosters = Array.from({length: SLOT_COUNT }, () => (new Array(this.roster.length)));
        this.sortedSlotRosters = Array.from({length: SLOT_COUNT }, () => (new Array(this.roster.length)));
        this.bestconsidered = new Array(SLOT_COUNT).fill(null);
        this.bestscore = 0;
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
            this.log.log(c.name + " " + c.skills[0] + " " + c.skills[1] + " " + c.skills[2] + " " + c.skills[3] + " " + c.skills[4] + " " + c.skills[5] + " ");
            this.roster.push(c);
        }
        
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            const slotRoster = this.slotRosters[iSlot];

            for (let iCrew = 0; iCrew < this.roster.length; iCrew++) {
                const crew = JSON.parse(JSON.stringify(this.roster[iCrew]));
                crew.score = this.computeScore(crew, this.binaryConfig.slotSkills[iSlot], iSlot);
                //console.log(`${crew.name} (${SKILLS[this.binaryConfig.slotSkills[iSlot]]}): ${crew.score}`);
                crew.original = this.roster[iCrew];
                crew.slotCrew[iSlot] = crew;
                slotRoster[iCrew] = crew;
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
                    if (this.bestconsidered[slot].id === crew.id) {
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
            this.bestconsidered = assignments;
            this.bestscore = vt - elapsedHours;
            this.log.log("final result: " + vt + " - est time remaining:" + this.bestscore);
            this.progressUpdate(this.bestconsidered, this.bestscore);
            return;
        }*/

        for (let iteration = 1;; ++iteration) {
            this.log.log("iteration " + iteration);
            const prevBest = this.bestscore;
            this.resetRosters();
            this.updateSlotRosterScores();
            this.findBest();
            this.log.log("Best: " + this.bestscore);
            this.log.log("Previous: " + prevBest);
            if (this.bestscore > prevBest) {
                this.progressUpdate(this.bestconsidered, this.bestscore);
                continue;
            }
            else {
                const vt = this.calculateDuration(this.bestconsidered, this.debug);
                this.log.log("final result: " + vt);
                this.log.log("stopping after " + iteration + " iterations");
                break;
            }
        }
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
                if (this.bestconsidered.includes(crew)) {
                    crew.score = Number.MAX_SAFE_INTEGER;
                    continue;
                }

                const newConsidered = this.bestconsidered.slice();
                newConsidered[iSlot] = crew;
                crew.score = Math.round(this.calculateDuration(newConsidered) * 60 * 60);
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
        const minScore = slotCrewScores[Math.min(slotCrewScores.length - 1, this.binaryConfig.searchDepth * 5)];
        let minDepth = MIN_SCAN_DEPTH;
        let deepSlot = 0;
        let maxDepth = 0;

        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            this.log.log(SkillName(this.binaryConfig.slotSkills[iSlot]));
            let iCrew;
            for (iCrew = 0; iCrew < this.sortedSlotRosters[iSlot].length; iCrew++) {
                const crew = this.sortedSlotRosters[iSlot][iCrew];
                if (iCrew >= minDepth && crew.score < minScore) {
                    break;
                }
                this.log.log("  " + crew.score + " - " + crew.name);
            }
            this.log.log("");
            if (iCrew > maxDepth) {
                deepSlot = iSlot;
                maxDepth = iCrew;
            }
        }
        this.log.log("minScore: " + minScore);
        this.log.log("primary: " + SkillName(this.binaryConfig.primarySkill));
        this.log.log("secondary: " + SkillName(this.binaryConfig.secondarySkill));
        for (let iMinDepth = minDepth; iMinDepth < MAX_SCAN_DEPTH; iMinDepth++) {
            this.log.log("depth " + iMinDepth);
            if (maxDepth < iMinDepth)
                maxDepth = iMinDepth;
            resize_array(this.considered, maxDepth, new Array(SLOT_COUNT));
            this.roster.forEach(crew => resize_array(crew.considered, maxDepth, false));
            this.fillSlot(0, minScore, iMinDepth, deepSlot);
            if (this.bestscore > 0)
                break;
        }
    }

    fillSlot(iSlot, minScore, minDepth, seedSlot, thread) {
        let slot;
        if (iSlot === 0) {
            slot = seedSlot;
        }
        else if (iSlot === seedSlot) {
            slot = 0;
        } else {
            slot = iSlot;
        }
        
        for (let iCrew = 0; iCrew < this.sortedSlotRosters[slot].length; iCrew++) {
            const crew = this.sortedSlotRosters[slot][iCrew];

            if (iCrew >= minDepth && minScore > crew.score) {
                break;
            }
            if (slot == seedSlot) {
                thread = iCrew;
            } else if (crew.original.considered[thread]) {
                continue;
            }

            this.considered[thread][slot] = crew;
            
            crew.original.considered[thread] = true;
            if (iSlot < SLOT_COUNT - 1) {
                this.fillSlot(iSlot + 1, minScore, minDepth, seedSlot, thread); 
            } else {
                const crewToConsider = this.considered[thread].slice();
                const score = this.calculateDuration(crewToConsider);
                //this.log.log(this.considered[thread]);
                //this.log.log(score);
                if (score > this.bestscore) {
                    this.log.log("new best found: " + score);
                    for (let i = 0; i < crewToConsider.length; i++) {
                        for (let j = i + 1; j < crewToConsider.length; j++) {
                            if (crewToConsider[i].original === crewToConsider[j].original) {
                                this.log.log("ERROR - DUPE CREW IN RESULT");
                            }
                        }
                    }
                    this.bestconsidered = crewToConsider;
                    this.bestscore = score;
                    this.progressUpdate(this.bestconsidered, this.bestscore);
                    //this.calculateDuration(crewToConsider, true);
                }
            }
            if (slot !== seedSlot)
                crew.original.considered[thread] = false;
        }
    }

    refine() {
        this.log.log("refining");
        for (const crew of this.roster) {
            crew.considered.fill(false);
        }
        let considered = this.bestconsidered;
        for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
            considered[iSlot].original.considered[0] = true;
        }
        for (;;) {
            let refinementFound = false;
            const fUpdateBest = () => {
                refinementFound = true;
                const score = this.calculateDuration(considered);
                this.log.log("new best found: " + score);
                for (let i = 0; i < considered.length; i++) {
                    for (let j = i + 1; j < considered.length; j++) {
                        if (considered[i].original === considered[j].original) {
                            this.log.log("ERROR - DUPE CREW IN RESULT");
                        }
                    }
                }
                this.bestconsidered = considered;
                this.bestscore = score;
                this.progressUpdate(this.bestconsidered, this.bestscore);
                this.calculateDuration(this.bestconsidered, this.debug);
            };
            for (let iSlot = 0; iSlot < SLOT_COUNT; iSlot++) {
                for (const crew of this.sortedSlotRosters[iSlot]) {
                    if (crew.original.considered[0])
                        continue;
                    const prevCrew = considered[iSlot];
                    considered[iSlot] = crew;
                    const score = this.calculateDuration(considered, false);
                    if (score <= this.bestscore) {
                        considered[iSlot] = prevCrew;
                        continue;
                    }
                    fUpdateBest();
                    prevCrew.original.considered[0] = false;
                    crew.original.considered[0] = true;
                }
                for (let jSlot = 0; jSlot < SLOT_COUNT; jSlot++) {
                    if (jSlot === iSlot)
                        continue;
                    if (considered[iSlot].score + considered[jSlot].score
                        < considered[iSlot].original.slotCrew[jSlot].score
                            + considered[jSlot].original.slotCrew[iSlot].score) {
                        const prevI = considered[iSlot];
                        considered[iSlot] = considered[jSlot].original.slotCrew[iSlot];
                        considered[jSlot] = prevI.original.slotCrew[jSlot];
                        fUpdateBest();
                    }
                }
            }
            if (!refinementFound)
                break;
        }
    }

    generateEstConfig(complement, debug) {
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
            if (crew.traitIds & iSlot) {
                config.startAm += ANTIMATTER_FOR_SKILL_MATCH;
            }
        }

        if (debug) {
            this.log.log(config.startAm);
            skills.forEach(skill => this.log.log(skill));
        }

        for (let iSkill = 0; iSkill < 6; iSkill++) {
            if (iSkill === this.binaryConfig.primarySkill) {
                config.ps = skills[iSkill];
                debug ? this.log.log("pri: " +  skills[iSkill].core) : undefined;
            }
            else if (iSkill === this.binaryConfig.secondarySkill) {
                config.ss = skills[iSkill];
                debug ? this.log.log("sec: " + skills[iSkill].core) : undefined;
            } else {
                config.others.push(skills[iSkill]);
                debug ? this.log.log("other: " + skills[iSkill].core) : undefined;
            }
        }
        
        return config;
    }

    calculateDuration(complement, debug = false) {
        const config = this.generateEstConfig(complement, debug);
        const result = this.transwarp(config);
        return result.refills[config.numExtends].result;
    }
}

function SkillName(skillId) {
    return skillId <= 5 ? SKILLS[skillId] : ""
}

function calculate(input, callback, transwarp)
{   
    const voyageCalculator = new VoyageCalculator(input, callback, transwarp, true)	
    return voyageCalculator.calculate();
}

module.exports.calculate = calculate;