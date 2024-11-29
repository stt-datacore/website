import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { skillSum } from "../utils/crewutils";
import { Dropdown, DropdownItemProps } from "semantic-ui-react";
import CONFIG from "../components/CONFIG";
import { AvatarView } from "../components/item_presenters/avatarview";


interface SkoBucket {
    symbol: string,
    aggregates: number[],
    release_date: number,
    skills: string[]
}

interface PassDiff {
    symbols: string[],
    day_diff: number,
    skill_diffs: number[],
    skills: string[]
};

const PowerCreep = () => {

    const globalContext = React.useContext(GlobalContext);

    const { crew } = globalContext.core;
    const { playerData } = globalContext.player;

    const [skoBuckets, setSkoBuckets] = React.useState({} as {[key:string]: SkoBucket[]});
    const [skillKey, setSkillKey] = React.useState("");
    const [passDiffs, setPassDiffs] = React.useState([] as PassDiff[]);
    const [velocities, setVelocities] = React.useState([] as number[]);
    const [velocity, setVelocity] = React.useState(0);
    const [daysBetween, setDaysBetween] = React.useState(0);
    const initDate = new Date("2016-01-01T00:00:00Z");
    const nowTime = new Date();
    const nowLen = Math.floor((nowTime.getTime() - initDate.getTime()) / (1000 * 60 * 60 * 24));
    React.useEffect(() => {
        const skoBuckets = {} as {[key:string]: SkoBucket[]};
        for (let c of crew) {

            if (c.max_rarity !== 5) continue;

            let sko = c.skill_order.join(",");
            skoBuckets[sko] ??= [];
            skoBuckets[sko].push({
                symbol: c.symbol,
                aggregates: Object.values(c.base_skills).map(skill => skillSum(skill)),
                release_date: Math.floor(((new Date(c.date_added)).getTime() - initDate.getTime()) / (1000 * 60 * 60 * 24)),
                skills: c.skill_order ?? []
            });
        }
        setSkoBuckets(skoBuckets);
    }, [crew]);

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        skillOpts.push({
            key: key,
            value: key,
            text: key.split(",").map(k => CONFIG.SKILLS[k]).join(" / ")
        });
    });
    skillOpts.sort((a, b) => (a.text! as string).localeCompare(b.text! as string))
    React.useEffect(() => {
        if (skillKey) {
            let work = skoBuckets[skillKey];
            if (work) {
                work.sort((a, b) => a.release_date - b.release_date);
                let days = work[work.length - 1].release_date - work[0].release_date;
                let diff = [] as PassDiff[];
                let c = work.length;
                let s = work[0].skills.length;
                for (let i = 1; i < c; i++) {
                    let dd = work[i].release_date - work[i - 1].release_date;
                    let sd = [] as number[];
                    for (let j = 0; j < s; j++) {
                        sd.push(work[i].aggregates[j] - work[i - 1].aggregates[j]);
                    }
                    diff.push({
                        symbols: [work[i].symbol, work[i - 1].symbol],
                        day_diff: dd,
                        skill_diffs: sd,
                        skills: work[0].skills
                    });
                }
                diff.reverse();
                setPassDiffs(diff);
            }
        }
    }, [skillKey]);

    React.useEffect(() => {
        if (passDiffs?.length) {
            const velocities = passDiffs.map(diff => diff.day_diff / (diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length));
            const db = passDiffs.map(diff => diff.day_diff).reduce((p, n) => p + n, 0) / velocities.length;
            const averageVelocity = velocities.reduce((p, n) => p + n, 0) / velocities.length;
            setVelocities(velocities);
            setVelocity(averageVelocity);
            setDaysBetween(db);
        }
        else {
            setVelocities([]);
            setVelocity(0);
        }
    }, [passDiffs]);


    return <DataPageLayout pageTitle="powerCreep">
        <div>
            <Dropdown
                selection
                clearable
                value={skillKey}
                options={skillOpts}
                onChange={(e, { value }) => setSkillKey(value as string)}
                />

            <h3>Average Velocity: {velocity?.toFixed(2)}</h3>
            <h3>Average Time Between Releases: {daysBetween?.toFixed(2)}</h3>
            <h3>Last Release: {crew.find(f => f.symbol === passDiffs[0]?.symbols[0])?.date_added?.toDateString()}</h3>

            {passDiffs.map((diff, idx)=> {
                const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
                const velocity = velocities[idx];
                return <div key={`passIdf_${idx}`}>
                    <p>
                        <AvatarView mode='crew' symbol={diff.symbols[0]} size={64} />
                        {crews[0].name}
                    </p>
                    <p>
                        <AvatarView mode='crew' symbol={diff.symbols[1]} size={64} />
                        {crews[1].name}
                    </p>
                    <p>
                        Day Difference: {diff.day_diff}
                    </p>
                    <p>
                        Aggregate Differences: {diff.skill_diffs.map(n => n.toLocaleString()).join(", ")}
                    </p>
                    <p>
                        Velocity: {((Number(velocity?.toFixed(2))).toLocaleString())}
                    </p>
                    </div>
            })}
        </div>
    </DataPageLayout>
}

export default PowerCreep;