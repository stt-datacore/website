import fs from 'fs';
import { ComputedSkill, CrewMember, Ranks, RankScoring } from '../src/model/crew';
import { calculateMaxBuffs, lookupAMSeatsByTrait } from '../src/utils/voyageutils';
import { applyCrewBuffs, getVariantTraits, numberToGrade, skillSum } from '../src/utils/crewutils';
import { Collection } from '../src/model/game-elements';
import { getAllStatBuffs } from '../src/utils/collectionutils';
import { EquipmentItem } from '../src/model/equipment';
import { calcQLots } from '../src/utils/equipment';
import { getItemWithBonus } from '../src/utils/itemutils';
import { AntimatterSeatMap } from '../src/model/voyage';

const STATIC_PATH = `${__dirname}/../../static/structured/`;
const DEBUG = true;

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

function potentialCols(crew: CrewMember[]) {
    const rc = crew.map(c => c.traits).flat().sort();
    const tr = {} as {[key:string]:number};
    for (let r of rc) {
        tr[r] ??= 0;
        tr[r]++;
    }
    return Object.entries(tr).map(([key, value]) => value >= 25 && value <= 200 ? key : undefined).filter(f => f) as string[];
}

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
    const maincast = JSON.parse(fs.readFileSync(STATIC_PATH + 'maincast.json', 'utf-8')) as MainCast;
    const items = JSON.parse(fs.readFileSync(STATIC_PATH + 'items.json', 'utf-8')) as EquipmentItem[];
    const quipment = items.filter(f => f.type === 14).map(item => getItemWithBonus(item));
    items.length = 0;

    const collections = JSON.parse(fs.readFileSync(STATIC_PATH + 'collections.json', 'utf-8')) as Collection[];
    const buffcap = JSON.parse(fs.readFileSync(STATIC_PATH + 'all_buffs.json', 'utf-8'));
    const maxbuffs = calculateMaxBuffs(buffcap);
    const crew = (JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[]);
    const origCrew = JSON.parse(JSON.stringify(crew)) as CrewMember[];
    const pcols = potentialCols(crew);

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

    for (let c of crew) {
        calcQLots(c, quipment, maxbuffs, true);

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: c.best_quipment!.aggregate_power
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
            score: c.traits.filter(f => pcols.includes(f)).length
        });
    }

    let pcolscores = normalize(results);

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
        let cast = mains.find(f => f.symbol === c.symbol)!.score;

        let skrare = skillrare.find(f => f.symbol === c.symbol)!.score;
        c.ranks.scores.skillRarity = skrare;

        let trare = tertrare.find(f => f.symbol === c.symbol)!.score;

        c.ranks.scores.tertiaryRarity = trare;

        let quip = quips.find(f => f.symbol === c.symbol)!.score;
        let gaunt = gauntlet.find(f => f.symbol === c.symbol)!.score;
        let voy = voyage.find(f => f.symbol === c.symbol)!.score;
        let shut = shuttle.find(f => f.symbol === c.symbol)!.score;
        let amseat = amseats.find(f => f.symbol === c.symbol)!.score;

        // let gauntm = gauntmuch.find(f => f.symbol === c.symbol)!.score;
        // let voym = voymuch.find(f => f.symbol === c.symbol)!.score;
        // let shutm = shuttlemuch.find(f => f.symbol === c.symbol)!.score;

        // voy = Math.max(voy, voym);
        // gaunt = Math.max(gaunt, gauntm);
        // shut = Math.max(shut, shutm);

        let trait = traits.find(f => f.symbol === c.symbol)!.score;

        let colscore = cols.find(f => f.symbol === c.symbol)!.score;
        let pcs = pcolscores.find(f => f.symbol === c.symbol)!.score;

        c.ranks.scores.collections = colscore;

        let ship = c.ranks.scores.ship.overall;
        let pot = 0; //(Math.max(voy, shut, gaunt, ship, colscore, trait, trare, skrare, cast, pcs)) * 0.5;

        gaunt *= 1.59;
        voy *= 7;
        ship *= 1.25;
        cast *= 0.15;
        skrare *= 2;
        trare *= 1;
        trait *= 0.5;
        colscore *= 0.5;
        pcs *= 0.15;
        quip *= 0.85;
        amseat *= 0.5;

        let scores = [amseat, pcs, gaunt, voy, ship, shut, trait, colscore, skrare, trare, cast, pot, quip];

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
            rec.score = (newscore1 + newscore2) / 2;
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
                c.ranks.scores.rarity = rec.score;
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
}

if (process.argv[1].includes('scoring')) {
    score();
}