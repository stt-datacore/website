
import * as fs from 'fs';
import { EventInstance, EventLeaderboard } from '../src/model/events';
import { GameEvent } from '../src/model/player';
import { CrewMember } from '../src/model/crew';
import { getEventStats } from '../src/utils/event_stats';

const STATIC_PATH = `${__dirname}/../../static/structured/`;

async function compileEventStats() {
    const evPath = `${STATIC_PATH}event_instances.json`;
    const lbPath = `${STATIC_PATH}event_leaderboards.json`;
    const crewPath = `${STATIC_PATH}crew.json`;
    const crew = JSON.parse(fs.readFileSync(crewPath, 'utf-8')) as CrewMember[];
    const leaderboards = JSON.parse(fs.readFileSync(lbPath, 'utf-8')) as EventLeaderboard[];
    const events = JSON.parse(fs.readFileSync(evPath, 'utf-8')) as EventInstance[];

    console.log("Reading event data...");

    const [stats, typeBuckets] = await getEventStats(crew, leaderboards, events, async (instanceId) => {
        return new Promise((resolve, reject) => {
            const dataPath = `${STATIC_PATH}events/${instanceId}.json`;
            if (!fs.existsSync(dataPath)) resolve(undefined);
            else resolve(JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as GameEvent);
        });
    });

    Object.entries(typeBuckets).forEach(([type, tstat]) => {
        console.log("");
        console.log(`${type} : Top 5 Most Competitive By Minimum Score`);
        console.log("-----------");
        tstat.slice(0, 5).forEach((stat) => {
            console.log(`[${stat.instance_id}]: ${stat.event_name}${stat.discovered ? ` (${stat.discovered.toDateString()})` : ''}`);
            console.log(`    Reward:       ${stat.crew}`);
            console.log(`    Avg:          ${Math.floor(stat.avg).toLocaleString()} VP`);
            console.log(`    Max:          ${stat.max.toLocaleString()} VP`);
            console.log(`    Min:          ${stat.min.toLocaleString()} VP`);
            console.log(`    Median:       ${stat.median.toLocaleString()} VP`);
        });
    });

}

async function main() {
    compileEventStats();
}

(async () => {
    main();
})();