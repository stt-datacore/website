// Adapted from Chewable C++'s STT Voyage Estimator
//  https://codepen.io/somnivore/pen/Nabyzw

import { Skill } from "../model/crew";
import { Estimate, Refill } from "../model/voyage";
import { SporeDriveConfig } from "../model/worker";
import { skillSum } from "../utils/crewutils";

/* eslint-disable */
const blankSkill = {
    core: 0,
    range_min: 0,
    range_max: 0,
    skill: ""
}
function getEstimate(config: SporeDriveConfig, reportProgress = () => true) {
    function performEstimation(config: SporeDriveConfig, reportProgress = () => true) {
        let ps = skillSum(config.ps);
        let ss = skillSum(config.ss);

        if (!config.others) config.others = [
            structuredClone(blankSkill),
            structuredClone(blankSkill),
            structuredClone(blankSkill),
            structuredClone(blankSkill),
        ];

        let o1 = skillSum(config.others[0]);
        let o2 = skillSum(config.others[1]);
        let o3 = skillSum(config.others[2]);
        let o4 = skillSum(config.others[3]);
        let startAm = config.startAm;

        // optional input (proficiency ratio)
        let prof = config.prof ?? 20;

        // optional input (the time to compute)
        let selectedTime = config.selectedTime ?? 20;

        // optional input (ongoing voyage)
        let elapsedSeconds = config.elapsedSeconds ? config.elapsedSeconds : 0;

        if (elapsedSeconds) {
            let nextHour = Math.ceil(elapsedSeconds / 3600);
            if (nextHour % 2) nextHour++;
            if (selectedTime < nextHour) {
                selectedTime = nextHour + 2;
            }
        }

        let currentAm = config.currentAm ?? config.startAm;

        // optional input (simulations)
        let numSims = config.numSims ?? 20000;

        // output
        let numExtends = config.noExtends ? 0 : 2;
        let maxExtends = 100;
        let maxNumSelectedTimeSims = 100;

        // constants
        const ticksPerCycle = 28;
        const secondsPerTick = 20;
        const secondsInMinute = 60;
        const minutesInHour = 60;
        const hazPerCycle = 6;
        const hoursBetweenDilemmas = 2;
        const skillIncPerHaz = 32;
        const ticksPerHazard = 4;
        const hazAmPass = 5;
        const hazAmFail = 30;
        const psChance = 0.35;
        const ssChance = 0.25;
        const osChance = 0.1;
        const dilPerMin = 5;

        // calculated constants
        const maxCostPerHazard = ticksPerHazard + hazAmFail - 1;
        const ticksPerMinute = secondsInMinute / secondsPerTick;
        const ticksPerHour = ticksPerMinute * minutesInHour;
        const cycleSeconds = ticksPerCycle * secondsPerTick;
        const cyclesPerHour = (minutesInHour * secondsInMinute) / cycleSeconds;
        const dilemmasPerHour = 1 / hoursBetweenDilemmas;
        const hazPerHour = hazPerCycle * cyclesPerHour - dilemmasPerHour;
        const numSelectedTimeSims = Math.min(maxNumSelectedTimeSims, numSims);

        const formatResults = (final: boolean) => {
            let refills = [] as Refill[];

            // calculate and display results
            for (let extend = 0; extend <= numExtends; ++extend) {
                let exResults = results[extend];

                exResults.sort(function (a, b) {
                    return a - b;
                });
                let voyTime = exResults[Math.floor(exResults.length / 2)];

                // compute other results
                let safeTime = exResults[Math.floor(exResults.length / 10)];
                let saferTime = exResults[Math.floor(exResults.length / 100)];
                let moonshotTime =
                    exResults[exResults.length - Math.floor(exResults.length / 100)];

                // compute chance of dilemma closest to median
                const lastDilemma = Math.max(
                    Math.floor(elapsedSeconds / 7200) * 2 + 2,
                    Math.round(voyTime / 2) * 2,
                );
                const lastDilemmaSuccesses = exResults.filter(
                    (r) => r >= lastDilemma,
                ).length;

                let refill: Refill = {
                    all: exResults,
                    result: voyTime,
                    safeResult: safeTime,
                    saferResult: saferTime,
                    moonshotResult: moonshotTime,
                    lastDil: lastDilemma,
                    dilChance: (100 * lastDilemmaSuccesses) / exResults.length,
                    refillCostResult:
                        extend > 0
                            ? Math.ceil(resultsRefillCostTotal[extend] / exResults.length)
                            : 0,
                };

                refills.push(refill);
            } // foreach extend

            let timeSims = deterministic ? 1 : numSelectedTimeSims;
            let dilhr20 = Math.round(resultsSelectedTimeCostTotal / timeSims);
            let refillshr20 = Math.round(resultsSelectedTimeRefillsTotal / timeSims);

            return {
                refills,
                dilhr20,
                refillshr20,
                final,
                deterministic,
            };
        }; //end formatResults()

        // more input
        let elapsedHours = elapsedSeconds / 3600;

        if (Math.min(ps, ss, o1, o2, o3, o4, startAm) == 0) {
            ps = ss = 3000;
            o1 = o2 = o3 = o4 = 1000;
            startAm = 500;
            elapsedHours = 0;
            numSims = 1000;
        }

        let hazSkillVariance = prof / 100;
        let skills = [config.ps, config.ss, config.others[0], config.others[1], config.others[2], config.others[3]];

        let elapsedTicks = Math.floor(elapsedSeconds / secondsPerTick);
        let elapsedCycles = Math.floor(elapsedTicks / ticksPerCycle);
        let dilemmaForHazards = Math.floor(elapsedHours / hoursBetweenDilemmas);
        let elapsedHazCount =
            elapsedCycles * hazPerCycle +
            Math.floor((elapsedTicks % ticksPerCycle) / ticksPerHazard) -
            dilemmaForHazards;
        let elapsedHazSkill = elapsedHazCount * skillIncPerHaz;
        let deterministic = false;
        const maxSkill = Number.isFinite(ps)
            ? Math.max(ps, ss, o1, o2, o3, o4) * (1 + hazSkillVariance)
            : Math.max(...skills.map(sk => sk.core + sk.range_max));
        const minSkill = Number.isFinite(ps)
            ? Math.min(ps, ss, o1, o2, o3, o4) * (1 - hazSkillVariance)
            : Math.min(...skills.map(sk => sk.core + sk.range_max));
        deterministic = maxSkill < elapsedHazSkill || !!config.vfast;

        let hazardScore = 0;
        // Create an array functions to be called at each hazard tick (including rewards and dilemmaas)
        const allHazards = Array.from(
            { length: hazPerHour * Math.max(selectedTime + 10, selectedTime * 2) },
            (v, n) => {
                if (n % 7 == 6)
                    // reward found instead of hazard
                    return () => 29;

                if (n % 90 == 89)
                    // dilemma
                    return () => 30;

                if (maxSkill < hazardScore) return () => 0;

                hazardScore += skillIncPerHaz;

                if (minSkill > hazardScore) return () => hazAmFail + hazAmPass;

                const skillChance = (skill: Skill) =>
                    Math.max(
                        0,
                        Math.min(
                            1,
                            (skill.core + skill.range_max - hazardScore) /
                            (skill.range_max - skill.range_min),
                        ),
                    );
                const probaility = [
                    psChance * skillChance(config.ps),
                    ssChance * skillChance(config.ss),
                    ...config.others?.map((s) => osChance * skillChance(s)) ?? [],
                ].reduce((all, p) => all + p, 0);
                //console.log(probaility);
                return config.vfast
                    ? () => probaility * (hazAmFail + hazAmPass)
                    : () => (Math.random() < probaility ? hazAmFail + hazAmPass : 0);
            },
        );

        //console.log(allHazards.map(h => h()));
        if (deterministic) numSims = 1; // With no more skill checks there can only be one voyage length

        /**
         * @type {number[][]}
         */
        let results = [] as number[][];
        /**
         * @type {number[]}
         */
        let resultsRefillCostTotal = [] as number[];
        for (let iExtend = 0; iExtend <= numExtends; ++iExtend) {
            results.push([]);
            //results[iExtend].length = numSims;
            resultsRefillCostTotal.push(0);
        }

        let resultsSelectedTimeCostTotal = 0;
        let resultsSelectedTimeRefillsTotal = 0;
        let amLeft = 0;

        for (let iSim = 0; iSim < numSims; iSim++) {
            let tick = Math.floor(elapsedHours * ticksPerHour);
            let am = currentAm;
            let refillCostTotal = 0;
            let extend = 0;

            while (
                (extend < numExtends || iSim < numSelectedTimeSims) &&
                extend < maxExtends
            ) {
                while (am > maxCostPerHazard) {
                    const potHazEncountered = Math.floor(am / maxCostPerHazard);
                    const nextTick = tick + potHazEncountered * ticksPerHazard;
                    const startHaz = Math.floor(tick / ticksPerHazard);
                    const endHaz = Math.ceil(nextTick / ticksPerHazard);
                    const amAdded = allHazards
                        .slice(startHaz, endHaz)
                        .reduce((total, h) => total + h(), 0);
                    let amLost = potHazEncountered * maxCostPerHazard;
                    am -= amLost - amAdded;
                    //console.log({tick: [tick, nextTick], amAdded, amLost, haz: [startHaz, endHaz]});
                    tick = nextTick;
                }

                while (am > 0) {
                    let haz = Math.floor(tick / ticksPerHazard);
                    am -= tick % ticksPerHazard == 3 ? hazAmFail - allHazards[haz]() : 1;
                    ++tick;
                    //console.log({tick, haz, to: allHazards[haz], am});
                }

                //console.log({tick, am});
                let voyTime = tick / ticksPerHour;
                let refillCost = Math.ceil((voyTime * 60) / dilPerMin);

                if (extend <= numExtends) {
                    results[extend].push(tick / ticksPerHour);

                    if (extend > 0) {
                        resultsRefillCostTotal[extend] += refillCostTotal;
                    }
                }

                if (voyTime > selectedTime) {
                    resultsSelectedTimeCostTotal += refillCostTotal;
                    resultsSelectedTimeRefillsTotal += extend;
                    break;
                }

                am = startAm;
                refillCostTotal += refillCost;
                extend++;
            }
        } // foreach sim

        return formatResults(true);
    }

    let result = {} as Estimate;
    let retries = 3;

    for (let x = 0; x < retries; x++) {
        result = performEstimation(config, reportProgress);
        let maxTime = result.refills.reduce(
            (p, n) => (n.safeResult && n.safeResult > p ? n.safeResult : p),
            0,
        );
        if (result.refills.some((r) => r.safeResult === undefined) || (config.selectedTime ?? 20) < maxTime) {
            config.selectedTime = Math.floor(maxTime + 1);
            if (config.selectedTime % 2) config.selectedTime++;
        }
        else {
            break;
        }
    }
    result.adjustedTime = config.selectedTime ?? 20;
    result.refills = result.refills.filter((r) => r.safeResult);
    return result;
}

export default getEstimate;
