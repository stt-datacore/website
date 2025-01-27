import fs from 'fs';
import { ComputedSkill, CrewMember, Ranks, RankScoring, Skill } from '../src/model/crew';
import { BuffStatTable, calculateMaxBuffs, lookupAMSeatsByTrait } from '../src/utils/voyageutils';
import { applyCrewBuffs, getVariantTraits, numberToGrade, skillSum } from '../src/utils/crewutils';
import { Collection } from '../src/model/game-elements';
import { getAllStatBuffs } from '../src/utils/collectionutils';
import { EquipmentItem } from '../src/model/equipment';
import { calcQLots } from '../src/utils/equipment';
import { getItemWithBonus, ItemWithBonus } from '../src/utils/itemutils';
import { TraitNames } from '../src/model/traits';
import { potentialCols } from '../src/components/stats/utils';
import { GameEvent } from '../src/model/player';

const STATIC_PATH = `${__dirname}/../../static/structured/`;
const DEBUG = process.argv.includes('--debug');

type QPowers = { symbol: string, qpower: number, bpower: number, gpower: number, avg: number };

interface MainCast {
    tos: string[];
    tng: string[];
    ds9: string[];
    voy: string[];
    ent: string[];
    dsc: string[];
    snw: string[];
    low: string[];
}

function eventToDate(instanceId: number) {
    let num = instanceId;
    let anchor_id = 458;
    let anchor_date = new Date('2025-01-23T12:00:00')
    if (num < 381) num++;
    anchor_date.setDate(anchor_date.getDate() - (7 * (anchor_id - num)));
    return anchor_date;
}

function scoreQuipment(crew: CrewMember, quipment: ItemWithBonus[], buffs: BuffStatTable): QPowers {
    calcQLots(crew, quipment, buffs, true, undefined, 'all');
    // Aggregate:
    let qpower = Object.values(crew.best_quipment!.aggregate_by_skill).reduce((p, n) => p > n ? p : n, 0);
    calcQLots(crew, quipment, buffs, true, undefined, 'core');
    // Base:
    let bpower = [crew.best_quipment_1_2!, crew.best_quipment_1_3!, crew.best_quipment_2_3!, crew.best_quipment_3!].map(q => !q ? 0 : q.aggregate_power).reduce((p, n) => p > n ? p : n, 0);
    // Proficiency:
    calcQLots(crew, quipment, buffs, true, undefined, 'proficiency');
    let gpower = [crew.best_quipment_1_2!, crew.best_quipment_1_3!, crew.best_quipment_2_3!, crew.best_quipment_3!].map(q => !q ? 0 : q.aggregate_power).reduce((p, n) => p > n ? p : n, 0);

    return { qpower, bpower, gpower, avg: 0, symbol: crew.symbol };
}


function normalizeQPowers(qpowers: QPowers[]) {
    ["qpower", "bpower", "gpower"].forEach((power) => {
        qpowers.sort((a, b) => b[power] - a[power])
        let max = qpowers[0][power];
        for (let p of qpowers) {
            p[power] = Number(((p[power] / max) * 100).toFixed(2))
        }
    });

    for (let p of qpowers) {
        p.avg = ((p.gpower * 1) + (p.bpower * 1) + (p.qpower * 1)) / 3;
    }

    qpowers.sort((a, b) => b.avg - a.avg);
}

// function compileEventCrew(crew: CrewMember[]) {
//     const max_diff = 31;
//     const STATIC_PATH = `${__dirname}/../website/static/structured/events`;
//     let eventCrew = [] as string[];
//     let megas = [] as string[];

//     let lastDate = undefined as Date | undefined;
//     let firstnum = 0;

