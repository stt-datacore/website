import { CrewMember, CurrentWeighting, RankScoring } from "../model/crew";
import { crewCopy } from "./crewutils";

export function applyDynamicWeights(roster: CrewMember[], weighting: CurrentWeighting, make_copy = false) {
    type RarityScore = { symbol: string, score: number, rarity: number, data?: any };
    const crewNames = {} as {[key:string]:string};

    if (make_copy) {
        roster = crewCopy(roster);
    }

    roster.forEach(c => crewNames[c.symbol] = c.name);

    function normalize(results: RarityScore[], inverse?: boolean, min_balance?: boolean, not_crew?: boolean, tie_breaker?: <T extends { symbol: string }>(a: T, b: T) => number) {
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

        results.sort((a, b) => {
            let r = b.score - a.score;
            if (!r) {
                if (tie_breaker) {
                    r = tie_breaker(a, b);
                }
                if (!r && !not_crew) {
                    if (crewNames[a.symbol] && crewNames[b.symbol]) {
                        r = crewNames[a.symbol].localeCompare(b.symbol);
                    }
                    else {
                        console.log(`Missing crew names for ${a.symbol} or ${b.symbol}`)!
                    }
                }
            }
            return r;
        });

        return results;
    }

    const results = [] as RarityScore[];

    roster.forEach(c => {
        let weights = weighting[c.max_rarity];
        let n_main_cast = c.ranks.scores.main_cast * weights.main_cast;
        let n_variant = c.ranks.scores.variant * weights.variant;
        let n_skill_positions = c.ranks.scores.skill_positions * weights.skill_positions;
        let n_skill_rarity = c.ranks.scores.skill_rarity * weights.skill_rarity;
        let n_primary_rarity = c.ranks.scores.primary_rarity * weights.primary_rarity;
        let n_tertiary_rarity = c.ranks.scores.tertiary_rarity * weights.tertiary_rarity;
        let n_quipment = c.ranks.scores.quipment * weights.quipment;
        let n_am_seating = c.ranks.scores.am_seating * weights.am_seating;
        let n_trait = c.ranks.scores.trait * weights.trait;
        let n_collections = c.ranks.scores.collections * weights.collections;
        let n_potential_cols = c.ranks.scores.potential_cols * weights.potential_cols;
        let n_velocity = c.ranks.scores.velocity * weights.velocity;
        let n_crit = c.ranks.scores.crit * weights.crit;
        let n_gauntlet_plus = c.ranks.scores.gauntlet_plus * weights.gauntlet_plus;
        let n_voyage_plus = c.ranks.scores.voyage_plus * weights.voyage_plus;
        let n_shuttle_plus = c.ranks.scores.shuttle_plus * weights.shuttle_plus;
        let n_ship_rank = c.ranks.ship_rank * weights.ship;

        const scores = [
            n_main_cast,
            n_variant,
            n_skill_positions,
            n_skill_rarity,
            n_primary_rarity,
            n_tertiary_rarity,
            n_quipment,
            n_am_seating,
            n_trait,
            n_collections,
            n_potential_cols,
            n_velocity,
            n_crit,
            n_gauntlet_plus,
            n_voyage_plus,
            n_shuttle_plus,
            n_ship_rank,
        ];

        results.push({
            symbol: c.symbol,
            rarity: c.max_rarity,
            score: (scores.reduce((p, n) => p + n, 0) / scores.length)
        });
    });

    normalize(results, false, true);
    roster.forEach((c) => {
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
}