import { Reward } from "../model/player";
import { CrewMember } from "../model/crew";
import { EventLeaderboard, EventInstance } from "../model/events";
import { GameEvent } from "../model/player";
import { getEventData, guessBonusCrew } from "./events";
import { getVariantTraits } from "./crewutils";

export interface EventStats {
    instance_id: number;
    event_name: string;
    min: number;
    avg: number;
    max: number;
    median: number;
    featured_crew: string[];
    featured_traits: string[];
    bonus_traits: string[];
    crew: string;
    crew_name: string;
    event_type: string;
    discovered?: Date;
    guessed?: boolean;
    other_legendaries?: string[];
    rank?: number;
    percentile?: number;
    sorted_event_type?: string;
}

// Platform independent
export async function getEventStats(crew: CrewMember[], leaderboards: EventLeaderboard[], events: EventInstance[], loadEventFunc: (instanceId: number) => Promise<GameEvent | undefined>, limit?: number): Promise<[EventStats[], { [key: string]: EventStats[] }]> {
    const stats = [] as EventStats[];
    if (limit && limit > 0) events.splice(0, events.length - limit);
    for (let event of events) {
        const lb = leaderboards.find(f => f.instance_id === event.instance_id);
        if (!lb) continue;

        const eventData = await loadEventFunc(event.instance_id);
        if (!eventData) continue;

        const rankedReward = eventData.ranked_brackets[0].rewards.find(f => f.type === 1 && f.rarity === 5) as Reward;
        if (!rankedReward) continue;
        let tleg = eventData.threshold_rewards.filter(f => f.rewards.some(f => f.type === 1 && f.rarity === 5)).map(f => f.rewards).flat().filter(f => f.type === 1 && f.rarity === 5).map(r => r.symbol).filter(f => f) as string[];
        if (tleg.length) {
            tleg = tleg.filter((f, idx) => tleg.findIndex(f2 => f === f2) === idx).sort();
        }
        const variant_ref = {} as {[key: string]: number };

        for (let c of crew) {
            let vt = getVariantTraits(c);
            for (let v of vt) {
                variant_ref[v] ??= 0;
                variant_ref[v]++;
            }
        }
        const parsedData = getEventData(eventData, crew);
        const { traits } = guessBonusCrew(eventData, crew);
        const crewReward = crew.find(f => f.symbol === rankedReward.symbol)!;
        let filtered = lb.leaderboard.filter(f => f.rank <= 1500);
        if (!filtered.length) continue;
        filtered.sort((a, b) => b.score - a.score);
        let avg = filtered.map(e => e.score).reduce((p, n) => p + n, 0) / lb.leaderboard.length;
        let min = filtered.map(e => e.score).reduce((p, n) => p < n ? p : n, 0);
        let max = filtered.map(e => e.score).reduce((p, n) => n > p ? n : p, 0);
        let median = filtered[filtered.length / 2].score;

        let contentType = eventData.content_types?.join("/") || eventData.content?.content_type;
        if (!contentType) {
            if (Array.isArray(eventData.content)) {
                let adata = eventData.content.map(c => c.content_type).join("/");
                if (adata) {
                    contentType = adata;
                }
            }
        }

        if (contentType) {
            let cts = contentType.split("/");
            cts = cts.filter((f, i) => cts.findIndex(f2 => f2 === f) === i);
            contentType = cts.join("/");
        }
        else {
            continue;
        }

        let featured_crew = parsedData?.featured ?? [];
        let featured_traits = ((parsedData?.activeContent as any)?.featured_traits ?? []) as string[];

        featured_traits = [...new Set(featured_traits.concat(traits))].filter(ft => !variant_ref[ft]);
        let bonus_traits = parsedData?.activeContent?.bonus_traits ?? [];
        let bonus_crew = parsedData?.bonus ?? [];

        if (eventData.content?.crew_bonuses) {
            bonus_crew = [...new Set(bonus_crew.concat(Object.keys(eventData.content?.crew_bonuses)))];
        }

        stats.push({
            instance_id: event.instance_id,
            event_name: event.event_name,
            avg,
            min,
            max,
            median,
            featured_crew,
            featured_traits,
            bonus_traits,
            crew: crewReward.symbol,
            crew_name: crewReward.name,
            event_type: contentType,
            discovered: eventData.discovered ? new Date(eventData.discovered) : undefined,
            other_legendaries: tleg
        });
    }


    return [stats, makeTypeBuckets(stats)];
}

export function makeTypeBuckets(in_stats: EventStats[]): { [key: string]: EventStats[] } {

    let savedStats = {} as { [key: string]: EventStats };
    in_stats.forEach((stat) => {
        savedStats[stat.instance_id] = stat;
    });

    let stats = structuredClone(in_stats) as EventStats[];
    stats.forEach((stat) => {
        stat.event_type = stat.event_type?.split('/').sort().join('/');
    });

    let allTypes = stats.map(m => m.event_type).sort();
    allTypes = allTypes.filter((at, idx) => allTypes.findIndex(f => f === at) === idx);
    const typeBuckets =  {} as { [key: string]: EventStats[] };
    stats.forEach((stat) => {
        savedStats[stat.instance_id].sorted_event_type = stat.event_type;
    })
    allTypes.forEach((type) => {
        typeBuckets[type] = stats.filter(f => f.event_type === type).map(m => savedStats[m.instance_id]);
        typeBuckets[type].sort((a, b) => {
            return b.min - a.min;
        })
    });

    return typeBuckets;
}