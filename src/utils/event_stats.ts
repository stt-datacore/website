import { Reward } from "../model/player";
import { CrewMember } from "../model/crew";
import { EventLeaderboard, EventInstance } from "../model/events";
import { GameEvent } from "../model/player";

export interface EventStats {
    instance_id: number;
    event_name: string;
    min: number;
    avg: number;
    max: number;
    median: number;
    crew: string;
    event_type: string;
    discovered?: Date;
}

// Platform independent
export async function getEventStats(crew: CrewMember[], leaderboards: EventLeaderboard[], events: EventInstance[], loadEventFunc: (instanceId: number) => Promise<GameEvent | undefined>): Promise<[EventStats[], { [key: string]: EventStats[] }]> {
    const stats = [] as EventStats[];
    events.splice(0, events.length - 104);
    for (let event of events) {
        const lb = leaderboards.find(f => f.instance_id === event.instance_id);
        if (!lb) continue;

        const eventData = await loadEventFunc(event.instance_id);
        if (!eventData) continue;

        const rankedReward = eventData.ranked_brackets[0].rewards.find(f => f.type === 1 && f.rarity === 5) as Reward;
        if (!rankedReward) continue;

        const crewReward = crew.find(f => f.symbol === rankedReward.symbol)!;
        let filtered = lb.leaderboard.filter(f => f.rank <= 1500);
        if (!filtered.length) continue;
        filtered.sort((a, b) => b.score - a.score);
        let avg = filtered.map(e => e.score).reduce((p, n) => p + n, 0) / lb.leaderboard.length;
        let min = filtered.map(e => e.score).reduce((p, n) => p < n && p !== 0 ? p : n, 0);
        let max = filtered.map(e => e.score).reduce((p, n) => p > n && p !== 0 ? p : n, 0);
        let median = filtered[filtered.length / 2].score;
        let contentType = eventData.content_types?.join("/") || eventData.content?.content_type;
        if (!contentType) {
            if (Array.isArray(eventData.content)) {
                let adata = (eventData as any).content.map(c => c.content_type).join("/");
                if (adata) {
                    contentType = adata;
                }
            }
        }
        stats.push({
            instance_id: event.instance_id,
            event_name: event.event_name,
            avg,
            min,
            max,
            median,
            crew: crewReward.name,
            event_type: contentType,
            discovered: eventData.discovered ? new Date(eventData.discovered) : undefined
        });
    }

    let allTypes = stats.map(m => m.event_type).sort();
    allTypes = allTypes.filter((at, idx) => allTypes.findIndex(f => f === at) === idx);

    const typeBuckets =  {} as { [key: string]: EventStats[] };

    allTypes.forEach((type) => {
        typeBuckets[type] = stats.filter(f => f.event_type === type);
        typeBuckets[type].sort((a, b) => {
            return b.min - a.min;
        })
    });

    return [stats, typeBuckets];
}

