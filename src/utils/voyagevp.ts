
export interface RampUpEntry {
    start: number;
    challenges: number;
    passive: number;
}

export interface VPDetails {
    seconds: number;
    total_drops: number;
    total_vp: number;
    total_opponents: number;
    total_encounters: number;
    vp_per_min: number;
}

const RampUpMap: RampUpEntry[] = [
    { start: 1, challenges: 3, passive: 2 },
    { start: 5, challenges: 3, passive: 3 },
    { start: 15, challenges: 3, passive: 6 },
    { start: 30, challenges: 4, passive: 12 },
    { start: 45, challenges: 4, passive: 18 },
    { start: 60, challenges: 4, passive: 25 },
    { start: 90, challenges: 4, passive: 32 },
    { start: 120, challenges: 5, passive: 39 },
    { start: 240, challenges: 5, passive: 46 },
    { start: 360, challenges: 5, passive: 53 },
    { start: 480, challenges: 5, passive: 60 },
    { start: 600, challenges: 5, passive: 67 },
    { start: 720, challenges: 6, passive: 74 },
   ];


export function calcVoyageVP(seconds: number, bonuses: number[], encounterTimes: number[] | undefined): VPDetails {
    const passiveMul = Math.ceil(bonuses.reduce((p, n) => (p) + (n * 100), 0) + 100) / 100;
    const vpdetails: VPDetails = {
        seconds,
        total_drops: 0,
        total_encounters: 0,
        total_opponents: 0,
        total_vp: 0,
        vp_per_min: 60 / 140
    };

    const droprate = 140;

	const rampUpMap: RampUpEntry[] = RampUpMap.slice().filter(ramp => {
		return (!encounterTimes || encounterTimes.includes(ramp.start));
	});

    const max = rampUpMap[rampUpMap.length - 1];
    const minutes = seconds / 60;

    let multiplier = 0;
    let encounter = 0;
    let passive = 0;

    const win = (n: number, mul: number) => (10 * (mul * mul)) * n;

    for (let entry of rampUpMap) {
        if (entry.start > minutes) break;
        multiplier++;
        encounter += win(entry.challenges, multiplier);
        vpdetails.total_encounters++;
        vpdetails.total_opponents += entry.challenges;
    }

    if (minutes > max.start) {
        let count = max.start + 120;
        while (count < minutes) {
            multiplier++;
            encounter += win(max.challenges, multiplier);
            vpdetails.total_encounters++;
            vpdetails.total_opponents += max.challenges;
            count += 120;
        }
    }

    const dropmax = Math.floor(seconds / droprate) * droprate;
    const secmax = max.start * 60;
    const secdiv = 120 * 60;

    for (let sec = droprate; sec <= dropmax; sec += droprate) {
        if (sec >= secmax) {
            let cpasv = Math.floor((sec - secmax) / secdiv);
            passive += Math.floor(passiveMul * (max.passive + (cpasv * 7)));
        }
        else {
            let fi = rampUpMap.findIndex(f => (f.start * 60) > sec) - 1;
            if (fi < 0) continue;
            let f = rampUpMap[fi];
            passive += Math.floor(passiveMul * f.passive);
        }
        vpdetails.total_drops++;
    }

    vpdetails.total_vp = passive + encounter;
    vpdetails.vp_per_min = vpdetails.total_vp / minutes;
    return vpdetails;
}


/*
base encounter VP is 10, and each drop is 10 x (multiplier)^2.
The multiplier is shown during the encounter and goes up when passed. The number of rounds per encounter gradually increases.
It starts with 3x 3 round, then 4x 4 rounds, 5x 5 rounds, and 6 for all the rest.
example: for the very first encounter (1 min), you can get a total of 3 x 10 x 1^2 = 30 VP.
At the 10th, it's 5 x 10 x 10^2 = 5000 VP

Passive VP
base passive VP goes 1,2,3,6,12,18,25,32,39, [+7]..., etc. and changes at encounters
encounter cadence is 1, 5, 15, 30, 45, 60, 90, 120, 240, [+120]..., etc. minutes
crew VP bonuses are 15% (variant/trait) and 30% (featured)
drops are every 140 seconds
example: let's say you have 3 featured crew, 4 trait, 3 variant, 2 other:
VP_bonus = 3x30% + 4x15% + 3x15% = 195%.
The first drop happens at 2m20s, so after the first encounter,
and the base VP per drop is 2.
With 195% bonus, VP_drop_1 = (1 + 1.95)*2 = 5.9 -> 5VP (floored not rounded).
The 10th drop happens at 23m20s which is after the 3rd encounter,
so base VP is now 6 and VP_drop_10 = (1+1.95)*6 = 17.7 -> 17VP.
Between hours 2 and 4 of the voyage, each drop is (1+1.95)*46 = 135.7 -> 135VP

*/