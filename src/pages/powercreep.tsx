import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { skillSum } from "../utils/crewutils";
import { Dropdown, DropdownItemProps, Table } from "semantic-ui-react";
import CONFIG from "../components/CONFIG";
import { AvatarView } from "../components/item_presenters/avatarview";
import { CrewMember } from "../model/crew";
import { ITableConfigRow, SearchableTable } from "../components/searchabletable";


interface SkoBucket {
    symbol: string,
    aggregates: number[],
    epoch_day: number,
    skills: string[]
}

interface PassDiff {
    symbols: string[],
    epoch_days: number[],
    day_diff: number,
    skill_diffs: number[],
    skills: string[],
    velocity: number,
    aggregates: number[][]
};

const PowerCreep = () => {
    const globalContext = React.useContext(GlobalContext);
    const { crew } = globalContext.core;

    const [skoBuckets, setSkoBuckets] = React.useState({} as {[key:string]: SkoBucket[]});
    const [flatOrder, setFlatOrder] = React.useState([] as SkoBucket[]);
    const [skillKey, setSkillKey] = React.useState("");
    const [passDiffs, setPassDiffs] = React.useState([] as PassDiff[]);
    const [velocity, setVelocity] = React.useState(0);
    const [daysBetween, setDaysBetween] = React.useState(0);

    const gameEpoch = new Date("2016-01-01T00:00:00Z");

    React.useEffect(() => {
        const skoBuckets = {} as {[key:string]: SkoBucket[]};
        const flat = [] as SkoBucket[];
        for (let c of crew) {

            const aggregates = Object.values(c.base_skills).map(skill => skillSum(skill, 'all', false));
            const epoch_day = Math.floor(((new Date(c.date_added)).getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

            if (c.max_rarity !== 5) continue;
            [1, 2, 3].forEach((n) => {
                if (c.skill_order.length >= n) {
                    let skd = c.skill_order.slice(0, n);
                    let sko = skd.join(",");
                    skoBuckets[sko] ??= [];
                    skoBuckets[sko].push({
                        symbol: c.symbol,
                        aggregates,
                        epoch_day,
                        skills: skd
                    });
                }
            });

            flat.push({
                symbol: c.symbol,
                aggregates,
                epoch_day,
                skills: c.skill_order
            });
        }
        setSkoBuckets(skoBuckets);
        flat.sort((a, b) => a.epoch_day - b.epoch_day);
        setFlatOrder(flat);
    }, [crew]);

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        let sp = key.split(",").map(k => CONFIG.SKILLS[k]);
        while (sp.length < 3) sp.push('*')
        skillOpts.push({
            key: key,
            value: key,
            text: sp.join(" / ")
        });
    });

    skillOpts.sort((a, b) => (a.text! as string).localeCompare(b.text! as string))

    React.useEffect(() => {
        let work: SkoBucket[] = [];
        if (skillKey && skoBuckets && Object.keys(skoBuckets).length) {
            work = skoBuckets[skillKey];
        }
        else if (flatOrder?.length) {
            work = flatOrder;
        }
        else {
            return;
        }

        if (work?.length) {
            work.sort((a, b) => a.epoch_day - b.epoch_day);
            let newdiffs = [] as PassDiff[];
            let c = work.length;
            let s = work[0].skills.length;
            for (let i = 1; i < c; i++) {
                let dd = work[i].epoch_day - work[i - 1].epoch_day;
                let sd = [] as number[];
                for (let j = 0; j < s; j++) {
                    sd.push(work[i].aggregates[j] - work[i - 1].aggregates[j]);
                }
                let diff: PassDiff = {
                    symbols: [work[i].symbol, work[i - 1].symbol],
                    day_diff: dd,
                    epoch_days: [work[i].epoch_day, work[i - 1].epoch_day],
                    skill_diffs: sd,
                    skills: work[0].skills,
                    velocity: 0,
                    aggregates: [work[i].aggregates, work[i - 1].aggregates]
                };
                let avgdiff = diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length;
                if (avgdiff && diff.day_diff) diff.velocity = avgdiff / diff.day_diff;
                newdiffs.push(diff);
            }
            newdiffs.reverse();
            setPassDiffs(newdiffs);
        }
    }, [skillKey, skoBuckets, flatOrder]);

    React.useEffect(() => {
        if (passDiffs?.length) {
            const velocities = passDiffs.map(diff => diff.velocity);
            const db = passDiffs.map(diff => diff.day_diff).reduce((p, n) => p + n, 0) / velocities.length;
            const averageVelocity = velocities.reduce((p, n) => p + n, 0) / velocities.length;
            setVelocity(averageVelocity);
            setDaysBetween(db);
        }
        else {
            setVelocity(0);
        }
    }, [passDiffs]);

    return <DataPageLayout pageTitle="Power Creep Analysis">
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
            <PowerCreepTable passDiffs={passDiffs} />
        </div>
    </DataPageLayout>
}

