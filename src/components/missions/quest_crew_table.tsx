import React from 'react';
import { IQuestCrew, QuestSolverResult } from "../../model/worker"
import { Table } from 'semantic-ui-react';
import { Skill } from '../../model/crew';
import { appelate, arrayIntersect } from '../../utils/misc';
import CrewStat from '../crewstat';
import { IRosterCrew } from '../crewtables/model';
import { CrewItemsView } from '../item_presenters/crew_items';
import PowerExplanation, { GradeSwatch } from '../powerexplanation';
import { CrewConfigTable } from '../crewtables/crewconfigtable';
import { Quest, QuestFilterConfig } from '../../model/missions';

export interface QuestCrewTableProps {
    solverResults?: QuestSolverResult;
    config: QuestFilterConfig;
    pageId: string;
    quest?: Quest;
}

export const QuestCrewTable = (props: QuestCrewTableProps) => {

    const { quest, config, solverResults, pageId } = props;
    const { mastery, includeCurrentQp, showAllSkills } = config;

    const crewTableCells = [
        { width: 2, column: 'score', title: 'Rank' },
        { width: 2, column: 'added_kwipment_key', title: 'Suggested Quipment' },
        { width: 2, column: 'metasort', title: <>Computed Skills <PowerExplanation /></> },
        { width: 2, column: 'challenge_key', title: 'Challenges' }
    ]

    const renderTableCells = (row: IRosterCrew): JSX.Element => {
        let crew = row as IQuestCrew;
        return (
            <React.Fragment>
                <Table.Cell>
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
                        {row.score}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "center", minWidth: "192px" }}>
                        <CrewItemsView
                            targetGroup={'continuum_items_1'}
                            printNA={includeCurrentQp ? <span style={{ color: 'cyan' }}>New</span> : <br />}
                            crew={{ ...crew, kwipment: crew.added_kwipment ?? [], kwipment_expiration: crew.added_kwipment_expiration ?? [] }}
                            quipment={true} />
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start" }}>
                        {crew.challenges?.map((challenge, idx) => {

                            const grade = ((!!challenge.max_solve && !!challenge.power_decrease)) ? 'D' : (challenge.max_solve ? 'B' : (!!challenge.power_decrease ? 'C' : 'A'));

                            return (
                                <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
                                    <GradeSwatch grade={grade} style={{ marginRight: "1em" }} />
                                    {Object.values(challenge.skills).map(((skill: Skill) => {
                                        const key = skill.skill ?? '';
                                        if (!showAllSkills && key !== challenge.challenge.skill) return <></>
                                        return (
                                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}>
                                                <CrewStat
                                                    style={{
                                                        color: ((!!challenge.max_solve && !!challenge.power_decrease)) ? 'orange' : (challenge.max_solve ? 'aqua' : (!!challenge.power_decrease ? 'yellow' : 'lightgreen'))
                                                    }}
                                                    quipmentMode={true}
                                                    key={"continuum_crew_" + key}
                                                    skill_name={key}
                                                    data={skill}
                                                    scale={0.75}
                                                />
                                                {challenge.challenge.skill === skill.skill && !!challenge.trait_bonuses?.length &&
                                                    <div style={{ color: 'lightgreen', textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', fontSize: "0.75em" }}>
                                                        +&nbsp;{challenge.trait_bonuses?.map(ct => ct.bonuses[mastery]).reduce((p, n) => p + n, 0)}&nbsp;({challenge.trait_bonuses?.map(ct => <>{appelate(ct.trait)}</>).reduce((p, n) => p ? <>{p}, {n}</> : n)})
                                                    </div>}

                                            </div>
                                        )

                                    })).reduce((p, n) => p ? <>{p}{n}</> : n, <></>)}
                                </div>
                            )
                        }).reduce((p, n, idx) => idx ? <div>{p}<br />{n}</div> : n, <></>)}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
                        {crew.challenges?.map((ch) => {
                            let challenge = quest?.challenges?.find(f => f.id === ch.challenge.id);
                            let ctraits = arrayIntersect(challenge?.trait_bonuses?.map(t => t.trait) ?? [], crew.traits.concat(crew.traits_hidden));

                            if (!challenge) {
                                return <></>
                            }

                            return (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateAreas: `'image text' 'image traits'`,
                                    gridTemplateColumns: '32px auto'
                                }}>
                                    <div style={{ gridArea: 'image', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                        <img style={{ height: '16px' }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />
                                    </div>
                                    <div style={{ gridArea: 'text' }}>
                                        <b>{challenge.name}</b>
                                    </div>
                                    <div style={{ gridArea: 'traits' }}>
                                        {ctraits?.length ?
                                            <i style={{ color: "lightgreen", fontWeight: "bold" }}>
                                                ({ctraits.map(t => appelate(t)).join(", ")})
                                            </i>
                                            : <></>}
                                    </div>
                                </div>
                            )
                        }).reduce((p, n) => p ? <div>{p}<br />{n}</div> : n, <></>)}
                    </div>
                </Table.Cell>
            </React.Fragment>)
    }

    return (<React.Fragment>
        <CrewConfigTable
            initOptions={{
                column: 'score',
                direction: 'ascending'
            }}
            tableConfig={crewTableCells}
            renderTableCells={renderTableCells}
            rosterCrew={solverResults?.crew ?? []}
            pageId={pageId}
            rosterType={'profileCrew'}
            crewFilters={[]}
        />
    </React.Fragment>)

}