import React from "react"
import { GlobalContext } from "../context/globalcontext"
import { getSkillOrderStats, SkillRarityReport } from "../utils/crewutils";
import { ITableConfigRow, SearchableTable } from "./searchabletable";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "./stats/utils";
import { CrewMember } from "../model/crew";
import { Table } from "semantic-ui-react";
import CONFIG from "./CONFIG";
import { skillSum } from "../utils/crewutils";




export const GapTable = () => {
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;
    const crew = globalContext.core.crew.filter(f => f.in_portal);

    const [statDiffs, setStatDiffs] = React.useState<SkillRarityReport<CrewMember>[]>([]);

    React.useEffect(() => {
        if (!playerData) return;

        const playerCrew = playerData.player.character.crew.filter(f => f.in_portal);
        const statsGlobal = getSkillOrderStats({ roster: crew, returnCrew: true, computeAggregate: true });
        const statsPlayer = getSkillOrderStats({ roster: playerCrew.filter(f => (f as any).immortal), returnCrew: true, computeAggregate: true, max: crew.length });

        const globMissing = statsGlobal.filter(stat => !statsPlayer.some(sp => sp.skill == stat.skill && sp.position == stat.position));

        const results = [...globMissing.map(m => ({...m, data: true }) as SkillRarityReport<CrewMember>)];

        statsPlayer.forEach((stat) => {
            let statsglob = statsGlobal.find(f => f.position == stat.position && f.skill == stat.skill)!;
            let newdata = {
                skill: stat.skill,
                position: stat.position,
                count: statsglob.count - stat.count,
                score: Number((100 * (stat.score / statsglob.score)).toFixed(2)),
                crew: statsglob.crew?.filter(f => !playerCrew?.some(c => c.symbol == f.symbol)),
                aggregate: statsglob.aggregate! - stat.aggregate!,
                data: {
                    crew: stat.crew!.concat(playerCrew.filter(f => !f.immortal && f.skill_order.length > stat.position && f.skill_order[stat.position] == stat.skill)),
                    immortal: stat.crew!,
                    mortal: playerCrew.filter(f => !f.immortal && f.skill_order.length > stat.position && f.skill_order[stat.position] == stat.skill),
                    max: 0
                }
            };

            newdata.data.max = newdata.data.mortal!.map(m => skillSum(Object.values(m.base_skills))).reduce((p, n) => p + n)
                + newdata.crew!.map(m => skillSum(Object.values(m.base_skills))).reduce((p, n) => p + n);

            results.push(newdata);
        });
        setStatDiffs(results);
    }, [playerData]);

    if (!playerData) return <></>;
    const postrans = [
        'quipment_ranks.primary',
        'quipment_ranks.secondary',
        'quipment_ranks.tertiary'
    ]
    const tableConfig = [
        { width: 1, column: 'position', title: t('quipment_dropdowns.mode.skill_order') },
        { width: 1, column: 'skill', title: t('base.skills') },
        { width: 1, column: 'score', title: t('event_info.score'), reverse: true },
        { width: 1, column: 'data.max', title: t('stat_trends.total_power_difference'), reverse: true },
        { width: 1, column: 'aggregate', title: t('global.max'), reverse: true },
        { width: 1, column: 'data.crew.length', title: t('crew_state.owned'), reverse: true },
        { width: 1, column: 'crew.length', title: t('crew_state.unowned'), reverse: true },
        { width: 1, column: 'data.immortal.length', title: t('roster_summary.rarity.columns.progress'), reverse: true },
        { width: 1, column: 'data.mortal.length', title: t('roster_summary.rarity.columns.mortal'), reverse: true },
    ] as ITableConfigRow[];

    return (
        <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>

            <div style={{...flexRow, gap: '1em'}}>
                <div style={{...flexCol, alignItems: 'flex-start', gap: '1em'}}>
                </div>
            </div>

            <SearchableTable
                id='gaps'
                data={statDiffs}
                config={tableConfig}
                renderTableRow={(row, idx) => renderTableRow(row, idx)}
                filterRow={() => true}
                />

        </div>
    )

    function renderTableRow(row: SkillRarityReport<CrewMember>, idx) {

        return <Table.Row key={`${row.score}_${row.skill}_${row.position}`}>
            <Table.Cell>
                {t(postrans[row.position])}
            </Table.Cell>
            <Table.Cell>
                {CONFIG.SKILLS[row.skill]}
            </Table.Cell>
            <Table.Cell>
                {row.score}
            </Table.Cell>
            <Table.Cell>
                {row.data.max}
            </Table.Cell>
            <Table.Cell>
                {row.aggregate}
            </Table.Cell>
            <Table.Cell>
                {row.data.crew.length.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {row.crew?.length.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {row.data.immortal.length.toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {row.data.mortal.length.toLocaleString()}
            </Table.Cell>
        </Table.Row>

    }

}