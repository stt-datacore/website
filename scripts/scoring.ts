import fs from 'fs';
import { ComputedSkill, CrewMember, Ranks } from '../src/model/crew';
import { calculateMaxBuffs } from '../src/utils/voyageutils';
import { applyCrewBuffs, skillSum } from '../src/utils/crewutils';
import { Collection } from '../src/model/game-elements';
import { getAllStatBuffs } from '../src/utils/collectionutils';

const STATIC_PATH = `${__dirname}/../../static/structured/`;


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
    const collections = JSON.parse(fs.readFileSync(STATIC_PATH + 'collections.json', 'utf-8')) as Collection[];
    const buffcap = JSON.parse(fs.readFileSync(STATIC_PATH + 'all_buffs.json', 'utf-8'));
    const maxbuffs = calculateMaxBuffs(buffcap);
    const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

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
            r.score = Number(((r.score / max) * 100).toFixed(2));
        }
        return results;
    }

    let results = makeResults('all')
    let voyage = results;
    console.log(results.slice(0, 20));
    results = makeResults('proficiency')
    let gauntlet = results;
    console.log(results.slice(0, 20));
    results = makeResults('core')
    let shuttle = results;
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
        r.score = Number(((r.score / max) * 100).toFixed(2));
    }

    console.log(results.slice(0, 20));
    let cols = results;
    results = [].slice();

    for (let c of crew) {
        let g = gauntlet.find(f => f.symbol === c.symbol)!.score;
        let v = voyage.find(f => f.symbol === c.symbol)!.score * 5;
        let s = shuttle.find(f => f.symbol === c.symbol)!.score;
        let t = traits.find(f => f.symbol === c.symbol)!.score;
        let co = cols.find(f => f.symbol === c.symbol)!.score * 2;
        let sh = c.ranks.ship!.overall;

        let scores = [g, v, s, t, co, sh];
        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: scores.reduce((p, n) => p + n, 0) / scores.length
        });
    }

    results.sort((a, b) => b.score - a.score);
    max = results[0].score;
    for (let r of results) {
        r.score = Number(((r.score / max) * 100).toFixed(2));
    }

    console.log(results.slice(0, 20));


}
score();