//     fs.readdirSync(`${STATIC_PATH}`).sort((a, b) => {
//         try {
//             let [an, ] = a.split('.');
//             let [bn, ] = b.split('.');
//             return Number(an) - Number(bn);
//         }
//         catch {
//             return a.localeCompare(b);
//         }
//     }).forEach((file, idx) => {
//         let [fnum, ext] = file.split('.');
//         let num = Number(fnum);
//         if (idx === 0) firstnum = num;
//         const ed = eventToDate(num);
//         const etime = ed.getTime();
//         const event = JSON.parse(fs.readFileSync(`${STATIC_PATH}/${file}`, 'utf8')) as GameEvent;
//         let ddtime = null as null | Date;

//         const checkdate = (c) => {
//             if (c?.date_added) {
//                 if (typeof c.date_added === 'string') {
//                     c.date_added = new Date(c.date_added);
//                 }
//                 const gtime = ddtime?.getTime() ?? etime;
//                 const ctime = c.date_added.getTime();
//                 if (Math.abs(gtime - ctime) > (max_diff * 24 * 60 * 60 * 1000)) return false;
//             }
//             return true;
//         }

//         let evcrew = event.threshold_rewards.filter((r) => r.points !== 25000).map((tr, tidx) => tr.rewards.filter(trr => {
//             if (trr.type === 1) {
//                 if (crew) {
//                     let c = crew.find(f => f.symbol === trr.symbol);

//                     if (c) {
//                         return checkdate(c);
//                     }
//                 }
//                 return true;
//             }
//             return false;
//         }).map(trr => trr.symbol)).flat().filter(f => f !== undefined);

//         evcrew = evcrew.concat(event.ranked_brackets.map(tr => tr.rewards.filter(trr => {
//             if (trr.type === 1) {
//                 if (crew) {
//                     let c = crew.find(f => f.symbol === trr.symbol);
//                     return checkdate(c);
//                 }
//                 return true;
//             }
//             return false;
//         }).map(trr => trr.symbol)).flat().filter(f => f !== undefined));

//         megas = megas.concat(event.threshold_rewards.filter(r => r.points === 25000).map(tr => tr.rewards.filter(trr => {
//             return (trr.type === 1);
//         }).map(trr => trr.symbol)).flat().filter(f => f !== undefined));

//         eventCrew = eventCrew.concat(evcrew);

//         if (event.discovered) {
//             let d = new Date(event.discovered);
//             if (!lastDate || d.getTime() > lastDate.getTime()) {
//                 lastDate = d;
//             }
//         }
//     });

//     if (firstnum === 0) {
//         return null;
//     }

//     eventCrew = [ ... new Set(eventCrew)];
//     megas = [ ... new Set(megas)];

//     let cutOff = eventToDate(firstnum);

//     return { eventCrew, cutOff, megas, lastDate };
// }

function manyMuch(crew: CrewMember, type: "G" | "B" | "V") {
    let many = 0;
    let much = 0;
    Object.entries(crew.ranks).forEach(([key, value]) => {
        if (typeof value !== 'number') return;
        if (!key.startsWith(`${type}_`)) return;
        many++;
        much += value;
    });

    return many + (many/much);
}

function velocity(crew: CrewMember, roster: CrewMember[]) {
    roster = [...roster].filter(f => f.skill_order.join(",") === crew.skill_order.join(","));
    let highint = [] as number[];
    crew.date_added = new Date(crew.date_added);
    roster.forEach((r => r.date_added = new Date(r.date_added)));

    roster.sort((a, b) => {
        return a.date_added.getTime() - b.date_added.getTime();
    }).filter(f => f.date_added.getTime() >= crew.date_added.getTime());

    let c = roster.length;
    if (c === 1) {
        return skillSum(roster[0].skill_order.map(skill => roster[0].base_skills[skill] as Skill))
    }
    for (let i = 1; i < c; i++) {
        let tdiff = roster[i].date_added.getTime() - roster[i - 1].date_added.getTime();
        let pdiff = skillSum(roster[i].skill_order.map(skill => roster[i].base_skills[skill] as Skill)) - skillSum(roster[i - 1].skill_order.map(skill => roster[i - 1].base_skills[skill] as Skill));
        if (tdiff === 0) {
            highint.push(Math.abs(pdiff));
            continue;
        }
        if (pdiff > 0) {
            highint.push(pdiff / tdiff);
        }
    }

    return highint.reduce((p, n) => p + n, 0);
}

