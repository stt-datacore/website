
export interface DropMapEntry {
    start: number;
    end: number;
    shown: number;
    actual: number;
    drops: number;
    encounter: number;
    opponents: number;
}

const DropMap = [
    { start: 0, end: 30, shown: 1, actual: 1, drops: 12, encounter: 100, opponents: 3 },
    { start: 30, end: 90, shown: 2, actual: 2, drops: 26, encounter: 400, opponents: 3 },
    { start: 90, end: 210, shown: 3, actual: 4, drops: 51, encounter: 900, opponents: 4 },
    { start: 210, end: 330, shown: 4, actual: 6, drops: 51, encounter: 1400, opponents: 4 },
    { start: 330, end: 450, shown: 5, actual: 7, drops: 51, encounter: 2000, opponents: 4 },
    { start: 450, end: 570, shown: 6, actual: 8, drops: 52, encounter: 2700, opponents: 5 },
    { start: 570, end: 690, shown: 7, actual: 9, drops: 51, encounter: 3500, opponents: 5 },
    { start: 690, end: 810, shown: 8, actual: 10, drops: 52, encounter: 4400, opponents: 5 },
    { start: 810, end: 930, shown: 9, actual: 11, drops: 51, encounter: 5400, opponents: 6 },
    { start: 930, end: 1050, shown: 10, actual: 12, drops: 52, encounter: 6500, opponents: 6 },
   ] as DropMapEntry[];

export interface VPDetails {
    seconds: number;
    total_drops: number;
    total_vp: number;
    total_opponents: number;
    total_encounters: number;
    is_overflow: boolean;
}

export function calcVoyageVP(seconds: number, bonuses: number[]): VPDetails {

    const vpdetails = {
        seconds,
        total_drops: 0,
        total_encounters: 0,
        total_opponents: 0,
        total_vp: 0,
        is_overflow: true
    } as VPDetails;

    let dropvp = 50 + bonuses.reduce((p, n) => p + n, 0);
    let total = 0;
    let drops = DropMap.map(elem => ({
        ... elem,
        start: elem.start * 60,
        end: elem.end * 60
    }));

    for (let drop of drops) {
        if (seconds >= drop.end) {
            total += (dropvp * drop.drops * drop.actual) + (drop.encounter * drop.opponents);
            vpdetails.total_drops += drop.drops;
            vpdetails.total_encounters++;
            vpdetails.total_opponents += drop.opponents;
        }
        else {
            vpdetails.is_overflow = false;
            let remainder = seconds - drop.start;
            let dps = drop.drops / (drop.end - drop.start);
            remainder *= dps;
            vpdetails.total_drops += Math.floor(remainder);
            total += (dropvp * drop.actual * Math.floor(remainder));
            break;
        }
    }

    vpdetails.total_vp = total;
    return vpdetails;
}


/*
50 baseline
+10 per small bonus crew (+50 or +100 AM)
+25 per featured crew (+150 AM)

For example, if you're running 4 event crew and 8 small bonus, your VP drops will start at 230.

Multipliers and encounter drops:

First note: My original math was incorrect because the game lies. My notes below "shows 1x" are the in-game representation of your multiplier; the "actual 1x" is what the game actually calculates. You get +1 to your multiplier up until 1:30, then +2 for the next two encounters, then +1 for the rest of your run.

Second note: The number of drops you get between encounters varies, because the drops happen at just over 140 seconds, something like 141.xx. There will be a varying number of drops as shown below as your voyage has little leap-years to catch up.

Third note: Encounter math: The max chain we've observed is 6, and I don't think there is room for more in the UI. Your per-battle VP drops are NOT based on your calculated VP drop bonus, it's a straightline increment based on the previous bonus.

under :30   shows 1x,  actual 1x  - 12 drops - Encounter 100  VP x 3 opponents
0:30-1:30   shows 2x,  actual 2x  - 26 drops - Encounter 400  VP x 3 opponents (+300)
1:30-3:30   shows 3x,  actual 4x  - 51 drops - Encounter 900  VP x 4 opponents (+400)
3:30-5:30   shows 4x,  actual 6x  - 51 drops - Encounter 1400 VP x 4 opponents (+500)
5:30-7:30   shows 5x,  actual 7x  - 51 drops - Encounter 2000 VP x 4 opponents (+600)
7:30-9:30   shows 6x,  actual 8x  - 52 drops - Encounter 2700 VP x 5 opponents (+700)
9:30-11:30  shows 7x,  actual 9x  - 51 drops - Encounter 3500 VP x 5 opponents (+800)
11:30-13:30 shows 8x,  actual 10x - 52 drops - Encounter 4400 VP x 5 opponents (+900)
13:30-15:30 shows 9x,  actual 11x - 51 drops - Encounter 5400 VP x 6 opponents (+1000)


*/