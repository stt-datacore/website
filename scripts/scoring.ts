import fs from 'fs';
import { ComputedSkill, CrewMember, Ranks, RankScoring } from '../src/model/crew';
import { calculateMaxBuffs } from '../src/utils/voyageutils';
import { applyCrewBuffs, getVariantTraits, numberToGrade, skillSum } from '../src/utils/crewutils';
import { Collection } from '../src/model/game-elements';
import { getAllStatBuffs } from '../src/utils/collectionutils';

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

    return many/much;
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
    const collections = JSON.parse(fs.readFileSync(STATIC_PATH + 'collections.json', 'utf-8')) as Collection[];
    const buffcap = JSON.parse(fs.readFileSync(STATIC_PATH + 'all_buffs.json', 'utf-8'));
    const maxbuffs = calculateMaxBuffs(buffcap);
    const crew = (JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[]);
    const origCrew = JSON.parse(JSON.stringify(crew)) as CrewMember[];

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

    function makeResults(mode: 'core' | 'proficiency' | 'all') {
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
                score: skillSum(skills, mode) + manyMuch(c, bb),
            });
        }
        return normalize(results);
    }

    let results = makeResults('all')
    let voyage = results;
    if (DEBUG) console.log("Voyage")
    if (DEBUG) console.log(voyage.slice(0, 20));
    results = makeResults('proficiency')
    let gauntlet = results;
    if (DEBUG) console.log("Gauntlet")
    if (DEBUG) console.log(gauntlet.slice(0, 20));
    results = makeResults('core')
    let shuttle = results;
    if (DEBUG) console.log("Shuttle")
    if (DEBUG) console.log(shuttle.slice(0, 20));
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

        let gaunt = gauntlet.find(f => f.symbol === c.symbol)!.score;
        let voy = voyage.find(f => f.symbol === c.symbol)!.score;
        let shut = shuttle.find(f => f.symbol === c.symbol)!.score;
        let trait = traits.find(f => f.symbol === c.symbol)!.score;


        let colscore = cols.find(f => f.symbol === c.symbol)!.score;
        c.ranks.scores.collections = colscore;

        let ship = c.ranks.scores.ship.overall;
        let pot = (Math.max(voy, shut, gaunt, ship));

        gaunt *= 1.5;
        voy *= 7;
        ship *= 1.5;
        cast *= 0.25;
        skrare *= 2;
        trare *= 0.3;
        trait *= 0.5;
        colscore *= 0.5;

        let scores = [gaunt, voy, ship, shut, trait, colscore, skrare, trare, cast, pot];

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: (scores.reduce((p, n) => p + n, 0) / scores.length)
        });
    }

    results = normalize(results, false, false);

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
        let max = filtered[0].score;
        let rank = 1;
        for (let rec of filtered) {
            rec.score = Number(((rec.score / max) * 100).toFixed(4));
            let c = origCrew.find(fc => fc.symbol === rec.symbol);
            if (c) {
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