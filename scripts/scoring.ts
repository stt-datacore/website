import fs from 'fs';
import { ComputedSkill, CrewMember, Ranks } from '../src/model/crew';
import { calculateMaxBuffs } from '../src/utils/voyageutils';
import { applyCrewBuffs, getVariantTraits, numberToGrade, skillSum } from '../src/utils/crewutils';
import { Collection } from '../src/model/game-elements';
import { getAllStatBuffs } from '../src/utils/collectionutils';

const STATIC_PATH = `${__dirname}/../../static/structured/`;

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


function makeTraitRanks(roster: CrewMember[]) {
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
		let traitsum = crew.traits.map(t => traitCount[t]).reduce((p, n) => p + n, 0);
		crew.ranks.traitRank = (1 / traitsum) / crew.traits.length;
	});

	roster.sort((a, b) => a.ranks.traitRank - b.ranks.traitRank);
    let max = roster[roster.length - 1].ranks.traitRank;
	roster.forEach((crew, idx) => crew.ranks.traitRank = Number(((1 - (crew.ranks.traitRank / max)) * 100).toFixed(2)));
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

function score() {
    const maincast = JSON.parse(fs.readFileSync(STATIC_PATH + 'maincast.json', 'utf-8')) as MainCast;
    const collections = JSON.parse(fs.readFileSync(STATIC_PATH + 'collections.json', 'utf-8')) as Collection[];
    const buffcap = JSON.parse(fs.readFileSync(STATIC_PATH + 'all_buffs.json', 'utf-8'));
    const maxbuffs = calculateMaxBuffs(buffcap);
    const crew = (JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[]);

    function makeResults(mode: 'core' | 'proficiency' | 'all') {
        let results = [] as { symbol: string, score: number, rarity: number }[]

        for (let c of crew) {
            applyCrewBuffs(c, maxbuffs);
            let skills = c.skill_order.map(skill => c[skill] as ComputedSkill);
            results.push({
                symbol: c.symbol,
                score: skillSum(skills, mode),
                rarity: c.max_rarity
            });
        }

        results.sort((a, b) => b.score - a.score);
        let max = results[0].score;
        for (let r of results) {
            r.score = Number(((r.score / max) * 10).toFixed(2));
        }
        return results;
    }

    let results = makeResults('all')
    let voyage = results;
    console.log("Voyage")
    console.log(results.slice(0, 20));
    results = makeResults('proficiency')
    let gauntlet = results;
    console.log("Gauntlet")
    console.log(results.slice(0, 20));
    results = makeResults('core')
    let shuttle = results;
    console.log("Shuttle")
    console.log(results.slice(0, 20));
    results = [].slice();
    makeTraitRanks(crew);
    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: c.ranks.traitRank
        });
    }
    results.sort((a, b) => b.score - a.score);
    console.log("Traits")
    console.log(results.slice(0, 20));
    let traits = results;

    results = [].slice();
    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: collectionScore(c, collections)
        });
    }
    results.sort((a, b) => b.score - a.score);
    let max = results[0].score;
    for (let r of results) {
        r.score = Number(((r.score / max) * 10).toFixed(2));
    }

    console.log("Stat-Boosting Collections")
    console.log(results.slice(0, 20));
    let cols = results;
    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: skillRare(c, crew)
        });
    }

    results.sort((a, b) => a.score - b.score);

    max = results[results.length - 1].score;
    for (let r of results) {
        r.score = Number(((1 - (r.score / max)) * 10).toFixed(2));
    }
    console.log("Skill-Order Rarity")
    console.log(results.slice(0, 20));
    let skillrare = results;

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: tertRare(c, crew)
        });
    }

    results.sort((a, b) => a.score - b.score);

    max = results[results.length - 1].score;
    for (let r of results) {
        r.score = Number(((1 - (r.score / max)) * 10).toFixed(2));
    }
    console.log("Tertiary Rarity")
    console.log(results.slice(0, 20));
    let tertrare = results;

    results = [].slice();

    for (let c of crew) {
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: castCount(c, crew, maincast)
        });
    }

    results.sort((a, b) => b.score - a.score);

    max = results[0].score;
    for (let r of results) {
        r.score = Number((((r.score / max)) * 10).toFixed(2));
    }
    console.log("Main cast score")
    console.log(results.slice(0, 20));
    let mains = results;
    results = [].slice();

    for (let c of crew) {
        let mc = mains.find(f => f.symbol === c.symbol)!.score * 0.25;
        let sr = skillrare.find(f => f.symbol === c.symbol)!.score * 2;
        let tr = tertrare.find(f => f.symbol === c.symbol)!.score * 0.3;
        let g = gauntlet.find(f => f.symbol === c.symbol)!.score;
        let v = voyage.find(f => f.symbol === c.symbol)!.score * 10;
        let s = shuttle.find(f => f.symbol === c.symbol)!.score;
        let t = traits.find(f => f.symbol === c.symbol)!.score * 0.5;
        let co = cols.find(f => f.symbol === c.symbol)!.score * 0.5;
        let sh = c.ranks.ship!.overall;

        let scores = [v, t, co, sr, tr, mc, Math.max(g, s, sh)];
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: (scores.reduce((p, n) => p + n, 0) / scores.length)
        });
    }

    results = results.sort((a, b) => b.score - a.score).filter(f => f.rarity == 5);
    max = results[0].score;
    let min = results[results.length - 1].score;
    max -= min;
    for (let r of results) {
        r.score = Number((((r.score - min) / max) * 10).toFixed(2));
    }

    console.log("Final scoring:");

    results.slice(0, 50).forEach((result, idx) => {
        let c = crew.find(f => f.symbol === result.symbol)!;
        let tier = 0;
        console.log(`${c.name.padEnd(40, ' ')}`, `Score ${result.score}`.padEnd(15, ' '), `Grade: ${numberToGrade(result.score / 10)}`);
    });
    console.log(`Results: ${results.length}`)
}
score();