interface PowerCreepTableProps {
    passDiffs: PassDiff[];

}

const PowerCreepTable = (props: PowerCreepTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { passDiffs } = props;

    const gameEpoch = new Date("2016-01-01T00:00:00Z");
    const nowDate = new Date();
    const daysFromEpoch = Math.floor((nowDate.getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const skillIcon = (skill: string) => {
        return `${process.env.GATSBY_ASSETS_URL}/atlas/icon_${skill}.png`;
    }
    const sortAg = (a: PassDiff, b: PassDiff, idx: number) => a.aggregates[idx].reduce((p, n) => p + n, 0) - b.aggregates[idx].reduce((p, n) => p + n, 0);
    const tableConfig = [
        { width: 1, column: 'symbol[0]', title: 'Recent Crew', customCompare: (a, b) => sortAg(a, b, 0) },
        { width: 1, column: 'symbol[1]', title: 'Prior Crew', customCompare: (a, b) => sortAg(a, b, 1) },
        {
            width: 1,
            column: 'epoch_day',
            title: 'Epoch Day',
            customCompare: (a: PassDiff, b: PassDiff) => {
                let r = a.epoch_days[0] - b.epoch_days[0];
                if (!r) r = a.epoch_days[1] - b.epoch_days[1];
                return r;
            }
        },
        { width: 1, column: 'day_diff', title: 'Days Between Release' },
        { width: 1, column: 'velocity', title: 'Velocity' },
        {
            width: 1,
            column: 'skill_diffs',
            title: 'Aggregate Differences',
            customCompare: (a: PassDiff, b: PassDiff) => {
                return a.skill_diffs.reduce((p, n) => p + n, 0) - b.skill_diffs.reduce((p, n) => p + n, 0)
            }
        },
    ] as ITableConfigRow[]

    return (<SearchableTable
                config={tableConfig}
                data={passDiffs}
                renderTableRow={(row, idx) => renderTableRow(row, idx!)}
                filterRow={filterRow}
                />)

    function filterRow(row: any, filter: any, filterType?: string) {
        return true;
    }

    function renderTableRow(diff: PassDiff, idx: number) {
        const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
        return <Table.Row key={`passIdf_${idx}`}>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView mode='crew' symbol={diff.symbols[0]} size={64} />
                    {crews[0].name}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[0].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>(Released {(daysFromEpoch - diff.epoch_days[0]).toLocaleString()} days ago)</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView mode='crew' symbol={diff.symbols[1]} size={64} />
                    {crews[1].name}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[1].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>(Released {(daysFromEpoch - diff.epoch_days[1]).toLocaleString()} days ago)</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell>
                {diff.epoch_days[0].toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {diff.day_diff}
            </Table.Cell>
            <Table.Cell>
                {diff.velocity}
            </Table.Cell>
            <Table.Cell>
            <div style={flexRow}>
                {diff.skill_diffs.map((n, idx) => {
                    return <div style={flexCol}>
                        <img src={`${skillIcon(diff.skills[idx])}`} style={{height: '1em'}} />
                        <span>{CONFIG.SKILLS_SHORT.find(sk => sk.name === diff.skills[idx])?.short}</span>
                        <span>{n}</span>
                    </div>
                })}
            </div>
            </Table.Cell>
        </Table.Row>

    }

}


export default PowerCreep;