const SpecialCols = {
    original: 34,
    dsc: 20,
    ent: 66,
    voy: 74,
    q: 31,
    evsuit: 38,
    ageofsail: 37,
    exclusive_gauntlet: 32,
    low: 54,
    tas: 54,
    vst: 54,
    crew_max_rarity_3: 16,
    crew_max_rarity_2: 15,
    crew_max_rarity_1: 14,
    niners: 29,
};

function castCount(crew: CrewMember, roster: CrewMember[], maincast: MainCast) {
    let variants = getVariantTraits(crew);
    variants = [ ...new Set(Object.values(maincast).map((m: string[]) => m.filter(f => variants.includes(f))).flat()) ];
    let count = roster.filter(c => c.traits_hidden.some(th => variants.includes(th))).length;
    return count;
}

function skillRare(crew: CrewMember, roster: CrewMember[]) {
    if (crew.skill_order.length !== 3) {
        return 1;
    }

    let s1 = crew.skill_order[0];
    let s2 = crew.skill_order[1];
    let s3 = crew.skill_order[2];
    let primes = [s1, s2];
    let ro = roster.filter(c => {
        if (c.skill_order.length !== 3) return false;
        let n1 = c.skill_order[0];
        let n2 = c.skill_order[1];
        let n3 = c.skill_order[2];
        let primes2 = [n1, n2];
        if (s3 === n3 && primes.every(p => primes2.includes(p))) return true;
        return false;
    });
    return ro.length / roster.length;
}

function tertRare(crew: CrewMember, roster: CrewMember[]) {
    if (crew.skill_order.length !== 3) {
        return 1;
    }

    let s3 = crew.skill_order[2];
    let ro = roster.filter(c => {
        if (c.skill_order.length !== 3) return false;
        let n3 = c.skill_order[2];
        if (s3 === n3) return true;
        return false;
    });
    return ro.length / roster.length;
}


function traitScoring(roster: CrewMember[]) {
	roster = [ ...roster ];

	const traitCount = {} as { [key: string]: number };
	roster.forEach((crew) => {
		crew.traits.forEach((trait) => {
			traitCount[trait] ??= 0;
			traitCount[trait]++;
		});
	});
	roster.forEach((crew) => {
		crew.ranks ??= {} as Ranks;
        crew.ranks.scores ??= {} as RankScoring;
		let traitsum = crew.traits.map(t => traitCount[t]).reduce((p, n) => p + n, 0);
		crew.ranks.scores.trait = (1 / traitsum) / crew.traits.length;
	});

	roster.sort((a, b) => a.ranks.scores.trait - b.ranks.scores.trait);
    let max = roster[roster.length - 1].ranks.scores.trait;
	roster.forEach((crew, idx) => crew.ranks.scores.trait = Number((((1 - crew.ranks.scores.trait / max)) * 100).toFixed(4)));
}

function collectionScore(c: CrewMember, collections: Collection[]) {
    const crewcols = c.collection_ids.map(id => collections.find(f => f.id?.toString() == id?.toString())!).filter(f => f.milestones?.some(ms => ms.buffs?.length))
    let n = 0;
    for (let col of crewcols) {
        let buffs = getAllStatBuffs(col);
        n += buffs.map(b => b.quantity!).reduce((p, n) => p + n, 0);
    }
    return n; // (c.collection_ids.length / collections.length) + (n / crewcols.length);
    //return n + c.collection_ids.length;
}

type RarityScore = { symbol: string, score: number, rarity: number };

export function score() {

    console.log("Scoring crew...");

    const maincast = JSON.parse(fs.readFileSync(STATIC_PATH + 'maincast.json', 'utf-8')) as MainCast;
    const items = JSON.parse(fs.readFileSync(STATIC_PATH + 'items.json', 'utf-8')) as EquipmentItem[];
    const quipment = items.filter(f => f.type === 14).map(item => getItemWithBonus(item));
    items.length = 0;

    const collections = JSON.parse(fs.readFileSync(STATIC_PATH + 'collections.json', 'utf-8')) as Collection[];
    const TRAIT_NAMES = JSON.parse(fs.readFileSync(STATIC_PATH + 'translation_en.json', 'utf-8')).trait_names as TraitNames;
    const buffcap = JSON.parse(fs.readFileSync(STATIC_PATH + 'all_buffs.json', 'utf-8'));
    const maxbuffs = calculateMaxBuffs(buffcap);
    const crew = (JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[]);
    const origCrew = JSON.parse(JSON.stringify(crew)) as CrewMember[];
    const pcols = potentialCols(crew, collections, TRAIT_NAMES);

    function normalize(results: RarityScore[], inverse?: boolean, min_balance?: boolean) {
        results = results.slice();
        results.sort((a, b) => b.score - a.score);
        let max = results[0].score;
        let min = min_balance ? (results[results.length - 1].score) : 0;
        max -= min;
        for (let r of results) {
            if (inverse) {
                r.score = Number((((1 - (r.score - min) / max)) * 100).toFixed(4));
            }
            else {
                r.score = Number((((r.score - min) / max) * 100).toFixed(4));
            }
        }
        results.sort((a, b) => b.score - a.score);
        return results;
    }

    function makeResults(mode: 'core' | 'proficiency' | 'all', mm?: boolean) {
        let results = [] as RarityScore[];
        let bb: 'B' | 'V' | 'G' = 'V';
        switch (mode) {
            case 'core':
                bb = 'B';
                break;
            case 'proficiency':
                bb = 'G';
                break;
            default:
                bb = 'V';
                break;
        }
        for (let c of crew) {
            applyCrewBuffs(c, maxbuffs);
            let skills = c.skill_order.map(skill => c[skill] as ComputedSkill);
            results.push({
                symbol: c.symbol,
                rarity: c.max_rarity,
                score: mm ? manyMuch(c, bb) : skillSum(skills, mode),
            });
        }
        return normalize(results);
    }

    let results = makeResults('all')
    let voymuch = makeResults('all', true);
    let voyage = results;
    if (DEBUG) console.log("Voyage")
    if (DEBUG) console.log(voyage.slice(0, 20));
    if (DEBUG) console.log("Voyage Many/Much")
    if (DEBUG) console.log(voymuch.slice(0, 20));
    results = makeResults('proficiency')
    let gauntmuch = makeResults('proficiency', true)
    let gauntlet = results;
    if (DEBUG) console.log("Gauntlet")
    if (DEBUG) console.log(gauntlet.slice(0, 20));
    if (DEBUG) console.log("Gauntlet Many/Much")
    if (DEBUG) console.log(gauntmuch.slice(0, 20));
    results = makeResults('core')
    let shuttlemuch = makeResults('core', true)
    let shuttle = results;
    if (DEBUG) console.log("Shuttle")
    if (DEBUG) console.log(shuttle.slice(0, 20));
    if (DEBUG) console.log("Shuttle Many/Much")
    if (DEBUG) console.log(shuttlemuch.slice(0, 20));
    results = [].slice();

    traitScoring(crew);

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: c.ranks.scores.trait
        });
    }
    results.sort((a, b) => b.score - a.score);
    let traits = results;

    if (DEBUG) console.log("Traits")
    if (DEBUG) console.log(traits.slice(0, 20));

    results = [].slice();

    let qpowers = [] as QPowers[];
    for (let c of crew) {
        let data = scoreQuipment(c, quipment, maxbuffs);
        qpowers.push(data);
    }

    normalizeQPowers(qpowers);

    for (let qpc of qpowers) {
        let c = crew.find(f => f.symbol === qpc.symbol)!
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: qpc.avg
        });
    }

    let quips = normalize(results);

    if (DEBUG) console.log("Quipment Score")
    if (DEBUG) console.log(quips.slice(0, 20));

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: collectionScore(c, collections)
        });
    }

    let cols = normalize(results);
    if (DEBUG) console.log("Stat-Boosting Collections")
    if (DEBUG) console.log(cols.slice(0, 20));

    results = [].slice();
    let buckets = [[], [], [], [], [], []] as CrewMember[][];
    for (let c of origCrew) {
        buckets[c.max_rarity].push(c);
    }

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: skillRare(c, buckets[c.max_rarity])
        });
    }

    let skillrare = normalize(results, true);

    if (DEBUG) console.log("Skill-Order Rarity")
    if (DEBUG) console.log(skillrare.slice(0, 20));

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: tertRare(c, buckets[c.max_rarity])
        });
    }

    let tertrare = normalize(results, true);

    if (DEBUG) console.log("Tertiary Rarity")
    if (DEBUG) console.log(tertrare.slice(0, 20));

    results = [].slice();

    for (let c of crew) {

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: velocity(c, buckets[c.max_rarity])
        });
    }

    let velocities = normalize(results);

    if (DEBUG) console.log("Velocity")
    if (DEBUG) console.log(velocities.slice(0, 20));

    let tcolnorm = [] as RarityScore[];
    for (let pc of pcols) {
        tcolnorm.push({
            symbol: pc.trait,
            rarity: 5,
            score: pc.count
        });
    }

    tcolnorm = normalize(tcolnorm);

    if (DEBUG) console.log("Potential Collections")
    if (DEBUG) console.log(tcolnorm);

    results = [].slice();

    for (let c of crew) {
        let tcols = tcolnorm.filter(f => c.traits.includes(f.symbol) || c.traits_hidden.includes(f.symbol));
        let n = tcols.map(tc => tc.score).reduce((p, n) => p + n, 0);

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: n
        });
    }

    let pcolscores = normalize(results, false, true);

    if (DEBUG) console.log("Potential Collection Score")
    if (DEBUG) console.log(pcolscores.slice(0, 20));

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: c.traits.map(m => lookupAMSeatsByTrait(m)).flat().length
        });
    }

    let amseats = normalize(results);

    if (DEBUG) console.log("Antimatter Seats")
    if (DEBUG) console.log(amseats.slice(0, 20));

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: castCount(c, crew, maincast)
        });
    }

    let mains = normalize(results);

    if (DEBUG) console.log("Main cast score")
    if (DEBUG) console.log(mains.slice(0, 20));

    results = [].slice();

    for (let c of origCrew) {
        let maincast_n = mains.find(f => f.symbol === c.symbol)!.score;
        let sk_rare_n = skillrare.find(f => f.symbol === c.symbol)!.score;
        let tert_rare_n = tertrare.find(f => f.symbol === c.symbol)!.score;

        c.ranks.scores.main_cast = maincast_n;
        c.ranks.scores.skill_rarity = sk_rare_n;
        c.ranks.scores.tertiary_rarity = tert_rare_n;

        let gauntlet_n = gauntlet.find(f => f.symbol === c.symbol)!.score;
        let voyage_n = voyage.find(f => f.symbol === c.symbol)!.score;
        let shuttle_n = shuttle.find(f => f.symbol === c.symbol)!.score;
        // let gauntm = gauntmuch.find(f => f.symbol === c.symbol)!.score;
        // let voym = voymuch.find(f => f.symbol === c.symbol)!.score;
        // let shutm = shuttlemuch.find(f => f.symbol === c.symbol)!.score;

        // voy = Math.max(voy, voym);
        // gaunt = Math.max(gaunt, gauntm);
        // shut = Math.max(shut, shutm);
        c.ranks.scores.gauntlet = gauntlet_n;
        c.ranks.scores.voyage = voyage_n;
        c.ranks.scores.shuttle = shuttle_n;

        let amseat_n = amseats.find(f => f.symbol === c.symbol)!.score;
        let quip_n = quips.find(f => f.symbol === c.symbol)!.score;

        c.ranks.scores.quipment = quip_n;
        c.ranks.scores.am_seating = amseat_n;

        let trait_n = traits.find(f => f.symbol === c.symbol)!.score;
        let colscore_n = cols.find(f => f.symbol === c.symbol)!.score;
        let pcs_n = pcolscores.find(f => f.symbol === c.symbol)!.score;
        let velocity_n = velocities.find(f => f.symbol === c.symbol)!.score;

        c.ranks.scores.trait = trait_n;
        c.ranks.scores.collections = colscore_n;
        c.ranks.scores.potential_cols = pcs_n;
        c.ranks.scores.velocity = velocity_n;

        let ship_n = c.ranks.scores.ship.overall;

        //let pot = 0; //(Math.max(voy, shut, gaunt, ship, colscore, trait, trare, skrare, cast, pcs)) * 0.5;

        amseat_n *= 0.5;
        maincast_n *= 0.15;
        colscore_n *= 0.5;
        gauntlet_n *= 1.59;
        pcs_n *= 0.15;
        quip_n *= 0.85;
        ship_n *= 1.25;
        shuttle_n *= 1;
        sk_rare_n *= 2;
        trait_n *= 0.25;
        tert_rare_n *= 0.3;
        velocity_n *= 0.2;
        voyage_n *= 7;

        let scores = [
            amseat_n,
            maincast_n,
            colscore_n,
            gauntlet_n,
            pcs_n,
            quip_n,
            ship_n,
            shuttle_n,
            sk_rare_n,
            trait_n,
            tert_rare_n,
            velocity_n,
            voyage_n,
        ];

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: (scores.reduce((p, n) => p + n, 0) / scores.length)
        });
    }

    results = normalize(results, false, true);

    if (DEBUG) console.log("Final scoring:");
    origCrew.forEach((c) => {
        c.ranks.scores ??= {} as RankScoring;

        let ranks = results.find(f => f.symbol === c.symbol);
        if (ranks) {
            c.ranks.scores.overall = ranks.score;

        }
        else {
            c.ranks.scores.overall = -1;
            c.ranks.scores.overall_rank = -1;
            c.ranks.scores.overall_grade = "?";
        }
    });

    for (let r = 1; r <= 5; r++) {
        let filtered = results.filter(f => f.rarity === r)!;
        filtered.sort((a, b) => b.score - a.score);
        let max1 = filtered[0].score;
        let max2 = filtered.length;
        let rank = 1;
        for (let rec of filtered) {
            let newscore1 = Number(((rec.score / max1) * 100).toFixed(4));
            let newscore2 = Number(((1 - (rank / max2)) * 100).toFixed(4));
            rec.score = (newscore1 + newscore1 + newscore2) / 3;
            rank++;
        }
        normalize(filtered);
    }

    for (let r = 1; r <= 5; r++) {
        let filtered = results.filter(f => f.rarity === r)!;
        filtered.sort((a, b) => b.score - a.score);
        let rank = 1;
        for (let rec of filtered) {
            let c = origCrew.find(fc => fc.symbol === rec.symbol);
            if (c) {
                c.ranks.scores.rarity_overall = rec.score;
                c.ranks.scores.overall_grade = numberToGrade(rec.score / 100);
                c.ranks.scores.overall_rank = rank++;
            }
        }
    }

    if (DEBUG) {
        results.forEach((result, idx) => {
            let c = origCrew.find(f => f.symbol === result.symbol)!;
            if (idx < 50) {
                console.log(`${c.name.padEnd(40, ' ')}`, `Score ${result.score}`.padEnd(15, ' '), `Grade: ${numberToGrade(result.score / 100)}`);
            }
        });
    }
    if (DEBUG) console.log(`Results: ${results.length}`);
    fs.writeFileSync(STATIC_PATH + 'crew.json', JSON.stringify(origCrew));
    console.log("Done.");
}

if (process.argv[1].includes('scoring')) {
    score();
}